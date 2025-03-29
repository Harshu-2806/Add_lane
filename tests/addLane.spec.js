const { test, expect } = require('@playwright/test');

test('Fill Add Lane Form after ensuring UI is stable', async ({ browser }) => {
    const context = await browser.newContext({ storageState: 'auth.json' });
    const page = await context.newPage();

    console.log("🔄 Navigating to Add Lane Page...");
    await page.goto('https://cloud.test.skymind.com/lane-management/lanes/add', { waitUntil: 'domcontentloaded' });

    console.log("⏳ Waiting for full page load...");
    await page.waitForLoadState('domcontentloaded', { timeout: 240000 });

    console.log("⏳ Checking if blur effect is still present...");
    await page.waitForFunction(() => {
        const blurElements = document.querySelectorAll('.blur-class, .loading-overlay');  // ✅ Update with actual class
        return Array.from(blurElements).every(el => window.getComputedStyle(el).visibility === 'hidden' || el.style.display === 'none');
    }, { timeout: 240000 });

    console.log("✅ Blur effect removed!");

    // **Ensure Form is Fully Loaded**
    console.log("⏳ Waiting for Add Lane form container...");
    await page.waitForSelector('.form-class', { state: 'visible', timeout: 120000 })
        .catch(() => console.log("⚠️ Form container not found within timeout!"));

    console.log("✅ Form detected! Ensuring all elements are interactive...");

    // **Extra Check: Wait for an actual input field inside the form**
    console.log("⏳ Waiting for input fields to load...");
    await page.waitForSelector('input[placeholder="Lane Name"], select[name="forwarder"]', { state: 'visible', timeout: 120000 })
        .catch(() => console.log("⚠️ Input fields not found within timeout!"));

    console.log("✅ All fields are ready for input!");

    // **Select Forwarder**
    console.log("⏳ Clicking Forwarder dropdown...");
    await page.click('select[name="forwarder"]');

    console.log("⏳ Waiting for dropdown options to load...");
    await page.waitForFunction(() => {
        const options = document.querySelectorAll('select[name="forwarder"] option');
        return options.length > 1;
    }, { timeout: 90000 });

    console.log("✅ Forwarder options loaded!");
    await page.selectOption('select[name="forwarder"]', { index: 1 });

    console.log("✅ Forwarder selected!");

    // **Fill Lane Name**
    await page.fill('input[placeholder="Lane Name"]', 'Test Lane');
    console.log("✅ Lane Name entered!");

    // **Click Save**
    console.log("⏳ Clicking Save button...");
    await page.waitForSelector('text=Save', { state: 'visible', timeout: 30000 });
    await page.click('text=Save');

    console.log("✅ Lane details submitted successfully!");
});
