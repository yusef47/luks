// Ensemble AI System - Main Orchestrator
// النظام الرئيسي للعمل بالتوازي

import { getGeminiResponse } from './gemini-team.js';
import { getGroqResponse } from './groq-team.js';
import { synthesizeResponses, advancedSynthesis } from './synthesizer.js';

/**
 * تنفيذ الـ Ensemble - يشغل Gemini و Groq بالتوازي
 * @param {string} prompt - السؤال
 * @param {object} options - خيارات إضافية
 * @returns {object} - الإجابة النهائية
 */
async function runEnsemble(prompt, options = {}) {
    console.log('═══════════════════════════════════════════════════════════');
    console.log('[Ensemble] Starting parallel execution...');
    console.log('═══════════════════════════════════════════════════════════');

    const startTime = Date.now();

    // تشغيل الفريقين بالتوازي
    const [geminiResult, groqResult] = await Promise.allSettled([
        getGeminiResponse(prompt),
        getGroqResponse(prompt)
    ]);

    // استخراج النتائج
    const geminiResponse = geminiResult.status === 'fulfilled' ? geminiResult.value : null;
    const groqResponse = groqResult.status === 'fulfilled' ? groqResult.value : null;

    // تسجيل النتائج
    console.log('───────────────────────────────────────────────────────────');
    console.log(`[Ensemble] Gemini: ${geminiResponse ? '✅ Success' : '❌ Failed'}`);
    console.log(`[Ensemble] Groq: ${groqResponse ? '✅ Success' : '❌ Failed'}`);
    console.log('───────────────────────────────────────────────────────────');

    // دمج الإجابات
    let finalResult;

    if (options.useAdvancedSynthesis && geminiResponse && groqResponse) {
        // دمج متقدم باستخدام AI
        finalResult = await advancedSynthesis(
            geminiResponse,
            groqResponse,
            prompt,
            options.synthesizerAPI || getGeminiResponse
        );
    } else {
        // دمج بسيط
        finalResult = await synthesizeResponses(geminiResponse, groqResponse, prompt);
    }

    const totalTime = Date.now() - startTime;

    console.log('═══════════════════════════════════════════════════════════');
    console.log(`[Ensemble] Completed in ${totalTime}ms`);
    console.log(`[Ensemble] Final source: ${finalResult?.source || 'none'}`);
    console.log('═══════════════════════════════════════════════════════════');

    if (finalResult) {
        finalResult.ensembleTime = totalTime;
        finalResult.geminiAvailable = !!geminiResponse;
        finalResult.groqAvailable = !!groqResponse;
    }

    return finalResult;
}

/**
 * نسخة سريعة - تستخدم أول من يرد
 */
async function runEnsembleFast(prompt) {
    console.log('[Ensemble Fast] Racing Gemini vs Groq...');

    const result = await Promise.race([
        getGeminiResponse(prompt).then(r => r ? { ...r, winner: 'gemini' } : null),
        getGroqResponse(prompt).then(r => r ? { ...r, winner: 'groq' } : null)
    ]);

    if (result) {
        console.log(`[Ensemble Fast] Winner: ${result.winner}`);
        return result;
    }

    // لو الأول فشل، جرب الثاني
    console.log('[Ensemble Fast] First failed, trying second...');
    return runEnsemble(prompt);
}

export {
    runEnsemble,
    runEnsembleFast,
    getGeminiResponse,
    getGroqResponse,
    synthesizeResponses
};
