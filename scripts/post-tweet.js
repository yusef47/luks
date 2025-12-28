// Post tweet using Playwright
// This script is used by GitHub Actions to post tweets to Twitter

import { chromium } from 'playwright';
import fs from 'fs';

async function postTweet() {
    const username = process.env.TWITTER_USERNAME;
    const password = process.env.TWITTER_PASSWORD;
    const email = process.env.TWITTER_EMAIL;

    // Read tweet from file (to handle special characters properly)
    let tweetText;
    try {
        tweetText = fs.readFileSync('tweet.txt', 'utf8').trim();
    } catch (e) {
        console.log('Could not read tweet.txt, trying env var');
        tweetText = process.env.TWEET_TEXT;
    }

    if (!username || !password || !tweetText) {
        console.log('Missing credentials or tweet text');
        console.log('Username:', username ? 'SET' : 'MISSING');
        console.log('Password:', password ? 'SET' : 'MISSING');
        console.log('Tweet:', tweetText ? tweetText.substring(0, 30) + '...' : 'MISSING');
        process.exit(1);
    }

    console.log('🔮 Oracle Twitter Bot Starting...');
    console.log('Tweet to post:', tweetText.substring(0, 50) + '...');

    // Launch browser with anti-detection settings
    const browser = await chromium.launch({
        headless: true,
        args: [
            '--disable-blink-features=AutomationControlled',
            '--no-sandbox',
            '--disable-setuid-sandbox'
        ]
    });

    const context = await browser.newContext({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        viewport: { width: 1280, height: 720 },
        locale: 'en-US'
    });

    const page = await context.newPage();
    page.setDefaultTimeout(60000);

    try {
        // Go to Twitter login
        console.log('📱 Opening Twitter...');
        await page.goto('https://twitter.com/i/flow/login', {
            waitUntil: 'domcontentloaded',
            timeout: 60000
        });
        await page.waitForTimeout(5000);

        // Step 1: Enter username
        console.log('👤 Looking for username input...');
        const usernameInput = await page.waitForSelector('input[autocomplete="username"]', { timeout: 30000 });
        console.log('👤 Entering username...');
        await usernameInput.fill(username);
        await page.waitForTimeout(1000);

        // Click Next
        console.log('➡️ Clicking Next...');
        await page.click('[role="button"]:has-text("Next")');
        await page.waitForTimeout(3000);

        // Step 2: Check what screen we're on
        console.log('🔍 Checking current step...');

        // Take screenshot to see current state
        await page.screenshot({ path: 'step-check.png' });
        console.log('📸 Screenshot saved to step-check.png');

        // Check for email/phone verification
        const emailVerification = await page.$('input[data-testid="ocfEnterTextTextInput"]');
        if (emailVerification) {
            console.log('📧 Email/Phone verification required...');
            await emailVerification.fill(email);
            await page.waitForTimeout(1000);
            await page.click('[data-testid="ocfEnterTextNextButton"]');
            await page.waitForTimeout(3000);
        }

        // Step 3: Enter password
        console.log('🔑 Looking for password input...');

        // Wait for password field with multiple attempts
        let passwordInput = null;
        for (let i = 0; i < 5; i++) {
            passwordInput = await page.$('input[name="password"]');
            if (passwordInput) break;
            console.log(`   Attempt ${i + 1}: Password input not found, waiting...`);
            await page.waitForTimeout(2000);
        }

        if (!passwordInput) {
            // Take screenshot to debug
            await page.screenshot({ path: 'no-password-field.png' });
            console.log('📸 Screenshot saved to no-password-field.png');
            throw new Error('Password input field not found after multiple attempts');
        }

        console.log('🔑 Entering password...');
        await passwordInput.fill(password);
        await page.waitForTimeout(1000);

        // Click Log in button
        console.log('🔓 Clicking Log in...');
        await page.click('[data-testid="LoginForm_Login_Button"]');
        await page.waitForTimeout(8000);

        // Check if logged in
        console.log('🔍 Checking login status...');
        const currentUrl = page.url();
        console.log('Current URL:', currentUrl);

        // Go to compose tweet
        console.log('✍️ Going to compose tweet...');
        await page.goto('https://twitter.com/compose/tweet', {
            waitUntil: 'domcontentloaded',
            timeout: 30000
        });
        await page.waitForTimeout(5000);

        // Find tweet input
        let tweetBox = await page.$('[data-testid="tweetTextarea_0"]');

        if (!tweetBox) {
            console.log('📝 Trying home page...');
            await page.goto('https://twitter.com/home', {
                waitUntil: 'domcontentloaded',
                timeout: 30000
            });
            await page.waitForTimeout(5000);
            tweetBox = await page.$('[data-testid="tweetTextarea_0"]');
        }

        if (!tweetBox) {
            await page.screenshot({ path: 'no-tweet-box.png' });
            throw new Error('Could not find tweet input box');
        }

        // Type and post
        console.log('⌨️ Typing tweet...');
        await tweetBox.click();
        await page.waitForTimeout(500);
        await page.keyboard.type(tweetText, { delay: 30 });
        await page.waitForTimeout(2000);

        console.log('📤 Posting tweet...');
        await page.click('[data-testid="tweetButton"]');
        await page.waitForTimeout(8000);

        console.log('🎉 Tweet posted successfully!');
        console.log('🔮 Oracle has spoken.');

    } catch (error) {
        console.error('❌ Error:', error.message);
        try {
            await page.screenshot({ path: 'error-screenshot.png' });
            console.log('📸 Screenshot saved to error-screenshot.png');
        } catch (e) {
            console.log('Could not save screenshot');
        }
        process.exit(1);
    } finally {
        await browser.close();
    }
}

postTweet();
