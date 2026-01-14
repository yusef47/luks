/**
 * Smart Verification System for Lukas
 * Inspired by Manus AI's verification approach
 * 
 * 4 Levels:
 * 1. Source Comparison - Compare data from multiple sources
 * 2. Mathematical Verification - Verify calculations with code
 * 3. Temporal Verification - Check if data is recent
 * 4. Uncertainty Acknowledgment - Be honest about uncertainty
 */

// ═══════════════════════════════════════════════════════════════
//                    LEVEL 1: SOURCE COMPARISON
// ═══════════════════════════════════════════════════════════════

/**
 * Extract numerical values from text for comparison
 */
function extractNumbers(text) {
    const numbers = [];
    // Match Arabic and English numbers
    const patterns = [
        /(\d{1,3}(?:,\d{3})*(?:\.\d+)?)/g,  // English: 1,234.56
        /([٠-٩]{1,3}(?:[،٬][٠-٩]{3})*(?:[\.٫][٠-٩]+)?)/g,  // Arabic numerals
    ];

    for (const pattern of patterns) {
        const matches = text.match(pattern);
        if (matches) {
            numbers.push(...matches.map(n => {
                // Convert Arabic numerals to English
                return parseFloat(n
                    .replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d))
                    .replace(/[،٬]/g, '')
                    .replace(/[٫]/g, '.')
                    .replace(/,/g, '')
                );
            }));
        }
    }
    return numbers.filter(n => !isNaN(n));
}

/**
 * Compare sources and find consensus
 */
function compareSources(tavilyResults) {
    if (!tavilyResults || tavilyResults.length < 2) {
        return { hasConsensus: true, confidence: 'low', conflicts: [] };
    }

    const allNumbers = {};
    const conflicts = [];

    // Extract numbers from each source
    tavilyResults.forEach((result, idx) => {
        const numbers = extractNumbers(result.content || '');
        numbers.forEach(num => {
            if (!allNumbers[num]) allNumbers[num] = [];
            allNumbers[num].push({ source: result.title, index: idx });
        });
    });

    // Check for conflicting numbers (similar but different values)
    const numberList = Object.keys(allNumbers).map(Number).sort((a, b) => a - b);

    for (let i = 0; i < numberList.length - 1; i++) {
        const n1 = numberList[i];
        const n2 = numberList[i + 1];

        // If two numbers are within 10% of each other but not equal
        const diff = Math.abs(n1 - n2) / Math.max(n1, n2);
        if (diff > 0 && diff < 0.15) {
            conflicts.push({
                values: [n1, n2],
                sources: [allNumbers[n1][0]?.source, allNumbers[n2][0]?.source],
                difference: `${(diff * 100).toFixed(1)}%`
            });
        }
    }

    const confidence = conflicts.length === 0 ? 'high' :
        conflicts.length <= 2 ? 'medium' : 'low';

    return {
        hasConsensus: conflicts.length === 0,
        confidence,
        conflicts,
        sourcesCount: tavilyResults.length
    };
}

// ═══════════════════════════════════════════════════════════════
//                    LEVEL 2: MATHEMATICAL VERIFICATION
// ═══════════════════════════════════════════════════════════════

/**
 * Common mathematical verifications for financial data
 */
const MATH_RULES = {
    // Gold: Ounce = 31.1035 * gram price
    goldOunce: (gramPrice) => gramPrice * 31.1035,

    // Gold karats: 24K is base, others are proportional
    goldKarat: (price24, karat) => (price24 * karat) / 24,

    // Currency: Check if conversion makes sense
    currencyCheck: (usdPrice, egpPrice, exchangeRate) => {
        const expected = usdPrice * exchangeRate;
        const diff = Math.abs(expected - egpPrice) / expected;
        return diff < 0.1; // Within 10%
    }
};

/**
 * Verify mathematical consistency in the response
 */
function verifyMathematics(text, context = {}) {
    const issues = [];
    const numbers = extractNumbers(text);

    // Check gold calculations if mentioned
    if (/ذهب|gold|عيار|karat/i.test(text)) {
        // Look for gram and ounce prices
        const gramMatch = text.match(/الجرام[:\s]+([٠-٩\d,\.]+)/);
        const ounceMatch = text.match(/الأونصة[:\s]+([٠-٩\d,\.]+)/);

        if (gramMatch && ounceMatch) {
            const gramPrice = parseFloat(gramMatch[1].replace(/,/g, ''));
            const ouncePrice = parseFloat(ounceMatch[1].replace(/,/g, ''));
            const expectedOunce = MATH_RULES.goldOunce(gramPrice);

            const diff = Math.abs(expectedOunce - ouncePrice) / expectedOunce;
            if (diff > 0.1) {
                issues.push({
                    type: 'gold_ounce_mismatch',
                    message: `سعر الأونصة غير متسق: المتوقع ${expectedOunce.toFixed(0)} بينما المذكور ${ouncePrice}`,
                    severity: 'warning'
                });
            }
        }
    }

    return {
        isConsistent: issues.length === 0,
        issues
    };
}

// ═══════════════════════════════════════════════════════════════
//                    LEVEL 3: TEMPORAL VERIFICATION
// ═══════════════════════════════════════════════════════════════

/**
 * Check if sources are recent enough
 */
