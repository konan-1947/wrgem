/**
 * Poe API Client - Thư viện gọi API Poe để chat với AI models
 * @author Your Name
 */

const WebSocket = require('ws');
const crypto = require('crypto');
const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

class PoeClient {
    constructor() {
        this.config = {
            cookies: null,
            formkey: null,
            tchannel: null,
            wsUrl: null,
            graphqlUrl: 'https://poe.com/api/gql_POST',
            tagId: null,
            revision: null
        };
        this.ws = null;
        this.messageListeners = new Map();
        this.browser = null;
        this.page = null;
    }

    /**
     * Khởi tạo client - Mở browser bằng Puppeteer, cho user đăng nhập, rồi auto-capture credentials
     * @param {Object} options - Cấu hình
     * @param {boolean} options.headless - Chạy browser ẩn hay không (mặc định: false - hiện browser)
     * @param {boolean} options.keepBrowserOpen - Giữ browser mở sau khi init (mặc định: false)
     * @param {string} options.userDataDir - Thư mục lưu profile browser (để giữ login)
     */
    async init_poe(options = {}) {
        const headless = options.headless || false;
        const keepBrowserOpen = options.keepBrowserOpen || false;
        const userDataDir = options.userDataDir || path.join(__dirname, '../.chrome-user-data');

        console.log('→ Đang mở browser...');

        // Tạo thư mục user data nếu chưa có
        if (!fs.existsSync(userDataDir)) {
            fs.mkdirSync(userDataDir, { recursive: true });
        }

        // Launch browser
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

        // Set user agent
        await this.page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

        // Navigate to Poe
        console.log('→ Đang truy cập Poe.com...');
        await this.page.goto('https://poe.com', { waitUntil: 'networkidle2' });

        // Kiểm tra xem đã đăng nhập chưa
        const isLoggedIn = await this._checkIfLoggedIn();

        if (!isLoggedIn) {
            console.log('\n⚠️  Vui lòng đăng nhập vào Poe trong browser đã mở!');
            console.log('   Nhấn Enter sau khi đăng nhập xong...');

            // Đợi user nhấn Enter
            await this._waitForEnter();

            // Kiểm tra lại sau khi user nhấn Enter
            const isLoggedInNow = await this._checkIfLoggedIn();
            if (!isLoggedInNow) {
                throw new Error('Chưa đăng nhập thành công. Vui lòng thử lại.');
            }
        }

        console.log('✓ Đã đăng nhập thành công!');

        // Capture credentials từ browser
        console.log('→ Đang capture credentials...');
        await this._captureCredentials();

        console.log('✓ Khởi tạo Poe Client thành công');
        console.log(`  - Channel: ${this.config.tchannel}`);
        console.log(`  - Formkey: ${this.config.formkey.substring(0, 20)}...`);

        // Đóng browser nếu không cần giữ mở
        if (!keepBrowserOpen && this.browser) {
            await this.browser.close();
            this.browser = null;
            this.page = null;
            console.log('✓ Đã đóng browser');
        } else {
            console.log('ℹ Browser vẫn đang mở (keepBrowserOpen = true)');
        }

        // Tự động lưu credentials vào file
        await this._saveCredentials();

        return true;
    }

