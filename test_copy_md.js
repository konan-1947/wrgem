/**
 * Test parse HTML sang Markdown
 */

const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const TurndownService = require('turndown');
const fs = require('fs');
const path = require('path');
const os = require('os');

puppeteer.use(StealthPlugin());

async function testAIStudio() {
    console.log('→ Đang mở browser với stealth mode...');

    // Lấy thư mục session từ AppData
    const appDataPath = process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local');
    const userDataDir = path.join(appDataPath, 'rev-aistudio', 'chrome-session');

    console.log('→ User data directory:', userDataDir);

    if (!fs.existsSync(userDataDir)) {
        fs.mkdirSync(userDataDir, { recursive: true });
    }

    // Khởi động browser
    const browser = await puppeteer.launch({
        headless: false,
        userDataDir: userDataDir,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-blink-features=AutomationControlled',
            '--disable-features=IsolateOrigins,site-per-process'
        ],
        defaultViewport: {
            width: 1280,
            height: 800
        }
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

    console.log('→ Đang truy cập AI Studio...');
    await page.goto('https://aistudio.google.com/prompts/new_chat?model=gemini-2.5-pro', {
        waitUntil: 'networkidle2'
    });

    console.log('→ Toggle device mode để trigger UI...');
    const client = await page.target().createCDPSession();
    await client.send('Emulation.setDeviceMetricsOverride', {
        width: 375,
        height: 667,
        deviceScaleFactor: 2,
        mobile: true
    });
    await page.waitForTimeout(500);
    await client.send('Emulation.clearDeviceMetricsOverride');

    console.log('→ Đợi UI load...');
    try {
        await page.waitForSelector('textarea', { timeout: 10000 });
    } catch (e) {
        console.log('  ⚠️  Không thấy textarea, thử reload...');
        await page.reload({ waitUntil: 'networkidle2' });
        await page.waitForSelector('textarea', { timeout: 10000 });
    }
    await page.waitForTimeout(2000);

    console.log('✓ Trang AI Studio đã sẵn sàng!');
    console.log('✓ Gửi message và đợi response được parse thành markdown...\n');

    // Parse HTML sang markdown mỗi 2 giây
    let lastParsedCount = 0;
    const turndownService = new TurndownService({
        headingStyle: 'atx',
        codeBlockStyle: 'fenced'
    });

    setInterval(async () => {
        try {
            const result = await page.evaluate(() => {
                const containers = document.querySelectorAll('.chat-turn-container');

                if (containers.length <= 1) {
                    return { hasResponse: false, count: containers.length };
                }

                // Lấy container cuối (response mới nhất)
                const lastContainer = containers[containers.length - 1];
                const turnContent = lastContainer.querySelector('.turn-content');

                if (!turnContent) {
                    return { hasResponse: false, count: containers.length };
                }

                // Tìm ms-cmark-node (component chứa markdown đã render)
                const cmarkNode = turnContent.querySelector('ms-cmark-node');

                if (!cmarkNode) {
                    return { hasResponse: false, count: containers.length };
                }

                // Lấy innerHTML để parse
                return {
                    hasResponse: true,
                    count: containers.length,
                    html: cmarkNode.innerHTML,
                    textPreview: cmarkNode.textContent?.substring(0, 100)
                };
            });

            if (result.hasResponse && result.count > lastParsedCount) {
                lastParsedCount = result.count;

                // Convert HTML sang markdown
                const markdown = turndownService.turndown(result.html);

                console.log('\n========== MARKDOWN PARSED ==========');
                console.log('Text preview:', result.textPreview + '...');
                console.log('\n--- Markdown ---');
                console.log(markdown);
                console.log('\n====================================\n');
            }
        } catch (err) {
            // Skip errors during polling
        }
    }, 2000);

    console.log('Nhấn Ctrl+C để thoát.');
}

testAIStudio().catch(console.error);
