// Autonomous Task Cancel - Cancel a running task

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method !== 'POST') {
        res.status(405).json({ success: false, error: 'Method not allowed' });
        return;
    }

    try {
        const { taskId } = req.body || {};

        if (!taskId) {
            res.status(400).json({ success: false, error: 'Missing taskId' });
            return;
        }

        if (!global.autonomousTasks) {
            res.status(404).json({ success: false, error: 'No tasks found' });
            return;
        }

        const task = global.autonomousTasks.get(taskId);
        if (!task) {
            res.status(404).json({ success: false, error: 'Task not found' });
            return;
        }

        // Cancel the task
        task.status = 'cancelled';
        task.updatedAt = new Date().toISOString();
        task.notifications.push({
            id: Date.now(),
            type: 'warning',
            message: task.language === 'ar' ? '⛔ تم إلغاء المهمة' : '⛔ Task cancelled',
            timestamp: new Date().toISOString(),
            read: false
        });

        global.autonomousTasks.set(taskId, task);

        res.status(200).json({
            success: true,
            message: 'Task cancelled',
            taskId: taskId
        });

    } catch (error) {
        console.error('[Autonomous Cancel] Error:', error.message);
        res.status(500).json({ success: false, error: error.message });
    }
}
