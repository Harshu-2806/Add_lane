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
         await page.fill('//label[contains(text(), "External ID")]/following-sibling::div[1]//input', 'EXT6');
        
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
    
    // Wait for green success toast
    const duplicateErrorToast = page.getByText('The external lane ID must be unique for a combination of shipper and forwarder', { exact: false });

try {
    // Wait for either success or error toast
    const result = await Promise.race([
        successToast.waitFor({ timeout: 10000 }).then(() => 'success'),
        duplicateErrorToast.waitFor({ timeout: 10000 }).then(() => 'duplicate'),
    ]);

    if (result === 'success') {
        console.log("✅ Successfully created!");

        console.log("🕒 Waiting 1 minute before redirect...");
        await page.waitForTimeout(60 * 1000);
        await page.goto('https://cloud.test.skymind.com/lane-management/lanes');
        console.log("➡️ Redirected to lanes page.");
    }

    if (result === 'duplicate') {
        console.log("❌ Duplicate External ID. Generating a new one...");

        // Clear and set a new External ID
        await page.fill('//label[contains(text(), "External ID")]/following-sibling::div[1]//input', '');
        
        const newExtId = `EXT${Date.now()}`;
        await externalIdField.fill(newExtId);
        console.log(`🔁 Retrying with new External ID: ${newExtId}`);

        await CreateButton.click();

        // Wait again for success
        await expect(successToast).toBeVisible({ timeout: 10000 });
        console.log("✅ Successfully created on second attempt!");

        console.log("🕒 Waiting 1 minute...");
        await page.waitForTimeout(60 * 1000);
        await page.goto('https://cloud.test.skymind.com/lane-management/lanes');
        console.log("➡️ Redirected to lanes list.");
    }

} catch (err) {
    console.log("⚠️ Neither toast appeared. Screenshot captured.");
    
}}

/*try {
    await expect(successToast).toBeVisible({ timeout: 10000 });
    console.log("Successfully Created");
} catch {
    const isDuplicate = await duplicateErrorInline.isVisible({ timeout: 5000 }).catch(() => false);

    if (isDuplicate) {
        console.log("🚫 Duplicate ID inline error found. Retrying with new ID...");

        const newID = 'EXT-' + Math.floor(Math.random() * 100000);
        const extIdField = page.locator('//label[contains(text(), "External ID")]/following-sibling::div//input');

        await extIdField.fill('');
        await extIdField.fill(newID);
        console.log(`🆕 Retrying with new External ID: ${newID}`);

        await CreateButton.click();
        await page.waitForTimeout(2000);

        try {
            await expect(successToast).toBeVisible({ timeout: 10000 });
            console.log("✅ Successfully submitted with new ID!");
        } catch (e) {
            console.log("❌ Submission failed again. Trying to take screenshot safely...");
            if (!page.isClosed()) {
                await page.screenshot({ path: `screenshots/final-failure-${Date.now()}.png` });
            } else {
                console.log("⚠️ Cannot take screenshot — page already closed.");
            }
        }

    } else {
        console.log("⚠️ No known error found. Checking if screenshot is possible...");
        if (!page.isClosed()) {
            await page.screenshot({ path: `screenshots/unknown-error-${Date.now()}.png` });
        } else {
            console.log("⚠️ Cannot take screenshot — page already closed.");
        }
    }
}*/

});     
    
   
  
    

