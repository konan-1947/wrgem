/**
 * Poe API Client V2 - Dùng Puppeteer CDP để intercept WebSocket
 */

const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

class PoeClientV2 {
    constructor() {
        this.browser = null;
        this.page = null;
        this.cdpSession = null;
        this.wsFrameListeners = new Map();
        this.currentBot = null;
    }

    /**
     * Khởi tạo client - Lần đầu tiên (cần login)
     */
    async init_poe(options = {}) {
        const headless = options.headless !== undefined ? options.headless : false;
        const userDataDir = options.userDataDir || path.join(__dirname, '../.chrome-user-data');

        console.log('→ Đang mở browser...');

        if (!fs.existsSync(userDataDir)) {
            fs.mkdirSync(userDataDir, { recursive: true });
        }

        this.browser = await puppeteer.launch({
            headless: headless,
            userDataDir: userDataDir,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-blink-features=AutomationControlled'
            ],
            defaultViewport: {
                width: 1280,
                height: 800
            }
        });

        this.page = await this.browser.newPage();
        await this.page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

        console.log('→ Đang truy cập Poe.com...');
        await this.page.goto('https://poe.com', { waitUntil: 'networkidle2' });

        const isLoggedIn = await this._checkIfLoggedIn();

        if (!isLoggedIn) {
            console.log('\n⚠️  Vui lòng đăng nhập vào Poe trong browser!');
            console.log('   Nhấn Enter sau khi đăng nhập xong...');
            await this._waitForEnter();

            const isLoggedInNow = await this._checkIfLoggedIn();
            if (!isLoggedInNow) {
                throw new Error('Chưa đăng nhập thành công');
            }
        }

        console.log('✓ Đã đăng nhập thành công!');

        // Setup CDP để intercept WebSocket
        await this._setupCDP();

        console.log('✓ Khởi tạo Poe Client V2 thành công');
        return true;
    }

    /**
     * Khởi tạo từ session đã lưu (headless mode)
     */
    async initFromFile(options = {}) {
        const headless = options.headless !== undefined ? options.headless : true;
        const userDataDir = options.userDataDir || path.join(__dirname, '../.chrome-user-data');

        if (!fs.existsSync(userDataDir)) {
            throw new Error('Chưa có user data. Vui lòng chạy init_poe() trước.');
        }

        console.log('→ Đang mở browser (headless)...');

        this.browser = await puppeteer.launch({
            headless: headless,
            userDataDir: userDataDir,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-blink-features=AutomationControlled'
            ],
            defaultViewport: {
                width: 1280,
                height: 800
            }
        });

        this.page = await this.browser.newPage();
        await this.page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

        console.log('→ Đang truy cập Poe.com...');
        await this.page.goto('https://poe.com', { waitUntil: 'networkidle2' });

        const isLoggedIn = await this._checkIfLoggedIn();
        if (!isLoggedIn) {
            throw new Error('Session đã hết hạn. Vui lòng chạy lại init_poe()');
        }

        await this._setupCDP();

        console.log('✓ Khởi tạo từ session thành công (headless mode)');
        return true;
    }

    /**
     * Setup Chrome DevTools Protocol để intercept WebSocket
     * @private
     */
    async _setupCDP() {
        console.log('→ Đang setup CDP để intercept WebSocket...');

        const client = await this.page.target().createCDPSession();
        this.cdpSession = client;

        // Enable network tracking
        await client.send('Network.enable');

        // Listen cho WebSocket frames
        client.on('Network.webSocketFrameReceived', (params) => {
            const frame = params.response;
            try {
                const data = JSON.parse(frame.payloadData);

                // Trigger listeners
                this.wsFrameListeners.forEach((listener) => {
                    listener(data);
                });
            } catch (e) {
                // Ignore parse errors
            }
        });

        console.log('✓ CDP setup thành công');
    }

    /**
     * Gửi message và nhận response
     */
    async request_poe(message, bot = 'Claude-Opus-4.5', options = {}) {
        console.log(`\n→ Đang gửi message đến ${bot}...`);

        // Navigate to bot page
        await this.page.goto(`https://poe.com/${bot}`, { waitUntil: 'networkidle2' });
        this.currentBot = bot;

        // Đợi textarea load
        await this.page.waitForSelector('textarea', { timeout: 10000 });

        // Clear và type message
        const textarea = await this.page.$('textarea');
        await textarea.click({ clickCount: 3 }); // Select all
        await textarea.type(message);

        // Setup listener cho response
        let fullText = '';
        let isComplete = false;
        const responsePromise = new Promise((resolve) => {
            const listenerId = Date.now();

            this.wsFrameListeners.set(listenerId, (data) => {
                // Parse nested messages
                if (data.messages && Array.isArray(data.messages)) {
                    data.messages.forEach(msgStr => {
                        try {
                            const msg = JSON.parse(msgStr);

                            if (msg.message_type === 'subscriptionUpdate') {
                                const payload = msg.payload;

                                if (payload?.subscription_name === 'messageAdded') {
                                    const messageData = payload.data?.messageAdded;

                                    if (messageData && messageData.author !== 'human') {
                                        const text = messageData.text || '';
                                        const state = messageData.state;

                                        if (text !== fullText) {
                                            fullText = text;

                                            if (options.onUpdate && typeof options.onUpdate === 'function') {
                                                options.onUpdate(text);
                                            } else {
                                                process.stdout.write(`\r← ${text.substring(0, 100)}...`);
                                            }
                                        }

                                        if (state === 'complete') {
                                            isComplete = true;
                                            this.wsFrameListeners.delete(listenerId);

                                            if (options.onComplete && typeof options.onComplete === 'function') {
                                                options.onComplete(fullText);
                                            }

                                            resolve(fullText);
                                        }
                                    }
                                }
                            }
                        } catch (e) {
                            // Ignore
                        }
                    });
                }
            });
        });

        // Nhấn Enter để gửi (hoặc click button)
        await this.page.keyboard.press('Enter');
        console.log('✓ Đã gửi message');

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
     * Kiểm tra đã đăng nhập chưa
     * @private
     */
    async _checkIfLoggedIn() {
        try {
            await this.page.waitForTimeout(2000);
            const currentUrl = this.page.url();

            if (currentUrl.includes('/login')) {
                return false;
            }

            const cookies = await this.page.cookies();
            const hasAuthCookie = cookies.some(c => c.name === 'p-b' && c.value);

            return hasAuthCookie;
        } catch (error) {
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
            this.cdpSession = null;
            console.log('✓ Đã đóng browser');
        }
    }
}

module.exports = PoeClientV2;
