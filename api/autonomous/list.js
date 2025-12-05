// Autonomous Task List - Get all tasks

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    try {
        const { userId } = req.method === 'GET' ? req.query : req.body;

        if (!global.autonomousTasks) {
            global.autonomousTasks = new Map();
        }

        // Get all tasks (optionally filtered by userId)
        const tasks = [];
        global.autonomousTasks.forEach((task, id) => {
            if (!userId || task.userId === userId) {
                // Calculate total steps
                let totalSteps = 0;
                task.plan.phases.forEach(phase => {
                    totalSteps += phase.steps.length;
                });

                tasks.push({
                    id: task.id,
                    title: task.plan.taskTitle,
                    status: task.status,
                    progress: task.progress,
                    currentStep: task.currentStep + 1,
                    totalSteps: totalSteps,
                    outputs: task.plan.outputs,
                    unreadNotifications: task.notifications.filter(n => !n.read).length,
                    createdAt: task.createdAt,
                    updatedAt: task.updatedAt,
                    completedAt: task.completedAt
                });
            }
        });

        // Sort by creation date (newest first)
        tasks.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        res.status(200).json({
            success: true,
            tasks: tasks,
            count: tasks.length
        });

    } catch (error) {
        console.error('[Autonomous List] Error:', error.message);
        res.status(500).json({ success: false, error: error.message });
    }
}
