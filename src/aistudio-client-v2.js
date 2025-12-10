/**
 * AI Studio Client V2 - Dùng Puppeteer với Stealth plugin
 */

const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const path = require('path');
const fs = require('fs');
const os = require('os');

// Add stealth plugin để bypass detection
puppeteer.use(StealthPlugin());

// Default user data directory trong AppData
const getDefaultUserDataDir = () => {
    const appDataPath = process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local');
    return path.join(appDataPath, 'rev-aistudio', 'chrome-session');
};

class AIStudioClientV2 {
    constructor() {
        this.browser = null;
        this.page = null;
    }

    /**
     * Khởi tạo client - Lần đầu tiên (cần login)
     */
    async init_aistudio(options = {}) {
        const headless = options.headless !== undefined ? options.headless : false;
        const userDataDir = options.userDataDir || getDefaultUserDataDir();

        console.log('→ Đang mở browser với stealth mode...');

        if (!fs.existsSync(userDataDir)) {
            fs.mkdirSync(userDataDir, { recursive: true });
        }

        this.browser = await puppeteer.launch({
            headless: headless,
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

        this.page = await this.browser.newPage();
        await this.page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

        console.log('→ Đang truy cập AI Studio...');
        await this.page.goto('https://aistudio.google.com/prompts/new_chat?model=gemini-2.5-pro', { waitUntil: 'networkidle2' });

        console.log('→ Toggle device mode để trigger UI...');
        // Trick: Toggle device emulation để force AI Studio re-render UI
        const client = await this.page.target().createCDPSession();
        await client.send('Emulation.setDeviceMetricsOverride', {
            width: 375,
            height: 667,
            deviceScaleFactor: 2,
            mobile: true
        });
        await this.page.waitForTimeout(500);
        await client.send('Emulation.clearDeviceMetricsOverride');

        // Đợi textarea load xong
        console.log('→ Đợi UI load...');
        try {
            await this.page.waitForSelector('textarea', { timeout: 10000 });
        } catch (e) {
            console.log('  ⚠️  Không thấy textarea, thử reload...');
            await this.page.reload({ waitUntil: 'networkidle2' });
            await this.page.waitForSelector('textarea', { timeout: 10000 });
        }
        await this.page.waitForTimeout(2000);

        const isLoggedIn = await this._checkIfLoggedIn();

        if (!isLoggedIn) {
            console.log('\n⚠️  Vui lòng đăng nhập vào Google AI Studio trong browser!');
            console.log('   Nhấn Enter sau khi đăng nhập xong...');
            await this._waitForEnter();

            const isLoggedInNow = await this._checkIfLoggedIn();
            if (!isLoggedInNow) {
                throw new Error('Chưa đăng nhập thành công');
            }
        }

        console.log('✓ Đã đăng nhập thành công!');
        console.log('✓ Khởi tạo AI Studio Client V2 thành công');
        return true;
    }

    /**
     * Khởi tạo từ session đã lưu (headless mode)
     */
    async initFromFile(options = {}) {
        const headless = options.headless !== undefined ? options.headless : true;
        const userDataDir = options.userDataDir || getDefaultUserDataDir();

        if (!fs.existsSync(userDataDir)) {
            throw new Error('Chưa có user data. Vui lòng chạy init_aistudio() trước.');
        }

        console.log('→ Đang mở browser (headless)...');

        this.browser = await puppeteer.launch({
            headless: headless,
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

        this.page = await this.browser.newPage();
        await this.page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

        console.log('→ Đang truy cập AI Studio...');
        await this.page.goto('https://aistudio.google.com/prompts/new_chat?model=gemini-2.5-pro', { waitUntil: 'networkidle2' });

        // Toggle device mode
        const client = await this.page.target().createCDPSession();
        await client.send('Emulation.setDeviceMetricsOverride', {
            width: 375,
            height: 667,
            deviceScaleFactor: 2,
            mobile: true
        });
        await this.page.waitForTimeout(500);
        await client.send('Emulation.clearDeviceMetricsOverride');

        // Đợi UI load
        try {
            await this.page.waitForSelector('textarea', { timeout: 10000 });
        } catch (e) {
            await this.page.reload({ waitUntil: 'networkidle2' });
            await this.page.waitForSelector('textarea', { timeout: 10000 });
        }
        await this.page.waitForTimeout(2000);

        const isLoggedIn = await this._checkIfLoggedIn();
        if (!isLoggedIn) {
            throw new Error('Session đã hết hạn. Vui lòng chạy lại init_aistudio()');
        }

        console.log('✓ Khởi tạo từ session thành công (headless mode)');
        return true;
    }

    /**
     * Gửi message và nhận response
     */
    async request_aistudio(message, options = {}) {
        console.log('\n→ Đang gửi message...');

        // Tìm textarea - dùng selector đơn giản
        const textareaSelectors = [
            'textarea[placeholder*="Enter"]',
            'textarea',
            '[contenteditable="true"]'
        ];

        let textarea = null;
        for (const selector of textareaSelectors) {
            textarea = await this.page.$(selector);
            if (textarea) {
                console.log(`  ✓ Tìm thấy input: ${selector}`);
                break;
            }
        }

        if (!textarea) {
            throw new Error('Không tìm thấy textarea để nhập message');
        }

        // Clear và nhập message
        await textarea.click({ clickCount: 3 });
        await textarea.type(message, { delay: 10 });

        // Đợi response container xuất hiện
        const responsePromise = this._waitForResponse(message, options);

        // Gửi message bằng Ctrl+Enter
        console.log('→ Nhấn Ctrl+Enter để gửi...');
        await this.page.keyboard.down('Control');
        await this.page.keyboard.press('Enter');
        await this.page.keyboard.up('Control');

        console.log('✓ Đã gửi message');
        console.log('→ Đang đợi response...');

        // Đợi response với timeout
        const response = await Promise.race([
            responsePromise,
            new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Timeout: Không nhận được response sau 60s')), 60000)
            )
        ]);

        console.log('\n✓ Đã nhận response hoàn chỉnh');
        return response;
    }

    /**
     * Đợi và lấy response từ AI Studio
     * @private
     */
    async _waitForResponse(message, options = {}) {
        return new Promise(async (resolve) => {
            let previousText = '';
            let noChangeCount = 0;
            const maxNoChange = 10;

            const checkInterval = setInterval(async () => {
                try {
                    // Lấy toàn bộ body text và parse
                    const bodyText = await this.page.evaluate(() => document.body.innerText);

                    // Tìm text sau message của user
                    const parts = bodyText.split(message);
                    let currentText = '';

                    if (parts.length > 1) {
                        // Lấy phần sau message user
                        currentText = parts[parts.length - 1].trim();

                        // Remove các phần UI không cần
                        currentText = currentText.replace(/^Run\s*Ctrl\+Enter.*/, '').trim();
                    }

                    if (currentText && currentText !== previousText && currentText.length > 10) {
                        previousText = currentText;
                        noChangeCount = 0;

                        if (options.onUpdate && typeof options.onUpdate === 'function') {
                            options.onUpdate(currentText);
                        } else {
                            process.stdout.write(`\r← ${currentText.substring(0, 100)}...`);
                        }
                    } else if (currentText) {
                        noChangeCount++;

                        if (noChangeCount >= maxNoChange) {
                            clearInterval(checkInterval);

                            if (options.onComplete && typeof options.onComplete === 'function') {
                                options.onComplete(currentText);
                            }

                            resolve(currentText);
                        }
                    }
                } catch (error) {
                    // Ignore errors during polling
                }
            }, 500);
        });
    }

    /**
     * Kiểm tra đã đăng nhập chưa
     * @private
     */
    async _checkIfLoggedIn() {
        try {
            console.log('  → Check login...');
            await this.page.waitForTimeout(3000);

            const currentUrl = this.page.url();
            console.log('  → URL:', currentUrl);

            if (currentUrl.includes('accounts.google.com')) {
                console.log('  → Đang ở trang login');
                return false;
            }

            // Thử nhiều selector
            const selectors = [
                'textarea[placeholder*="Enter"]',
                'textarea',
                '[contenteditable="true"]'
            ];

            for (const sel of selectors) {
                const el = await this.page.$(sel);
                if (el) {
                    console.log(`  ✓ Tìm thấy: ${sel}`);
                    return true;
                }
            }

            // Fallback: check URL
            if (currentUrl.includes('aistudio.google.com/app')) {
                console.log('  ✓ URL hợp lệ');
                return true;
            }

            console.log('  ✗ Không detect được');
            return false;
        } catch (error) {
            console.log('  ✗ Lỗi:', error.message);
            return false;
        }
    }

    /**
     * Đợi user nhấn Enter
     * @private
     */
    async _waitForEnter() {
        return new Promise((resolve) => {
            process.stdin.once('data', () => {
                resolve();
            });
        });
    }

    /**
     * Đóng browser
     */
    async close() {
        if (this.browser) {
            await this.browser.close();
            this.browser = null;
            this.page = null;
            console.log('✓ Đã đóng browser');
        }
    }
}

module.exports = AIStudioClientV2;
