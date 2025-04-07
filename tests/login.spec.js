const { test, expect } = require('@playwright/test');

test('Login and Navigate to Add Lane', async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();

    console.log("   Opening Login Page...");
    await page.goto('https://id.dev.skymind.com/realms/secure-test/protocol/openid-connect/auth?client_id=webapp');

    console.log(" Entering Credentials...");
    await page.fill('input[name="username"], input[type="email"]', 'harsha@test.com');
    await page.fill('input[name="password"], input[type="password"]', 'Harshali@123');

    console.log(" Clicking Login...");
    await Promise.all([
        page.click('button[type="submit"], input[type="submit"]'),
        page.waitForURL('https://cloud.test.skymind.com', { timeout: 90000 }) // Wait for dashboard URL
    ]);

    console.log(" Logged in! Now clicking on Lane Management...");

    // **Click on Lane Management**
    await page.waitForSelector('text=Lane Management', { timeout: 90000 });
    await page.click('text=Lane Management');

    // **Wait for URL change after clicking Lane Management**
    await page.waitForURL(/lane-management/, { timeout: 90000 });

    console.log("Lane Management Page Loaded!");

    // **Click "ADD LANE" button**
    await page.waitForSelector('text=ADD LANE', { timeout: 90000 });
    await page.click('text=ADD LANE');

    // **Wait for Add Lane page to load**
    await page.waitForURL(/lane-management\/lanes\/add/, { timeout: 90000 });

    console.log("Add Lane Page Opened Successfully!");

    // **Save login session for later tests**
    await context.storageState({ path: 'auth.json' });

    console.log("Session saved! Now closing browser...");
});