    /**
     * Kiểm tra xem đã đăng nhập chưa
     * @private
     */
    async _checkIfLoggedIn() {
        try {
            // Đợi một chút để page load
            await this.page.waitForTimeout(2000);

            // Kiểm tra URL hoặc element đặc trưng của trang đã login
            const currentUrl = this.page.url();

            // Nếu URL có /login thì chưa đăng nhập
            if (currentUrl.includes('/login')) {
                return false;
            }

            // Kiểm tra xem có cookies p-b không (cookie chính của Poe khi đã login)
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
     * Capture credentials từ browser
     * @private
     */
    async _captureCredentials() {
        // 1. Lấy cookies
        const cookies = await this.page.cookies();
        const cookieString = cookies
            .map(c => `${c.name}=${c.value}`)
            .join('; ');
        this.config.cookies = cookieString;

        // 2. Lấy formkey, tag-id và revision bằng cách intercept request
        console.log('  Đang chờ credentials từ request...');

        // Tạo promise để đợi các credentials
        const credentialsPromise = new Promise((resolve) => {
            const credentials = {};
            this.page.on('request', (request) => {
                const headers = request.headers();

                // Lấy formkey
                if (headers['poe-formkey'] && !credentials.formkey) {
                    credentials.formkey = headers['poe-formkey'];
                }

                // Lấy tag-id
                if (headers['poe-tag-id'] && !credentials.tagId) {
                    credentials.tagId = headers['poe-tag-id'];
                }

                // Lấy revision
                if (headers['poe-revision'] && !credentials.revision) {
                    credentials.revision = headers['poe-revision'];
                }

                // Nếu đã có đủ 3 thông tin thì resolve
                if (credentials.formkey && credentials.tagId && credentials.revision) {
                    resolve(credentials);
                }
            });
        });

        // Trigger một request bằng cách reload trang hoặc click vào chat
        try {
            // Thử click vào một bot để trigger request
            await this.page.goto('https://poe.com/Claude-Opus-4.5', { waitUntil: 'networkidle2' });
        } catch (e) {
            // Ignore errors
        }

        // Đợi credentials (timeout 10s)
        const credentials = await Promise.race([
            credentialsPromise,
            new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Timeout: Không lấy được credentials')), 10000)
            )
        ]);

        this.config.formkey = credentials.formkey;
        this.config.tagId = credentials.tagId;
        this.config.revision = credentials.revision;

        // 3. Tự động tạo tchannel
        const randomStr = this._generateRandomString(16);
        const random1 = Math.floor(Math.random() * 999) + 100;
        const random2 = Math.floor(Math.random() * 9000) + 1000;
        this.config.tchannel = `poe-chan${random1}-${random2}-${randomStr}`;

        console.log('✓ Đã capture credentials thành công');
    }

    /**
     * Lưu credentials vào file
     * @private
     */
    async _saveCredentials() {
        const credentialsPath = path.join(__dirname, 'poe-credentials.json');
        const data = {
            cookies: this.config.cookies,
            formkey: this.config.formkey,
            tchannel: this.config.tchannel,
            tagId: this.config.tagId,
            revision: this.config.revision,
            savedAt: new Date().toISOString()
        };

        fs.writeFileSync(credentialsPath, JSON.stringify(data, null, 2));
        console.log(`✓ Đã lưu credentials vào ${credentialsPath}`);
    }

    /**
     * Load credentials từ file
     * @private
     */
    async _loadCredentials() {
        const credentialsPath = path.join(__dirname, 'poe-credentials.json');

        if (!fs.existsSync(credentialsPath)) {
            throw new Error('File credentials không tồn tại. Vui lòng chạy init_poe() trước.');
        }

        const data = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));

        this.config.cookies = data.cookies;
        this.config.formkey = data.formkey;
        this.config.tchannel = data.tchannel;
        this.config.tagId = data.tagId;
        this.config.revision = data.revision;

