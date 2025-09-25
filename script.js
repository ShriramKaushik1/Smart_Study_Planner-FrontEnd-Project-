// Task Management
class StudyPlanner {
    constructor() {
        this.tasks = JSON.parse(localStorage.getItem('studyTasks')) || [];
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.renderTasks();
        this.renderCalendar();
        this.updateProgress();
    }

    setupEventListeners() {
        // Form submission
        document.getElementById('task-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.addTask();
        });

        // Task filter
        document.getElementById('task-filter').addEventListener('change', (e) => {
            this.renderTasks(e.target.value);
        });
    }

    addTask() {
        const title = document.getElementById('task-title').value;
        const subject = document.getElementById('task-subject').value;
        const deadline = document.getElementById('task-deadline').value;
        const priority = document.getElementById('task-priority').value;
        const notes = document.getElementById('task-notes').value;

        // Validate the deadline is not in the past
        const today = new Date().toISOString().split('T')[0];
        if (deadline < today) {
            this.showNotification('Deadline cannot be in the past!', true);
            return;
        }

        const task = {
            id: Date.now(),
            title,
            subject,
            deadline,
            priority,
            notes,
            completed: false,
            createdAt: new Date().toISOString()
        };

        this.tasks.push(task);
        this.saveTasks();
        this.renderTasks();
        this.renderCalendar();
        this.updateProgress();
        this.showNotification('Task added successfully!');
        
        // Reset form
        document.getElementById('task-form').reset();
    }

    deleteTask(id) {
        this.tasks = this.tasks.filter(task => task.id !== id);
        this.saveTasks();
        this.renderTasks();
        this.renderCalendar();
        this.updateProgress();
        this.showNotification('Task deleted successfully!');
    }

    toggleComplete(id) {
        this.tasks = this.tasks.map(task => {
            if (task.id === id) {
                return { ...task, completed: !task.completed };
            }
            return task;
        });
        this.saveTasks();
        this.renderTasks();
        this.updateProgress();
        const task = this.tasks.find(t => t.id === id);
        this.showNotification(`Task marked as ${task.completed ? 'completed' : 'pending'}!`);
    }

    saveTasks() {
        localStorage.setItem('studyTasks', JSON.stringify(this.tasks));
    }

    renderTasks(filter = 'all') {
        const taskList = document.getElementById('task-list');
        taskList.innerHTML = '';

        let filteredTasks = this.tasks;
        
        if (filter === 'pending') {
            filteredTasks = this.tasks.filter(task => !task.completed);
        } else if (filter === 'completed') {
            filteredTasks = this.tasks.filter(task => task.completed);
        } else if (filter === 'high') {
            filteredTasks = this.tasks.filter(task => task.priority === 'high');
        }

        if (filteredTasks.length === 0) {
            taskList.innerHTML = `
                <li class="empty-state">
                    <i class="fas fa-tasks"></i>
                    <p>No tasks found. ${filter !== 'all' ? 'Try changing your filter.' : 'Add your first study task!'}</p>
                </li>
            `;
            return;
        }

        // Sort tasks: incomplete first, then by priority, then by deadline
        filteredTasks.sort((a, b) => {
            if (a.completed !== b.completed) {
                return a.completed ? 1 : -1;
            }
            if (a.priority !== b.priority) {
                const priorityOrder = { high: 1, medium: 2, low: 3 };
                return priorityOrder[a.priority] - priorityOrder[b.priority];
            }
            return new Date(a.deadline) - new Date(b.deadline);
        });

        filteredTasks.forEach(task => {
            const taskItem = document.createElement('li');
            taskItem.className = `task-item ${task.completed ? 'completed' : ''}`;
            taskItem.style.borderLeftColor = task.completed ? 'var(--success)' : this.getPriorityColor(task.priority);
            
            const formattedDate = new Date(task.deadline).toLocaleDateString();
            const daysUntilDue = this.getDaysUntilDue(task.deadline);
            
            taskItem.innerHTML = `
                <div class="task-info">
                    <h3>${task.title}</h3>
                    <p>${task.notes || 'No additional notes'}</p>
                    <div class="task-meta">
                        <span class="task-tag subject">${this.formatSubject(task.subject)}</span>
                        <span class="task-tag ${task.priority}">${task.priority} priority</span>
                        <span class="task-tag deadline ${daysUntilDue < 3 && !task.completed ? 'high' : ''}">
                            Due: ${formattedDate} ${!task.completed ? `(${daysUntilDue} ${daysUntilDue === 1 ? 'day' : 'days'})` : ''}
                        </span>
                    </div>
                </div>
                <div class="task-actions">
                    <button class="btn-complete" onclick="studyPlanner.toggleComplete(${task.id})">
                        <i class="fas ${task.completed ? 'fa-undo' : 'fa-check'}"></i>
                    </button>
                    <button class="btn-delete" onclick="studyPlanner.deleteTask(${task.id})">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            `;
            taskList.appendChild(taskItem);
        });
    }

    renderCalendar() {
        const calendar = document.getElementById('calendar');
        calendar.innerHTML = '';
        
        const today = new Date();
        const currentDay = today.getDate();
        const currentMonth = today.getMonth();
        const currentYear = today.getFullYear();
        
        // Get first day of current week (Sunday)
        const firstDay = new Date(currentYear, currentMonth, currentDay - today.getDay());
        
        // Create calendar days for the week
        for (let i = 0; i < 7; i++) {
            const day = new Date(firstDay);
            day.setDate(firstDay.getDate() + i);
            
            const dayElement = document.createElement('div');
            dayElement.className = 'calendar-day';
            
            if (day.getDate() === currentDay && 
                day.getMonth() === currentMonth && 
                day.getFullYear() === currentYear) {
                dayElement.classList.add('current');
            }
            
            const dayTasks = this.getTasksForDate(day.toISOString().split('T')[0]);
            if (dayTasks.length > 0) {
                dayElement.classList.add('has-tasks');
            }
            
            const dayName = day.toLocaleDateString('en-US', { weekday: 'short' });
            const dayNumber = day.getDate();
            
            dayElement.innerHTML = `
                <div class="calendar-day-header">${dayName} ${dayNumber}</div>
                ${dayTasks.slice(0, 2).map(task => `
                    <div class="calendar-task" title="${task.title}">
                        ${task.title}
                    </div>
                `).join('')}
                ${dayTasks.length > 2 ? `<div class="calendar-task">+${dayTasks.length - 2} more</div>` : ''}
            `;
            
            calendar.appendChild(dayElement);
        }
    }

    getTasksForDate(date) {
        return this.tasks.filter(task => task.deadline === date && !task.completed);
    }

    getDaysUntilDue(deadline) {
        const today = new Date();
        const dueDate = new Date(deadline);
        const diffTime = dueDate - today;
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }

    updateProgress() {
        const totalTasks = this.tasks.length;
        const completedTasks = this.tasks.filter(task => task.completed).length;
        const pendingTasks = totalTasks - completedTasks;
        
        const progressPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
        
        document.getElementById('total-tasks').textContent = totalTasks;
        document.getElementById('completed-tasks').textContent = completedTasks;
        document.getElementById('pending-tasks').textContent = pendingTasks;
        document.getElementById('progress-percent').textContent = `${progressPercent}%`;
        
        document.querySelector('.progress-fill').style.width = `${progressPercent}%`;
    }

    getPriorityColor(priority) {
        const colors = {
            high: '#f72585',
            medium: '#f8961e',
            low: '#43aa8b'
        };
        return colors[priority] || '#4361ee';
    }

    formatSubject(subject) {
        const subjectMap = {
            math: 'Mathematics',
            science: 'Science',
            history: 'History',
            english: 'English',
            programming: 'Programming',
            other: 'Other'
        };
        return subjectMap[subject] || subject;
    }

    showNotification(message, isError = false) {
        const notification = document.getElementById('notification');
        notification.textContent = message;
        notification.className = `notification ${isError ? 'error' : ''} show`;
        
        setTimeout(() => {
            notification.className = 'notification';
        }, 3000);
    }
}

// Initialize the study planner
const studyPlanner = new StudyPlanner();

// Add some sample data if localStorage is empty
if (studyPlanner.tasks.length === 0) {
    const sampleTasks = [
        {
            id: 1,
            title: "Complete Math Homework",
            subject: "math",
            deadline: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            priority: "high",
            notes: "Chapter 5 exercises 1-20",
            completed: false,
            createdAt: new Date().toISOString()
        },
        {
            id: 2,
            title: "Read Science Chapter",
            subject: "science",
            deadline: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            priority: "medium",
            notes: "Physics chapter about motion",
            completed: true,
            createdAt: new Date().toISOString()
        },
        {
            id: 3,
            title: "History Essay",
            subject: "history",
            deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            priority: "high",
            notes: "1500 words about World War II",
            completed: false,
            createdAt: new Date().toISOString()
        }
    ];
    
    studyPlanner.tasks = sampleTasks;
    studyPlanner.saveTasks();
    studyPlanner.renderTasks();
    studyPlanner.renderCalendar();
    studyPlanner.updateProgress();
}

// Set minimum date to today for deadline input
document.getElementById('task-deadline').min = new Date().toISOString().split('T')[0];
