const express = require('express');
const app = express();
const port = 3000;

let seededTasks = [];
try {
    const taskData = require('./task.json');
    if (taskData && Array.isArray(taskData.tasks)) {
        seededTasks = taskData.tasks;
    }
} catch (error) {
    seededTasks = [];
}

const ALLOWED_PRIORITIES = ['low', 'medium', 'high'];

function normalizePriority(priority) {
    if (typeof priority !== 'string') return undefined;
    return priority.trim().toLowerCase();
}

function isAllowedPriority(priority) {
    return ALLOWED_PRIORITIES.includes(priority);
}

function parseCompletedQuery(value) {
    if (value === undefined) return { ok: true, value: undefined };
    if (value === 'true') return { ok: true, value: true };
    if (value === 'false') return { ok: true, value: false };
    return { ok: false };
}

const tasks = seededTasks.map((task, index) => ({
    ...task,
    priority: 'medium',
    createdAt: new Date(Date.now() - (seededTasks.length - index) * 1000).toISOString(),
}));

let nextTaskId = tasks.length ? Math.max(...tasks.map((task) => task.id)) + 1 : 1;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

function validateTaskPayload(payload) {
    if (!payload || typeof payload !== 'object') {
        return false;
    }
    const hasTitle = typeof payload.title === 'string' && payload.title.trim().length > 0;
    const hasDescription = typeof payload.description === 'string' && payload.description.trim().length > 0;
    const hasCompleted = typeof payload.completed === 'boolean';

    const normalizedPriority = normalizePriority(payload.priority);
    const hasValidPriority = payload.priority === undefined || (normalizedPriority && isAllowedPriority(normalizedPriority));

    return hasTitle && hasDescription && hasCompleted && hasValidPriority;
}

app.get('/tasks', (req, res) => {
    const completedParseResult = parseCompletedQuery(req.query.completed);
    if (!completedParseResult.ok) {
        return res.status(400).send('Invalid completed filter');
    }

    const completed = completedParseResult.value;

    const result = tasks
        .filter((task) => (completed === undefined ? true : task.completed === completed))
        .sort((a, b) => {
            const aTime = Date.parse(a.createdAt);
            const bTime = Date.parse(b.createdAt);
            return bTime - aTime;
        });

    res.status(200).send(result);
});

app.get('/tasks/priority/:level', (req, res) => {
    const level = normalizePriority(req.params.level);
    if (!level || !isAllowedPriority(level)) {
        return res.status(400).send('Invalid priority level');
    }

    res.status(200).send(tasks.filter((task) => task.priority === level));
});

app.get('/tasks/:id', (req, res) => {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
        return res.status(400).send('Invalid task id');
    }
    const task = tasks.find((currentTask) => currentTask.id === id);

    if (!task) {
        return res.status(404).send('Task not found');
    }

    res.status(200).send(task);
});

app.post('/tasks', (req, res) => {
    if (!validateTaskPayload(req.body)) {
        return res.status(400).send('Invalid task data');
    }

    const priority = normalizePriority(req.body.priority) || 'low';

    const nextTask = {
        id: nextTaskId,
        title: req.body.title,
        description: req.body.description,
        completed: req.body.completed,
        priority,
        createdAt: new Date().toISOString(),
    };

    tasks.push(nextTask);
    nextTaskId += 1;
    res.status(201).send(nextTask);
});

app.put('/tasks/:id', (req, res) => {
    if (!validateTaskPayload(req.body)) {
        return res.status(400).send('Invalid task data');
    }

    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
        return res.status(400).send('Invalid task id');
    }
    const taskIndex = tasks.findIndex((currentTask) => currentTask.id === id);

    if (taskIndex === -1) {
        return res.status(404).send('Task not found');
    }

    const existingTask = tasks[taskIndex];
    const priority = normalizePriority(req.body.priority) || existingTask.priority || 'low';

    tasks[taskIndex] = {
        id,
        title: req.body.title,
        description: req.body.description,
        completed: req.body.completed,
        priority,
        createdAt: existingTask.createdAt,
    };

    res.status(200).send(tasks[taskIndex]);
});

app.delete('/tasks/:id', (req, res) => {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
        return res.status(400).send('Invalid task id');
    }
    const taskIndex = tasks.findIndex((currentTask) => currentTask.id === id);

    if (taskIndex === -1) {
        return res.status(404).send('Task not found');
    }

    tasks.splice(taskIndex, 1);
    res.sendStatus(200);
});

if (require.main === module) {
    app.listen(port, (err) => {
        if (err) {
            return console.log('Something bad happened', err);
        }
        console.log(`Server is listening on ${port}`);
    });
}



module.exports = app;