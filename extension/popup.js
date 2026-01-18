/**
 * Lukas Browser AI - Popup Script
 * Handles UI interactions and communicates with background script
 */

const API_URL = 'https://luks-pied.vercel.app/api/browser-ai';
let isRunning = false;
let currentStep = 0;
let maxSteps = 10;

// DOM Elements
const taskInput = document.getElementById('taskInput');
const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');
const status = document.getElementById('status');
const progress = document.getElementById('progress');
const stepNum = document.getElementById('stepNum');
const maxStepsEl = document.getElementById('maxSteps');
const progressPercent = document.getElementById('progressPercent');
const progressFill = document.getElementById('progressFill');
const stepInfo = document.getElementById('stepInfo');
const log = document.getElementById('log');

// Start task
startBtn.addEventListener('click', async () => {
    const task = taskInput.value.trim();
    if (!task) {
        addLog('❌ اكتب المهمة أولاً', 'error');
        return;
    }

    isRunning = true;
    currentStep = 0;
    updateUI();
    addLog(`🚀 بدء المهمة: "${task.substring(0, 30)}..."`, 'action');

    // Send message to background script
    chrome.runtime.sendMessage({
        action: 'startTask',
        task: task,
        maxSteps: maxSteps
    });
});

// Stop task
stopBtn.addEventListener('click', () => {
    isRunning = false;
    chrome.runtime.sendMessage({ action: 'stopTask' });
    addLog('⏹ تم إيقاف المهمة', 'error');
    updateUI();
});

// Listen for messages from background
chrome.runtime.onMessage.addListener((message) => {
    if (message.type === 'step') {
        currentStep = message.step;
        stepInfo.textContent = message.action || 'جاري التنفيذ...';
        updateProgress();
        addLog(`📍 خطوة ${message.step}: ${message.action}`, 'action');
    }

    if (message.type === 'complete') {
        isRunning = false;
        updateUI();
        addLog(`✅ اكتمل: ${message.result || 'تم بنجاح'}`, 'success');
        stepInfo.textContent = 'اكتمل!';
    }

    if (message.type === 'error') {
        isRunning = false;
        updateUI();
        addLog(`❌ خطأ: ${message.error}`, 'error');
    }
});

function updateUI() {
    startBtn.disabled = isRunning;
    startBtn.style.display = isRunning ? 'none' : 'block';
    stopBtn.style.display = isRunning ? 'block' : 'none';
    progress.classList.toggle('active', isRunning);
    status.textContent = isRunning ? 'يعمل...' : 'جاهز';
    status.classList.toggle('busy', isRunning);
}

function updateProgress() {
    const percent = Math.round((currentStep / maxSteps) * 100);
    stepNum.textContent = currentStep;
    maxStepsEl.textContent = maxSteps;
    progressPercent.textContent = `${percent}%`;
    progressFill.style.width = `${percent}%`;
}

function addLog(text, type = '') {
    const entry = document.createElement('div');
    entry.className = `log-entry ${type}`;
    entry.textContent = `${new Date().toLocaleTimeString('ar-EG')} - ${text}`;
    log.insertBefore(entry, log.firstChild);

    // Keep only last 20 entries
    while (log.children.length > 20) {
        log.removeChild(log.lastChild);
    }
}

// Initialize
updateUI();
addLog('🧠 Lukas Browser AI جاهز', 'success');
