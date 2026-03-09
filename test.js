const { chromium } = require('playwright');
const path = require('path');

async function testSchoolGuard() {
    console.log('Starting SchoolGuard test...');
    
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    
    // Collect console messages
    const consoleMessages = [];
    const consoleErrors = [];
    
    page.on('console', msg => {
        consoleMessages.push(`[${msg.type()}] ${msg.text()}`);
        if (msg.type() === 'error') {
            consoleErrors.push(msg.text());
        }
    });
    
    page.on('pageerror', error => {
        consoleErrors.push(`Page error: ${error.message}`);
    });
    
    try {
        // Load the page from src/index.html
        const filePath = path.join(__dirname, 'src', 'index.html');
        await page.goto(`file://${filePath}`, { waitUntil: 'networkidle' });
        
        console.log('Page loaded successfully');
        
        // Wait for content to render
        await page.waitForSelector('.sidebar', { timeout: 5000 });
        console.log('Sidebar rendered');
        
        // Check if stats are visible
        await page.waitForSelector('.stat-card', { timeout: 5000 });
        console.log('Stats cards rendered');
        
        // Check table exists
        const tableExists = await page.locator('.data-table').isVisible();
        console.log(`Table visible: ${tableExists}`);
        
        // Test navigation
        await page.click('[data-page="register"]');
        await page.waitForTimeout(500);
        const registerVisible = await page.locator('#registerSection').isVisible();
        console.log(`Register section visible: ${registerVisible}`);
        
        // Go back to dashboard
        await page.click('[data-page="dashboard"]');
        await page.waitForTimeout(500);
        
        // Test modal
        await page.click('button:has-text("Nueva Visita")');
        await page.waitForTimeout(300);
        const modalVisible = await page.locator('#registerModal').isVisible();
        console.log(`Modal visible: ${modalVisible}`);
        
        // Close modal
        await page.click('.modal-close');
        await page.waitForTimeout(300);
        
        // Print console messages
        console.log('\n--- Console Messages ---');
        consoleMessages.forEach(msg => console.log(msg));
        
        // Check for errors
        if (consoleErrors.length > 0) {
            console.log('\n--- Console Errors ---');
            consoleErrors.forEach(err => console.log(`ERROR: ${err}`));
            process.exit(1);
        } else {
            console.log('\n✓ No console errors detected');
        }
        
        console.log('\n✓ All tests passed!');
        
    } catch (error) {
        console.error('Test failed:', error.message);
        process.exit(1);
    } finally {
        await browser.close();
    }
}

testSchoolGuard();
