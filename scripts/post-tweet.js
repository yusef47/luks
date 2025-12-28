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
            '--disable-features=IsolateOrigins,site-per-process',
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

    // Increase default timeout
    page.setDefaultTimeout(60000);

    try {
        // Go to Twitter login
        console.log('📱 Opening Twitter...');
        await page.goto('https://twitter.com/login', {
            waitUntil: 'domcontentloaded',
            timeout: 60000
        });
        await page.waitForTimeout(5000);

        // Wait for username input
        console.log('👤 Waiting for login form...');
        await page.waitForSelector('input[autocomplete="username"]', { timeout: 30000 });

        // Enter username
        console.log('👤 Entering username...');
        await page.fill('input[autocomplete="username"]', username);
        await page.waitForTimeout(1000);

        // Click Next button
        const nextButton = await page.$('button:has-text("Next")');
        if (nextButton) {
            await nextButton.click();
        } else {
            // Try alternative selector
            await page.click('[role="button"]:has-text("Next")');
        }
        await page.waitForTimeout(3000);

        // Check if email verification is needed
        const emailInput = await page.$('input[data-testid="ocfEnterTextTextInput"]');
        if (emailInput) {
            console.log('📧 Email verification required...');
            await emailInput.fill(email);
            await page.waitForTimeout(500);
            const emailNextBtn = await page.$('button[data-testid="ocfEnterTextNextButton"]');
            if (emailNextBtn) {
                await emailNextBtn.click();
            }
            await page.waitForTimeout(3000);
        }

        // Wait for and enter password
        console.log('🔑 Entering password...');
        await page.waitForSelector('input[name="password"]', { timeout: 15000 });
        await page.fill('input[name="password"]', password);
        await page.waitForTimeout(1000);

        // Click login button
        const loginButton = await page.$('button[data-testid="LoginForm_Login_Button"]');
        if (loginButton) {
            await loginButton.click();
        } else {
            await page.click('[role="button"]:has-text("Log in")');
        }
        await page.waitForTimeout(8000);

        // Check if logged in
        console.log('🔍 Checking login status...');
        const currentUrl = page.url();
        console.log('Current URL:', currentUrl);

        if (currentUrl.includes('login') || currentUrl.includes('error')) {
            console.log('⚠️ Still on login page, might need manual verification');
            // Take screenshot
            await page.screenshot({ path: 'login-state.png' });
            throw new Error('Login verification required or failed');
        }

        console.log('✅ Navigating to compose...');

        // Try to post tweet
        // Option 1: Use compose URL
        await page.goto('https://twitter.com/compose/tweet', {
            waitUntil: 'domcontentloaded',
            timeout: 30000
        });
        await page.waitForTimeout(5000);

        // Find tweet input
        console.log('✍️ Looking for tweet input...');
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

        if (tweetBox) {
            await tweetBox.click();
            await page.waitForTimeout(500);

            // Type tweet character by character
            console.log('⌨️ Typing tweet...');
            await page.keyboard.type(tweetText, { delay: 30 });
            await page.waitForTimeout(2000);

            // Click post button
            console.log('📤 Clicking post button...');
            const postButton = await page.$('[data-testid="tweetButton"]');
            if (postButton) {
                await postButton.click();
                await page.waitForTimeout(8000);
                console.log('🎉 Tweet posted successfully!');
                console.log('🔮 Oracle has spoken.');
            } else {
                throw new Error('Could not find post button');
            }
        } else {
            throw new Error('Could not find tweet input box');
        }

    } catch (error) {
        console.error('❌ Error:', error.message);

        // Take screenshot for debugging
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
