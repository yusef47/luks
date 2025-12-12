// Synthesizer - Ensemble AI System
// دمج الإجابات من Gemini و Groq

async function synthesizeResponses(geminiResponse, groqResponse, originalPrompt) {
    console.log('[Synthesizer] Starting synthesis...');

    // إذا واحد فقط نجح، أرجعه
    if (!geminiResponse && !groqResponse) {
        console.log('[Synthesizer] Both teams failed');
        return null;
    }

    if (!geminiResponse) {
        console.log('[Synthesizer] Only Groq succeeded');
        return {
            text: groqResponse.text,
            source: 'groq-only',
            model: groqResponse.model
        };
    }

    if (!groqResponse) {
        console.log('[Synthesizer] Only Gemini succeeded');
        return {
            text: geminiResponse.text,
            source: 'gemini-only',
            model: geminiResponse.model
        };
    }

    // كلاهما نجح - نختار الأفضل أو ندمج
    console.log('[Synthesizer] Both teams succeeded, synthesizing...');

    // استراتيجية بسيطة: اختار الأطول والأكثر تفصيلاً
    const geminiLen = geminiResponse.text.length;
    const groqLen = groqResponse.text.length;

    // إذا فرق الطول كبير، اختار الأطول
    if (geminiLen > groqLen * 1.5) {
        console.log('[Synthesizer] Gemini response is significantly longer, using it');
        return {
            text: geminiResponse.text,
            source: 'gemini-selected',
            model: geminiResponse.model,
            alternativeSource: 'groq',
            alternativeLength: groqLen
        };
    }

    if (groqLen > geminiLen * 1.5) {
        console.log('[Synthesizer] Groq response is significantly longer, using it');
        return {
            text: groqResponse.text,
            source: 'groq-selected',
            model: groqResponse.model,
            alternativeSource: 'gemini',
            alternativeLength: geminiLen
        };
    }

    // الأطوال متقاربة - Gemini أفضل بالعربي عادةً
    const isArabic = /[\u0600-\u06FF]/.test(originalPrompt);

    if (isArabic) {
        console.log('[Synthesizer] Arabic detected, preferring Gemini');
        return {
            text: geminiResponse.text,
            source: 'gemini-preferred-arabic',
            model: geminiResponse.model
        };
    }

    // للإنجليزي، اختار الأطول
    const selected = geminiLen >= groqLen ? geminiResponse : groqResponse;
    console.log(`[Synthesizer] Using ${selected.source} response`);

    return {
        text: selected.text,
        source: `${selected.source}-selected`,
        model: selected.model
    };
}

// دمج متقدم - يستخدم AI لدمج الإجابتين
async function advancedSynthesis(geminiResponse, groqResponse, originalPrompt, synthesizerAPI) {
    if (!geminiResponse || !groqResponse) {
        return synthesizeResponses(geminiResponse, groqResponse, originalPrompt);
    }

    console.log('[Synthesizer] Advanced synthesis with AI...');

    const synthesisPrompt = `
أنت خبير في دمج المعلومات. لديك إجابتين من مصدرين مختلفين على نفس السؤال.
قم بدمج أفضل المعلومات من الإجابتين في إجابة واحدة شاملة.

السؤال الأصلي:
${originalPrompt}

الإجابة 1 (من Gemini):
${geminiResponse.text.substring(0, 3000)}

الإجابة 2 (من Groq):
${groqResponse.text.substring(0, 3000)}

قم بإنتاج إجابة نهائية موحدة تجمع أفضل ما في الإجابتين.
اكتب الإجابة النهائية فقط بدون مقدمات.
`;

    try {
        const result = await synthesizerAPI(synthesisPrompt);
        if (result && result.text) {
            return {
                text: result.text,
                source: 'ai-synthesized',
                model: result.model,
                inputs: ['gemini', 'groq']
            };
        }
    } catch (error) {
        console.log('[Synthesizer] Advanced synthesis failed, using simple synthesis');
    }

    return synthesizeResponses(geminiResponse, groqResponse, originalPrompt);
}

export {
    synthesizeResponses,
    advancedSynthesis
};
