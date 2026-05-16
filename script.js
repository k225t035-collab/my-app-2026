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

    let tasks = JSON.parse(localStorage.getItem('tasks')) || [];
    let stats = JSON.parse(localStorage.getItem('userStats')) || {
        level: 1,
        xp: 0,
        gold: 0
    };
    let currentFilter = 'all';

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
                    <input type="checkbox" ${task.completed ? 'checked' : ''} data-id="${task.id}">
                    <span class="task-text">${escapeHtml(task.text)}</span>
                </div>
                <button class="delete-btn" data-id="${task.id}">&times;</button>
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
        
        // Visual feedback
        document.querySelector('.app-container').classList.add('shake');
        setTimeout(() => document.querySelector('.app-container').classList.remove('shake'), 500);
    };

    const toggleTask = (id) => {
        const taskIndex = tasks.findIndex(t => t.id === id);
        if (taskIndex === -1) return;

        const task = tasks[taskIndex];
        const wasCompleted = task.completed;
        task.completed = !wasCompleted;

        // Reward only when checking as complete
        if (!wasCompleted && task.completed) {
            awardRewards(task.priority);
        }

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
        levelUpModal.classList.remove('hidden');
    };

    const deleteTask = (id) => {
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
