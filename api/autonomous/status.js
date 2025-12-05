// Autonomous Task Status - Get task progress and details

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    try {
        const { taskId } = req.method === 'GET' ? req.query : req.body;

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

        // Calculate steps info
        let totalSteps = 0;
        task.plan.phases.forEach(phase => {
            totalSteps += phase.steps.length;
        });

        // Get current phase name
        const currentPhaseName = task.plan.phases[task.currentPhase]?.name || '';

        res.status(200).json({
            success: true,
            task: {
                id: task.id,
                title: task.plan.taskTitle,
                prompt: task.prompt,
                language: task.language,
                status: task.status,
                progress: task.progress,
                currentStep: task.currentStep + 1,
                totalSteps: totalSteps,
                currentPhase: task.currentPhase + 1,
                totalPhases: task.plan.phases.length,
                currentPhaseName: currentPhaseName,
                estimatedTime: task.plan.estimatedTime,
                outputs: task.plan.outputs,
                notifications: task.notifications,
                unreadNotifications: task.notifications.filter(n => !n.read).length,
                resultsCount: task.results.length,
                createdAt: task.createdAt,
                updatedAt: task.updatedAt,
                completedAt: task.completedAt,
                error: task.error
            }
        });

    } catch (error) {
        console.error('[Autonomous Status] Error:', error.message);
        res.status(500).json({ success: false, error: error.message });
    }
}
