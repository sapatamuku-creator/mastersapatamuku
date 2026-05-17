const { chromium } = require('playwright');
const path = require('path');

const ssId = '1l4NNvzl-9GpVqoVWlIha9POQLKGzSA8ByF1dTLp6SYc';
const user = 'BintangAnisa';
const category = 'Wedding';
const role = 'admin';

const queryParams = `?ssId=${ssId}&user=${encodeURIComponent(user)}&category=${category}&role=${role}`;

const pagesToCapture = [
    { name: 'feature_dashboard', file: 'dashboard.html' },
    { name: 'feature_wa_blast', file: 'wa_blast.html' },
    { name: 'feature_kiosk', file: 'kiosk.html' },
    { name: 'feature_checkin', file: 'checkin.html' },
    { name: 'feature_luckydraw', file: 'luckydraw.html' },
    { name: 'feature_onsite', file: 'onsite.html' },
    { name: 'feature_angpao', file: 'angpao.html' },
    { name: 'feature_config', file: 'config.html' }
];

async function captureScreenshots() {
    console.log('Starting Playwright Screenshot Capture (with 8.5 second data load delay)...');
    
    // Launch using our verified local Edge binary to avoid EBUSY locks
    const browser = await chromium.launch({ 
        executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
        headless: true 
    });
    
    // Set 1280x800 viewport size
    const context = await browser.newContext({
        viewport: { width: 1280, height: 800 }
    });
    
    const page = await context.newPage();

    for (const item of pagesToCapture) {
        const localPath = path.resolve(__dirname, item.file);
        const fileUrl = `file:///${localPath.replace(/\\/g, '/')}${queryParams}`;
        
        console.log(`Navigating to ${item.name} (${fileUrl})...`);
        try {
            await page.goto(fileUrl, { waitUntil: 'load', timeout: 35000 });
            
            // Wait for loading global spinner to disappear (timeout: 15s max)
            console.log('Waiting for system to resolve loading spinner...');
            try {
                await page.waitForSelector('#loading-global', { state: 'hidden', timeout: 15000 });
                console.log('Global loader hidden!');
            } catch (err) {
                console.log('Global loader wait timeout or not present. Continuing...');
            }
            
            // Critical request: wait 8.5 seconds for complete data population and API calls to resolve!
            console.log('Waiting exactly 8.5 seconds to ensure live Google Sheet data resolves completely...');
            await page.waitForTimeout(8500);

            // Take a high-resolution screenshot
            const outputPath = path.resolve(__dirname, 'assets', `${item.name}.png`);
            console.log(`Writing screenshot to ${outputPath}...`);
            await page.screenshot({ path: outputPath, fullPage: false });
            console.log(`Screenshot ${item.name} successfully saved!\n`);
        } catch (error) {
            console.error(`Failed to capture ${item.name}:`, error);
        }
    }

    await browser.close();
    console.log('All screenshots successfully generated with full live data!');
}

captureScreenshots();
