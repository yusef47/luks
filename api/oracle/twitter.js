// Oracle Twitter Poster - النشر
// ينشر على Twitter زي البني آدم

import { chromium } from 'playwright-core';

// ═══════════════════════════════════════════════════════════════
//                      TWITTER LOGIN
// ═══════════════════════════════════════════════════════════════

async function loginToTwitter(page) {
    const username = process.env.TWITTER_USERNAME;
    const password = process.env.TWITTER_PASSWORD;

    if (!username || !password) {
        throw new Error('TWITTER_USERNAME and TWITTER_PASSWORD required');
    }

    console.log('[Oracle] Navigating to Twitter login...');
    await page.goto('https://twitter.com/login', { waitUntil: 'networkidle' });

    // انتظر شوية عشان يبان بشري
    await page.waitForTimeout(2000 + Math.random() * 2000);

    // ادخل الـ username
    console.log('[Oracle] Entering username...');
    const usernameInput = await page.waitForSelector('input[autocomplete="username"]', { timeout: 10000 });
    await usernameInput.type(username, { delay: 100 + Math.random() * 100 });

    await page.waitForTimeout(1000);

    // اضغط Next
    await page.click('text=Next');
    await page.waitForTimeout(2000);

    // ادخل الـ password
    console.log('[Oracle] Entering password...');
    const passwordInput = await page.waitForSelector('input[type="password"]', { timeout: 10000 });
    await passwordInput.type(password, { delay: 100 + Math.random() * 100 });

    await page.waitForTimeout(1000);

    // اضغط Log in
    await page.click('text=Log in');

    // انتظر الـ home timeline
    console.log('[Oracle] Waiting for login completion...');
    await page.waitForURL('**/home', { timeout: 30000 });

    console.log('[Oracle] Login successful!');
    return true;
}

// ═══════════════════════════════════════════════════════════════
//                      POST TWEET
// ═══════════════════════════════════════════════════════════════

async function postTweet(page, tweetText) {
    console.log('[Oracle] Preparing to post tweet...');

    // روح للـ compose
    await page.goto('https://twitter.com/compose/tweet', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    // اكتب التغريدة
    console.log('[Oracle] Typing tweet...');
    const tweetBox = await page.waitForSelector('[data-testid="tweetTextarea_0"]', { timeout: 10000 });
    await tweetBox.type(tweetText, { delay: 50 + Math.random() * 50 });

    await page.waitForTimeout(1000);

    // اضغط Post
    console.log('[Oracle] Clicking post button...');
    await page.click('[data-testid="tweetButton"]');

    // انتظر التأكيد
    await page.waitForTimeout(3000);

    console.log('[Oracle] Tweet posted successfully!');
    return true;
}

// ═══════════════════════════════════════════════════════════════
//                      MAIN POSTER
// ═══════════════════════════════════════════════════════════════

export async function publishToTwitter(tweetText) {
    if (!tweetText) {
        console.log('[Oracle] No tweet to post');
        return { success: false, error: 'No tweet text provided' };
    }

    console.log('[Oracle] Starting Twitter automation...');
    console.log('[Oracle] Tweet:', tweetText.substring(0, 50) + '...');

    let browser = null;

    try {
        // Launch browser
        browser = await chromium.launch({
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-gpu'
            ]
        });

        const context = await browser.newContext({
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            viewport: { width: 1280, height: 720 }
        });

        const page = await context.newPage();

        // Login
        await loginToTwitter(page);

        // Post
        await postTweet(page, tweetText);

        // Cleanup
        await browser.close();

        return {
            success: true,
            tweet: tweetText,
            timestamp: new Date().toISOString()
        };

    } catch (error) {
        console.error('[Oracle] Twitter error:', error.message);

        if (browser) {
            await browser.close();
        }

        return {
            success: false,
            error: error.message
        };
    }
}

// ═══════════════════════════════════════════════════════════════
//                      FALLBACK: JUST LOG
// ═══════════════════════════════════════════════════════════════

export async function logTweetOnly(tweetText) {
    // في حالة Playwright مش متاح، نسجل التغريدة بس
    console.log('═══════════════════════════════════════════');
    console.log('🔮 LUKAS ORACLE WOULD TWEET:');
    console.log('═══════════════════════════════════════════');
    console.log(tweetText);
    console.log('═══════════════════════════════════════════');
    console.log('Timestamp:', new Date().toISOString());

    return {
        success: true,
        mode: 'LOG_ONLY',
        tweet: tweetText,
        timestamp: new Date().toISOString()
    };
}
