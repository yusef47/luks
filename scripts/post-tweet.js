// Post tweet using Playwright with saved cookies
// This script is used by GitHub Actions to post tweets to Twitter

import { chromium } from 'playwright';
import fs from 'fs';

async function postTweet() {
    // Read tweet from file
    let tweetText;
    try {
        tweetText = fs.readFileSync('tweet.txt', 'utf8').trim();
    } catch (e) {
        console.log('Could not read tweet.txt');
        process.exit(1);
    }

    if (!tweetText) {
        console.log('No tweet text found');
        process.exit(1);
    }

    // Get cookies from environment variable
    const cookiesJson = process.env.TWITTER_COOKIES;
    if (!cookiesJson) {
        console.log('❌ TWITTER_COOKIES environment variable not set');
        process.exit(1);
    }

    let cookies;
    try {
        cookies = JSON.parse(cookiesJson);
        console.log(`🍪 Loaded ${cookies.length} cookies`);
    } catch (e) {
        console.log('❌ Failed to parse cookies JSON:', e.message);
        process.exit(1);
    }

    console.log('🔮 Oracle Twitter Bot Starting...');
    console.log('Tweet to post:', tweetText.substring(0, 50) + '...');

    // Launch browser
    const browser = await chromium.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const context = await browser.newContext({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        viewport: { width: 1280, height: 720 },
        locale: 'en-US'
    });

    // Convert cookies to Playwright format
    const playwrightCookies = cookies.map(c => {
        // Fix sameSite value - Playwright only accepts Strict, Lax, or None
        let sameSite = 'Lax'; // default
        if (c.sameSite === 'no_restriction' || c.sameSite === 'None') {
            sameSite = 'None';
        } else if (c.sameSite === 'lax' || c.sameSite === 'Lax') {
            sameSite = 'Lax';
        } else if (c.sameSite === 'strict' || c.sameSite === 'Strict') {
            sameSite = 'Strict';
        }
        // If sameSite is null or undefined, use Lax as default

        return {
            name: c.name,
            value: c.value,
            domain: c.domain,
            path: c.path || '/',
            expires: c.expirationDate || -1,
            httpOnly: c.httpOnly || false,
            secure: c.secure || false,
            sameSite: sameSite
        };
    });

    // Add cookies to context
    await context.addCookies(playwrightCookies);
    console.log('🍪 Cookies loaded into browser');

    const page = await context.newPage();
    page.setDefaultTimeout(60000);

    try {
        // Go directly to Twitter home (should be logged in via cookies)
        console.log('📱 Opening Twitter...');
        await page.goto('https://x.com/home', {
            waitUntil: 'domcontentloaded',
            timeout: 60000
        });
        await page.waitForTimeout(5000);

        // Check if logged in by looking for tweet button
        console.log('🔍 Checking login status...');
        const currentUrl = page.url();
        console.log('Current URL:', currentUrl);

        if (currentUrl.includes('login')) {
            console.log('❌ Not logged in - cookies might be expired');
            await page.screenshot({ path: 'not-logged-in.png' });
            throw new Error('Cookies expired - need to refresh');
        }

        // Find tweet input
        console.log('✍️ Looking for tweet input...');
        await page.waitForTimeout(3000);

        let tweetBox = await page.$('[data-testid="tweetTextarea_0"]');

        if (!tweetBox) {
            // Try clicking on "What is happening?!" placeholder
            const placeholder = await page.$('[data-text="What is happening?!"]');
            if (placeholder) {
                await placeholder.click();
                await page.waitForTimeout(1000);
                tweetBox = await page.$('[data-testid="tweetTextarea_0"]');
            }
        }

        if (!tweetBox) {
            // Try compose URL
            console.log('📝 Trying compose page...');
            await page.goto('https://x.com/compose/post', {
                waitUntil: 'domcontentloaded',
                timeout: 30000
            });
            await page.waitForTimeout(3000);
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

        // Take screenshot before posting
        await page.screenshot({ path: 'before-post.png' });

        console.log('📤 Looking for post button...');

        // Try multiple selectors for the post button
        const buttonSelectors = [
            '[data-testid="tweetButton"]',
            '[data-testid="tweetButtonInline"]',
            'button[data-testid="tweetButton"]',
            '[role="button"]:has-text("Post")',
            '[role="button"]:has-text("post")',
            'button:has-text("Post")'
        ];

        let postButton = null;
        for (const selector of buttonSelectors) {
            postButton = await page.$(selector);
            if (postButton) {
                console.log(`Found button with selector: ${selector}`);
                break;
            }
        }

        if (postButton) {
            await postButton.click();
            console.log('📤 Clicked post button!');
            await page.waitForTimeout(8000);

            // Take screenshot after posting
            await page.screenshot({ path: 'after-post.png' });

            console.log('🎉 Tweet posted successfully!');
            console.log('🔮 Oracle has spoken.');
        } else {
            // Last resort: try pressing Ctrl+Enter to submit
            console.log('⌨️ Trying Ctrl+Enter to submit...');
            await page.keyboard.press('Control+Enter');
            await page.waitForTimeout(5000);
            await page.screenshot({ path: 'after-ctrl-enter.png' });
            console.log('🎉 Attempted post with Ctrl+Enter');
        }

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
