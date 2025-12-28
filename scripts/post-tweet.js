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

    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();

    try {
        // Go to Twitter login
        console.log('📱 Opening Twitter...');
        await page.goto('https://twitter.com/login', { waitUntil: 'networkidle' });
        await page.waitForTimeout(2000);

        // Enter username
        console.log('👤 Entering username...');
        await page.fill('input[autocomplete="username"]', username);
        await page.click('button:has-text("Next")');
        await page.waitForTimeout(2000);

        // Check if email verification is needed
        const emailInput = await page.$('input[data-testid="ocfEnterTextTextInput"]');
        if (emailInput) {
            console.log('📧 Email verification required...');
            await emailInput.fill(email);
            await page.click('button[data-testid="ocfEnterTextNextButton"]');
            await page.waitForTimeout(2000);
        }

        // Enter password
        console.log('🔑 Entering password...');
        await page.fill('input[name="password"]', password);
        await page.click('button[data-testid="LoginForm_Login_Button"]');
        await page.waitForTimeout(5000);

        // Check if logged in
        const homeUrl = page.url();
        if (!homeUrl.includes('home')) {
            console.log('❌ Login might have failed. Current URL:', homeUrl);
            // Try to continue anyway
        } else {
            console.log('✅ Logged in successfully!');
        }

        // Go to compose tweet
        console.log('✍️ Composing tweet...');
        await page.goto('https://twitter.com/compose/tweet', { waitUntil: 'networkidle' });
        await page.waitForTimeout(3000);

        // Type the tweet
        const tweetBox = await page.$('[data-testid="tweetTextarea_0"]');
        if (tweetBox) {
            await tweetBox.click();
            await page.keyboard.type(tweetText, { delay: 50 });
            await page.waitForTimeout(1000);

            // Click post button
            console.log('📤 Posting tweet...');
            await page.click('[data-testid="tweetButton"]');
            await page.waitForTimeout(5000);

            console.log('🎉 Tweet posted successfully!');
            console.log('🔮 Oracle has spoken.');
        } else {
            // Alternative: post from home
            console.log('📝 Using home page to post...');
            await page.goto('https://twitter.com/home', { waitUntil: 'networkidle' });
            await page.waitForTimeout(3000);

            const homeTextBox = await page.$('[data-testid="tweetTextarea_0"]');
            if (homeTextBox) {
                await homeTextBox.click();
                await page.keyboard.type(tweetText, { delay: 50 });
                await page.waitForTimeout(1000);
                await page.click('[data-testid="tweetButton"]');
                await page.waitForTimeout(5000);
                console.log('🎉 Tweet posted successfully!');
            } else {
                throw new Error('Could not find tweet input box');
            }
        }

    } catch (error) {
        console.error('❌ Error:', error.message);

        // Take screenshot for debugging
        await page.screenshot({ path: 'error-screenshot.png' });
        console.log('📸 Screenshot saved to error-screenshot.png');

        process.exit(1);
    } finally {
        await browser.close();
    }
}

postTweet();
