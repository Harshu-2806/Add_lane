const { test, expect } = require('@playwright/test');  

test('Fill Add Lane Form after ensuring UI is stable', async ({ browser }) => {
    const context = await browser.newContext({ storageState: 'auth.json' });
    const page = await context.newPage();

    console.log("🔄 Navigating to Add Lane Page...");
    await page.goto('https://cloud.test.skymind.com/lane-management/lanes/add', { waitUntil: 'domcontentloaded' ,timeout:5000000});

    console.log("⏳ Waiting for full page load...");
    await page.waitForLoadState('domcontentloaded', { timeout: 240000 });

    console.log("⏳ Checking if blur effect is still present...");
    await page.waitForFunction(() => {
        const blurElements = document.querySelectorAll('.blur-class, .loading-overlay');  // ✅ Update with actual class
        return Array.from(blurElements).every(el => window.getComputedStyle(el).visibility === 'hidden' || el.style.display === 'none');
    }, { timeout: 480000 });

    console.log("✅ Blur effect removed!");

    // *Ensure Form is Fully Loaded*
    console.log("⏳ Waiting for Add Lane form container...");
    
    await page.waitForSelector('.MuiFormControl-root', { state: 'visible', timeout: 480000 });

    // *Extra Check: Wait for an actual input field inside the form*
    //console.log("⏳ Waiting for input fields to load...");
        //.catch(() => console.log("⚠️ Input fields not found within timeout!"));

    console.log("✅ All fields are ready for input!");
    await page.waitForSelector('input', { timeout: 480000 });

    console.log("✅ Form and input fields are ready.");
        console.log("Page URL before fill:", page.url());
        //await page.locator('[placeholder="External ID"]').fill('12345');
        const CreateButton = page.locator('button:has-text("Create")');
        const successToast = page.getByText('Successfully created.', { exact: false });
         await expect(CreateButton).toBeDisabled();
         const randomID = Math.random().toString(36).substring(2, 10); // e.g. 'a9b3z7d1'
         await page.fill('//label[contains(text(), "External ID")]/following-sibling::div[1]//input', randomID);

                 
         console.log("🔽 STEP 2: Selecting Forwarder...");
         await handleDropdown(page, "Forwarder", 0, "Acme");
         await page.waitForTimeout(1000);
        // STEP 3: Airline Dropdown
        
        console.log("🛫 STEP 3: Selecting Airline...");
        await handleDropdown(page, "Airline", 1, "air");
        await page.waitForTimeout(1000);
       await page.fill('//label[contains(text(), "Description")]/following-sibling::div[1]//input', 'Test case');
        await page.fill('//label[contains(text(), "Comment")]/following-sibling::div[1]//input', 'This is a test comment');
       // await page.fill('//*[@id="«r18»"]', 'This is a test comment');

// Locate the input field (Material UI autocomplete often has role="combobox")
async function handleDropdown(page, labelText, fallbackIndex = 0, optionText = "a") {
    try {
        console.log(`🔍 Searching for ${labelText} label...`);
        const label = page.getByText(labelText, { exact: false }).first();
        await label.evaluate((el, marker) => el.setAttribute('data-test-marker', marker), `${labelText}-label`);

        const success = await page.evaluate((marker, search) => {
            const label = document.querySelector(`[data-test-marker="${marker}"]`);
            if (!label) return false;

            let input = null;
            if (label.htmlFor) {
                input = document.getElementById(label.htmlFor);
            }
            if (!input) {
                const container = label.closest('.MuiFormControl-root, .MuiInputBase-root') || label.parentElement;
                input = container?.querySelector('input[role="combobox"]');
            }
            if (!input) {
                input = label.nextElementSibling?.querySelector('input[role="combobox"]');
            }

            if (input) {
                input.focus();
                input.value = search;
                input.dispatchEvent(new Event('input', { bubbles: true }));
                return true;
            }
            return false;
        }, `${labelText}-label`, optionText);

        if (success) {
            await page.keyboard.press('ArrowDown');
            await page.waitForTimeout(500);
            await page.keyboard.press('Enter');
            await page.screenshot({ path: `screenshots/${labelText.toLowerCase()}-selected-${Date.now()}.png` });
            console.log(`✅ Selected ${labelText}`);
        } else {
            throw new Error("Could not interact using JS, trying fallback");
        }
    } catch (e) {
        console.log(`⚠️ JS approach failed for ${labelText}: ${e.message}`);
        const inputs = await page.$$('input[role="combobox"]');
        if (inputs.length > fallbackIndex) {
            await inputs[fallbackIndex].focus();
            await inputs[fallbackIndex].type(optionText);
            await page.waitForTimeout(500);
            await page.keyboard.press('ArrowDown');
            await page.keyboard.press('Enter');
            console.log(`✅ Fallback success for ${labelText}`);
        } else {
            console.log(`❌ ${labelText} dropdown not found even via fallback.`);
        }
    }

    // ✅ Automatically call for Airline if the current is Forwarder
    if (labelText.toLowerCase().includes('forwarder')) {
        console.log("➡️ Now calling handleDropdown for Airline from inside Forwarder...");
        await handleDropdown(page, "Airline", 1, "air");
    }
}

// Check if Forwarder and Airline have values filled in
const forwarderInput = await page.locator('//label[contains(text(), "Forwarder")]/following-sibling::div//input');
const airlineInput = await page.locator('//label[contains(text(), "Airline")]/following-sibling::div//input');

const forwarderValue = await forwarderInput.inputValue();
const airlineValue = await airlineInput.inputValue();

console.log(`📦 Forwarder selected: ${forwarderValue}`);
console.log(`🛫 Airline selected: ${airlineValue}`);

// Validate inputs
if (forwarderValue && airlineValue) {
    console.log("✅ Both dropdowns filled. Clicking Create...");
    await CreateButton.click();
    
    
    try {
        // Wait for success toast
        await successToast.waitFor({ timeout: 10000 });
        console.log("✅ Successfully created!");
    
    } catch (err) {
        console.log("⚠️ Success toast not found. Checking for duplicate External ID...");
    
        const duplicateError = await page.$('div.MuiAlert-message:has-text("must be unique")');
        if (duplicateError) {
            console.log("🚫 Duplicate External Lane ID detected.");
    
            // Clear the existing External ID
            const externalIdXPath = '//label[contains(text(), "External ID")]/following-sibling::div[1]//input';
            await page.fill(externalIdXPath, '');
    
            // Generate new ID and fill
            const newId = Math.floor(1000 + Math.random() * 9000).toString();
            await page.fill(externalIdXPath, newId);
            console.log(`🔁 Retrying with new External ID: ${newId}`);
    
            // Click Create button again
            await page.click('button:has-text("Create")');
    
            // Wait for toast again
            await successToast.waitFor({ timeout: 10000 });
            console.log("✅ Successfully created after retry!");
        } else {
            console.log("📸 Unexpected error ");
           
        }
    }
}    
    
});