        console.log('✓ Đã load credentials từ file');
        console.log(`  - Saved at: ${data.savedAt}`);
        console.log(`  - Channel: ${this.config.tchannel}`);
        console.log(`  - Formkey: ${this.config.formkey.substring(0, 20)}...`);
    }

    /**
     * Khởi tạo client từ credentials đã lưu (không cần mở browser)
     * Sử dụng sau khi đã chạy init_poe() ít nhất 1 lần
     */
    async initFromFile() {
        console.log('→ Đang load credentials từ file...');
        await this._loadCredentials();
        console.log('✓ Khởi tạo Poe Client từ file thành công');
        return true;
    }
    /**
     * Gửi message đến model và nhận response
     * @param {string} message - Nội dung message
     * @param {string} bot - Tên bot (mặc định: Claude-Opus-4.5)
     * @param {Object} options - Tùy chọn
     * @param {Function} options.onUpdate - Callback khi có text update (streaming)
     * @param {Function} options.onComplete - Callback khi nhận response hoàn chỉnh
     * @returns {Promise<string>} - Text response đầy đủ
     */
    async request_poe(message, bot = 'Claude-Opus-4.5', options = {}) {
        if (!this.config.cookies || !this.config.formkey) {
            throw new Error('Chưa khởi tạo client. Vui lòng gọi init_poe() trước.');
        }

        const clientNonce = this._generateRandomString(16);
        const chatNonce = this._generateRandomString(16);
        const sdid = crypto.randomUUID();

        // 1. Gửi message qua GraphQL
        console.log(`\n→ Đang gửi message đến ${bot}...`);
        const sendResult = await this._sendMessage({
            message,
            bot,
            clientNonce,
            chatNonce,
            sdid
        });

        if (!sendResult.success) {
            throw new Error(`Lỗi gửi message: ${sendResult.error}`);
        }

        const { chatId, messageId, jobId } = sendResult.data;
        console.log(`✓ Đã gửi message (chatId: ${chatId}, messageId: ${messageId})`);

        // 2. Kết nối WebSocket và nhận streaming response
        console.log('→ Đang kết nối WebSocket để nhận response...');
        const response = await this._receiveStreamingResponse(chatId, messageId, jobId, options);

        console.log('✓ Đã nhận response hoàn chỉnh\n');
        return response;
    }

    /**
     * Gửi message qua GraphQL API
     * @private
     */
    async _sendMessage({ message, bot, clientNonce, chatNonce, sdid }) {
        const payload = {
            queryName: 'sendMessageMutation',
            variables: {
                chatId: null,
                bot: bot,
                query: message,
                source: {
                    sourceType: 'chat_input',
                    chatInputMetadata: {
                        useVoiceRecord: false
                    }
                },
                clientNonce: clientNonce,
                sdid: sdid,
                attachments: [],
                chatNonce: chatNonce,
                existingMessageAttachmentsIds: [],
                shouldFetchChat: true,
                referencedMessageId: null,
                parameters: null,
                fileHashJwts: []
            },
            extensions: {
                hash: 'f95f047271a7c0dc68454cf6df8dc24de0746ac2257fcd20e78f3b45fa929dca'
            }
        };

        // Generate tag-id mới cho request này (MD5 random string)
        const crypto = require('crypto');
        const tagId = crypto.createHash('md5').update(Math.random().toString()).digest('hex');

        try {
            const response = await fetch(this.config.graphqlUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'poe-queryname': 'sendMessageMutation',
                    'poegraphql': '1',
                    'poe-tchannel': this.config.tchannel,
                    'poe-formkey': this.config.formkey,
                    'poe-tag-id': tagId,
                    'poe-revision': this.config.revision,
                    'cookie': this.config.cookies,
                    'accept': '*/*',
                    'origin': 'https://poe.com',
                    'referer': `https://poe.com/${bot}`,
                    'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                return {
                    success: false,
                    error: `HTTP ${response.status}: ${response.statusText}`
                };
            }

            const data = await response.json();

            // Parse response để lấy chatId, messageId, jobId
            const chat = data.data?.messageEdgeCreate?.chat;
            const job = data.data?.messageEdgeCreate?.job;
            const userMessage = data.data?.messageEdgeCreate?.message;

            if (!chat || !job) {
                return {
                    success: false,
                    error: 'Không nhận được chatId hoặc jobId từ response'
                };
            }

            return {
                success: true,
                data: {
                    chatId: chat.chatId,
                    chatCode: chat.chatCode,
                    messageId: userMessage.node.messageId,
                    jobId: job.jobId
                }
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Nhận streaming response qua WebSocket
     * @private
     */
    async _receiveStreamingResponse(chatId, messageId, jobId, options = {}) {
        return new Promise((resolve, reject) => {
            // Tạo WebSocket URL
            const minSeq = Math.floor(Date.now() * 1000); // Timestamp in microseconds
            const hash = Math.floor(Math.random() * 1e19); // Random hash
            const wsUrl = `wss://tch917001.tch.poe.com/up/chan109-8888/updates?min_seq=${minSeq}&channel=${this.config.tchannel}&hash=${hash}&generation=1`;

            console.log('  URL:', wsUrl.substring(0, 80) + '...');

            this.ws = new WebSocket(wsUrl, {
                headers: {
                    'Cookie': this.config.cookies,
                    'Origin': 'https://poe.com',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Accept-Language': 'en-US,en;q=0.9',
                    'Cache-Control': 'no-cache',
                    'Pragma': 'no-cache'
                },
                // Tăng timeout và thử với protocol
                handshakeTimeout: 10000
            });

            let fullText = '';
            let isComplete = false;
            let hasReceivedData = false;
            const timeout = setTimeout(() => {
                if (!hasReceivedData) {
                    this.ws?.close();
                    reject(new Error('Timeout: Không nhận được response sau 60s'));
                }
            }, 60000);

            this.ws.on('open', () => {
                console.log('✓ WebSocket connected');
                // Gửi ping để giữ kết nối
                this.ws.send(JSON.stringify({ type: 'ping' }));
            });

            this.ws.on('message', (data) => {
                try {
                    const message = JSON.parse(data.toString());

                    // Xử lý pong
                    if (message.type === 'pong') {
                        return;
                    }

                    // Parse nested JSON trong messages array
                    if (message.messages && Array.isArray(message.messages)) {
                        for (const msgStr of message.messages) {
                            const msg = JSON.parse(msgStr);

                            if (msg.message_type === 'subscriptionUpdate') {
                                const payload = msg.payload;

                                // Kiểm tra messageAdded subscription
                                if (payload.subscription_name === 'messageAdded') {
                                    const messageData = payload.data?.messageAdded;

                                    if (messageData && messageData.author !== 'human') {
                                        hasReceivedData = true;
                                        const text = messageData.text || '';
                                        const state = messageData.state;

                                        // Update text
                                        if (text !== fullText) {
                                            fullText = text;

                                            // Callback cho streaming update
                                            if (options.onUpdate && typeof options.onUpdate === 'function') {
                                                options.onUpdate(text);
                                            } else {
                                                // Mặc định in ra console
                                                process.stdout.write(`\r← ${text}`);
                                            }
                                        }

                                        // Kiểm tra complete
                                        if (state === 'complete') {
                                            isComplete = true;
                                            clearTimeout(timeout);
                                            this.ws.close();

                                            if (options.onComplete && typeof options.onComplete === 'function') {
                                                options.onComplete(fullText);
                                            }

                                            resolve(fullText);
                                        }
                                    }
                                }
                            }
                        }
                    }
                } catch (error) {
                    console.error('Lỗi parse WebSocket message:', error.message);
                }
            });

            this.ws.on('error', (error) => {
                clearTimeout(timeout);
                console.error('WebSocket error:', error.message);
                reject(error);
            });

            this.ws.on('close', () => {
                clearTimeout(timeout);
                if (!isComplete && hasReceivedData) {
                    // Nếu đã nhận data nhưng chưa complete thì trả về text hiện tại
                    resolve(fullText);
                } else if (!hasReceivedData) {
                    reject(new Error('WebSocket closed trước khi nhận được data'));
                }
            });
        });
    }

    /**
     * Generate random string
     * @private
     */
    _generateRandomString(length) {
        const chars = 'abcdefghijklmnopqrstuvwxyz';
        let result = '';
        for (let i = 0; i < length; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    }

    /**
     * Đóng kết nối WebSocket và browser
     */
    async close() {
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
        if (this.browser) {
            await this.browser.close();
            this.browser = null;
            this.page = null;
            console.log('✓ Đã đóng browser');
        }
    }
}

module.exports = PoeClient;