function verifyTemporalRelevance(tavilyResults, maxAgeHours = 24) {
    const now = new Date();
    const warnings = [];

    if (!tavilyResults || tavilyResults.length === 0) {
        return { isRecent: false, warnings: ['لم يتم العثور على مصادر'] };
    }

    tavilyResults.forEach(result => {
        // Try to extract date from the result
        const datePatterns = [
            /(\d{1,2})\s*(يناير|فبراير|مارس|أبريل|مايو|يونيو|يوليو|أغسطس|سبتمبر|أكتوبر|نوفمبر|ديسمبر)\s*(\d{4})/,
            /(\d{4})-(\d{2})-(\d{2})/,
            /منذ\s+(\d+)\s+(ساعة|ساعات|يوم|أيام)/
        ];

        let foundDate = null;
        for (const pattern of datePatterns) {
            const match = (result.content || '').match(pattern);
            if (match) {
                // Simplified date extraction - in production, parse properly
                if (match[0].includes('منذ')) {
                    const amount = parseInt(match[1]);
                    const unit = match[2];
                    const hours = unit.includes('يوم') ? amount * 24 : amount;
                    if (hours > maxAgeHours) {
                        warnings.push(`${result.title}: البيانات من ${match[0]}`);
                    }
                }
                foundDate = match[0];
                break;
            }
        }

        if (!foundDate && result.published_date) {
            const pubDate = new Date(result.published_date);
            const ageHours = (now - pubDate) / (1000 * 60 * 60);
            if (ageHours > maxAgeHours) {
                warnings.push(`${result.title}: تم نشره منذ ${Math.floor(ageHours)} ساعة`);
            }
        }
    });

    return {
        isRecent: warnings.length === 0,
        warnings
    };
}

// ═══════════════════════════════════════════════════════════════
//                    LEVEL 4: UNCERTAINTY ACKNOWLEDGMENT
// ═══════════════════════════════════════════════════════════════

/**
 * Generate uncertainty disclaimer based on verification results
 */
function generateUncertaintyNote(verificationResult) {
    const notes = [];

    // Source comparison issues
    if (!verificationResult.sourceComparison?.hasConsensus) {
        const conflicts = verificationResult.sourceComparison?.conflicts || [];
        if (conflicts.length > 0) {
            notes.push(`⚠️ تم رصد تضارب في الأرقام بين ${conflicts.length} مصدر`);
        }
    }

    // Mathematical issues
    if (!verificationResult.mathematical?.isConsistent) {
        const issues = verificationResult.mathematical?.issues || [];
        issues.forEach(issue => {
            notes.push(`🧮 ${issue.message}`);
        });
    }

    // Temporal issues
    if (!verificationResult.temporal?.isRecent) {
        const warnings = verificationResult.temporal?.warnings || [];
        if (warnings.length > 0) {
            notes.push(`📅 بعض المصادر قديمة: ${warnings[0]}`);
        }
    }

    // Overall confidence
    const confidence = verificationResult.sourceComparison?.confidence || 'unknown';
    if (confidence === 'low') {
        notes.push('💡 يُنصح بالتحقق من هذه المعلومات من مصادر رسمية');
    }

    return notes;
}

// ═══════════════════════════════════════════════════════════════
//                    MAIN VERIFICATION FUNCTION
// ═══════════════════════════════════════════════════════════════

/**
 * Check if verification is needed based on content type
 */
function needsVerification(question) {
    const verificationTriggers = [
        // Numbers and prices
        /سعر|أسعار|price|prices|\d+/,
        // Current events
        /اليوم|الآن|حالياً|today|now|current/,
        // Financial
        /سهم|أسهم|بورصة|stock|market/,
        // Statistics
        /نسبة|إحصائية|percentage|statistics/
    ];

    return verificationTriggers.some(pattern => pattern.test(question));
}

/**
 * Run all verification levels
 */
function runSmartVerification(tavilyResults, responseText, question) {
    // Skip if verification not needed
    if (!needsVerification(question)) {
        return {
            verified: true,
            skipped: true,
            notes: []
        };
    }

    console.log('[SmartVerify] 🔍 Running verification...');

    // Level 1: Source Comparison
    const sourceComparison = compareSources(tavilyResults);
    console.log(`[SmartVerify] 📊 Source comparison: ${sourceComparison.confidence} confidence`);

    // Level 2: Mathematical Verification
    const mathematical = verifyMathematics(responseText);
    console.log(`[SmartVerify] 🧮 Math check: ${mathematical.isConsistent ? 'OK' : 'Issues found'}`);

    // Level 3: Temporal Verification
    const temporal = verifyTemporalRelevance(tavilyResults);
    console.log(`[SmartVerify] 📅 Temporal check: ${temporal.isRecent ? 'Recent' : 'Some old sources'}`);

    // Level 4: Generate uncertainty notes
    const verificationResult = { sourceComparison, mathematical, temporal };
    const notes = generateUncertaintyNote(verificationResult);

    console.log(`[SmartVerify] ✅ Verification complete. Notes: ${notes.length}`);

    return {
        verified: true,
        skipped: false,
        sourceComparison,
        mathematical,
        temporal,
        notes,
        overallConfidence: sourceComparison.confidence
    };
}

// Export all functions
export {
    extractNumbers,
    compareSources,
    verifyMathematics,
    verifyTemporalRelevance,
    generateUncertaintyNote,
    needsVerification,
    runSmartVerification
};
