document.addEventListener('DOMContentLoaded', () => {
    const taskInput = document.getElementById('taskInput');
    const prioritySelect = document.getElementById('prioritySelect');
    const addTaskBtn = document.getElementById('addTaskBtn');
    const taskList = document.getElementById('taskList');
    const filterBtns = document.querySelectorAll('.filter-btn');

    // Stats Elements
    const userLevelEl = document.getElementById('userLevel');
    const userGoldEl = document.getElementById('userGold');
    const xpBar = document.getElementById('xpBar');
    const currentXPEl = document.getElementById('currentXP');
    const nextLevelXPEl = document.getElementById('nextLevelXP');
    const levelUpModal = document.getElementById('level-up-modal');
    const closeModalBtn = document.getElementById('closeModal');
    const bgm = document.getElementById('bgm');
    const musicToggle = document.getElementById('musicToggle');

    let tasks = JSON.parse(localStorage.getItem('tasks')) || [];
    let stats = JSON.parse(localStorage.getItem('userStats')) || {
        level: 1,
        xp: 0,
        gold: 0
    };
    let currentFilter = 'all';
    let isMuted = true;

    // --- Audio System (Web Audio API) ---
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

    const playSound = (freq, type, duration, vol = 0.1) => {
        if (isMuted) return;
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
        gain.gain.setValueAtTime(vol, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + duration);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + duration);
    };

    const sfx = {
        questAdd: () => {
            playSound(440, 'sawtooth', 0.1);
            setTimeout(() => playSound(880, 'sawtooth', 0.2), 50);
        },
        questComplete: () => {
            playSound(523.25, 'sine', 0.2); // C5
            setTimeout(() => playSound(659.25, 'sine', 0.2), 100); // E5
            setTimeout(() => playSound(783.99, 'sine', 0.4), 200); // G5
        },
        levelUp: () => {
            const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
            notes.forEach((f, i) => {
                setTimeout(() => playSound(f, 'square', 0.5, 0.05), i * 150);
            });
        },
        delete: () => {
            playSound(150, 'triangle', 0.2, 0.2);
        }
    };

    const toggleMusic = () => {
        isMuted = !isMuted;
        if (isMuted) {
            bgm.pause();
            musicToggle.innerHTML = '<svg class="icon"><use xlink:href="#icon-volume-off"></use></svg>';
        } else {
            if (audioCtx.state === 'suspended') audioCtx.resume();
            bgm.play().catch(e => console.log("BGM play blocked"));
            musicToggle.innerHTML = '<svg class="icon"><use xlink:href="#icon-volume-on"></use></svg>';
        }
    };

    musicToggle.addEventListener('click', toggleMusic);

    // --- Core Logic ---
    const saveAll = () => {
        localStorage.setItem('tasks', JSON.stringify(tasks));
        localStorage.setItem('userStats', JSON.stringify(stats));
    };

    const getXPForNextLevel = (level) => level * 100;

    const updateStatsUI = () => {
        userLevelEl.textContent = stats.level;
        userGoldEl.textContent = stats.gold;
        
        const nextXP = getXPForNextLevel(stats.level);
        const xpPercent = (stats.xp / nextXP) * 100;
        
        xpBar.style.width = `${xpPercent}%`;
        currentXPEl.textContent = stats.xp;
        nextLevelXPEl.textContent = nextXP;
    };

    const renderTasks = () => {
        taskList.innerHTML = '';
        
        const filteredTasks = tasks.filter(task => {
            if (currentFilter === 'active') return !task.completed;
            if (currentFilter === 'completed') return task.completed;
            return true;
        });

        filteredTasks.forEach(task => {
            const li = document.createElement('li');
            li.className = `task-item priority-${task.priority} ${task.completed ? 'completed' : ''}`;
            
            li.innerHTML = `
                <div class="task-info">
                    <input type="checkbox" ${task.completed ? 'checked disabled' : ''} data-id="${task.id}">
                    <svg class="icon task-item-icon"><use xlink:href="#icon-scroll"></use></svg>
                    <span class="task-text">${escapeHtml(task.text)}</span>
                </div>
                <button class="delete-btn" data-id="${task.id}">
                    <svg class="icon"><use xlink:href="#icon-skull"></use></svg>
                </button>
            `;

            const checkbox = li.querySelector('input[type="checkbox"]');
            checkbox.addEventListener('change', () => toggleTask(task.id));

            const deleteBtn = li.querySelector('.delete-btn');
            deleteBtn.addEventListener('click', () => deleteTask(task.id));

            taskList.appendChild(li);
        });
    };

    const addTask = () => {
        const text = taskInput.value.trim();
        const priority = prioritySelect.value;

        if (text === '') return;

        const newTask = {
            id: Date.now(),
            text,
            priority,
            completed: false
        };

        tasks.push(newTask);
        saveAll();
        renderTasks();
        taskInput.value = '';
        
        // Visual & Audio feedback
        sfx.questAdd();
        const container = document.querySelector('.app-container');
        container.classList.add('shake');
        setTimeout(() => container.classList.remove('shake'), 500);
    };

    const toggleTask = (id) => {
        const taskIndex = tasks.findIndex(t => t.id === id);
        if (taskIndex === -1) return;

        const task = tasks[taskIndex];
        if (task.completed) return; // Once completed, it stays completed

        task.completed = true;
        sfx.questComplete();
        awardRewards(task.priority);

        saveAll();
        renderTasks();
    };

    const awardRewards = (priority) => {
        let xpGain = 10;
        let goldGain = 5;

        if (priority === 'medium') { xpGain = 20; goldGain = 15; }
        if (priority === 'high') { xpGain = 50; goldGain = 40; }

        stats.xp += xpGain;
        stats.gold += goldGain;

        checkLevelUp();
        updateStatsUI();
    };

    const checkLevelUp = () => {
        const nextXP = getXPForNextLevel(stats.level);
        if (stats.xp >= nextXP) {
            stats.xp -= nextXP;
            stats.level++;
            showLevelUp();
        }
    };

    const showLevelUp = () => {
        sfx.levelUp();
        levelUpModal.classList.remove('hidden');
    };

    const deleteTask = (id) => {
        sfx.delete();
        tasks = tasks.filter(task => task.id !== id);
        saveAll();
        renderTasks();
    };

    const escapeHtml = (unsafe) => {
        return unsafe
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    };

    addTaskBtn.addEventListener('click', addTask);
    taskInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') addTask();
    });

    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            filterBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentFilter = btn.getAttribute('data-filter');
            renderTasks();
        });
    });

    closeModalBtn.addEventListener('click', () => {
        levelUpModal.classList.add('hidden');
    });

    updateStatsUI();
    renderTasks();
});
