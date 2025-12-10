const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

class PoeRequestCapture {
    constructor() {
        this.capturedDir = path.join(__dirname, '..', 'captured');
        this.requests = [];
        this.responses = [];
        this.wsMessages = [];
        this.browser = null;
        this.page = null;

        // Tạo thư mục captured nếu chưa tồn tại
        if (!fs.existsSync(this.capturedDir)) {
            fs.mkdirSync(this.capturedDir, { recursive: true });
        }
    }

    async setupWebSocketInterception() {
        // Sử dụng CDP (Chrome DevTools Protocol) để intercept WebSocket
        const client = await this.page.target().createCDPSession();

        // Enable Network domain
        await client.send('Network.enable');

        // WebSocket frame tracking
        const wsConnections = new Map();

        // Intercept WebSocket handshake
        client.on('Network.webSocketCreated', ({ requestId, url }) => {
            console.log(`[WS CREATED] ${url}`);
            wsConnections.set(requestId, { url, frames: [] });
        });

        // Intercept WebSocket frames sent
        client.on('Network.webSocketFrameSent', ({ requestId, timestamp, response }) => {
            const conn = wsConnections.get(requestId);
            if (conn) {
                const frameData = {
                    timestamp: new Date(timestamp * 1000).toISOString(),
                    type: 'sent',
                    data: response.payloadData,
                    url: conn.url,
                    opcode: response.opcode
                };

                this.wsMessages.push(frameData);

                // Log nếu không phải ping
                try {
                    const parsed = JSON.parse(response.payloadData);
                    if (parsed.type !== 'ping') {
                        console.log(`[WS SENT] ${response.payloadData.substring(0, 100)}`);
                    }
                } catch (e) {
                    // Không phải JSON
                }
            }
        });

        // Intercept WebSocket frames received - QUAN TRỌNG NHẤT
        client.on('Network.webSocketFrameReceived', ({ requestId, timestamp, response }) => {
            const conn = wsConnections.get(requestId);
            if (conn) {
                const frameData = {
                    timestamp: new Date(timestamp * 1000).toISOString(),
                    type: 'received',
                    data: response.payloadData,
                    url: conn.url,
                    opcode: response.opcode
                };

                this.wsMessages.push(frameData);

                // Log preview cho received messages
                const preview = response.payloadData.substring(0, 150);
                console.log(`[WS RECEIVED] ${preview}...`);

                // Nếu chứa dữ liệu quan trọng, log thêm
                try {
                    const parsed = JSON.parse(response.payloadData);
                    if (parsed.messages || parsed.message_added || parsed.text || parsed.payload) {
                        console.log(`[WS IMPORTANT] Message contains response data!`);
                    }
                } catch (e) {
                    // Không phải JSON hoặc lỗi parse
                }
            }
        });

        // WebSocket closed
        client.on('Network.webSocketClosed', ({ requestId, timestamp }) => {
            const conn = wsConnections.get(requestId);
            if (conn) {
                console.log(`[WS CLOSED] ${conn.url}`);
                wsConnections.delete(requestId);
            }
        });

        console.log('[INFO] CDP WebSocket interception enabled');
    }

    async launch() {
        console.log('[INFO] Đang khởi động browser...');

        this.browser = await puppeteer.launch({
            headless: false,
            defaultViewport: null,
            args: [
                '--start-maximized',
                '--disable-blink-features=AutomationControlled'
            ]
        });

        this.page = await this.browser.newPage();

        // Thiết lập WebSocket interception
        await this.setupWebSocketInterception();

        // Thiết lập User-Agent thật
        await this.page.setUserAgent(
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        );

        // Bật request interception
        await this.page.setRequestInterception(true);

        // Capture tất cả requests
        this.page.on('request', (request) => {
            const requestData = {
                timestamp: new Date().toISOString(),
                url: request.url(),
                method: request.method(),
                headers: request.headers(),
                postData: request.postData(),
                resourceType: request.resourceType()
            };

            this.requests.push(requestData);

            // Log request quan trọng (API calls)
            if (request.url().includes('poe.com') &&
                (request.resourceType() === 'xhr' || request.resourceType() === 'fetch')) {
                console.log(`[REQUEST] ${request.method()} ${request.url()}`);

                if (request.postData()) {
                    const postDataPreview = request.postData().substring(0, 200);
                    console.log(`[POST DATA] ${postDataPreview}...`);
                }
            }

            request.continue();
        });

        // Capture tất cả responses
        this.page.on('response', async (response) => {
            const responseData = {
                timestamp: new Date().toISOString(),
                url: response.url(),
                status: response.status(),
                headers: response.headers(),
                resourceType: response.request().resourceType()
            };

            // Chỉ lấy body cho các API calls
            if (response.url().includes('poe.com') &&
                (response.request().resourceType() === 'xhr' ||
                    response.request().resourceType() === 'fetch')) {

                try {
                    const contentType = response.headers()['content-type'] || '';

                    if (contentType.includes('application/json')) {
                        responseData.body = await response.json();
                    } else if (contentType.includes('text')) {
                        responseData.body = await response.text();
                    }

                    console.log(`[RESPONSE] ${response.status()} ${response.url()}`);
                } catch (err) {
                    responseData.bodyError = err.message;
                }
            }

            this.responses.push(responseData);
        });

        console.log('[INFO] Browser đã sẵn sàng!');
        console.log('[INFO] Đang mở poe.com...');

        await this.page.goto('https://poe.com/Claude-Opus-4.5', {
            waitUntil: 'networkidle2'
        });



        console.log('\n========================================');
        console.log('BROWSER ĐÃ ĐƯỢC MỞ!');
        console.log('========================================');
        console.log('Bạn có thể tương tác trực tiếp với trang web.');
        console.log('Tất cả HTTP requests/responses và WebSocket messages đang được capture.');
        console.log('');
        console.log('Nhấn Ctrl+C trong terminal để dừng và lưu dữ liệu.');
        console.log('========================================\n');
    }

    async save() {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

        // Lưu tất cả requests
        const requestsFile = path.join(this.capturedDir, `requests_${timestamp}.json`);
        fs.writeFileSync(requestsFile, JSON.stringify(this.requests, null, 2));
        console.log(`\n[SAVED] Đã lưu ${this.requests.length} requests vào: ${requestsFile}`);

        // Lưu tất cả responses
        const responsesFile = path.join(this.capturedDir, `responses_${timestamp}.json`);
        fs.writeFileSync(responsesFile, JSON.stringify(this.responses, null, 2));
        console.log(`[SAVED] Đã lưu ${this.responses.length} responses vào: ${responsesFile}`);

        // Lưu WebSocket messages
        const wsFile = path.join(this.capturedDir, `websocket_${timestamp}.json`);
        fs.writeFileSync(wsFile, JSON.stringify(this.wsMessages, null, 2));
        console.log(`[SAVED] Đã lưu ${this.wsMessages.length} WebSocket messages vào: ${wsFile}`);

        // Lưu summary file chỉ chứa API calls quan trọng
        const apiRequests = this.requests.filter(r =>
            r.url.includes('poe.com') &&
            (r.resourceType === 'xhr' || r.resourceType === 'fetch')
        );

        const apiResponses = this.responses.filter(r =>
            r.url.includes('poe.com') &&
            (r.resourceType === 'xhr' || r.resourceType === 'fetch')
        );

        // Parse và lọc WebSocket messages quan trọng
        const parsedWsMessages = this.wsMessages.map(msg => {
            try {
                const parsed = typeof msg.data === 'string' ? JSON.parse(msg.data) : msg.data;
                return {
                    ...msg,
                    parsedData: parsed
                };
            } catch (e) {
                return msg;
            }
        });

        const summaryFile = path.join(this.capturedDir, `api_summary_${timestamp}.json`);
        fs.writeFileSync(summaryFile, JSON.stringify({
            totalRequests: this.requests.length,
            totalResponses: this.responses.length,
            totalWebSocketMessages: this.wsMessages.length,
            apiRequests: apiRequests,
            apiResponses: apiResponses,
            webSocketMessages: parsedWsMessages
        }, null, 2));
        console.log(`[SAVED] Đã lưu API summary vào: ${summaryFile}`);
        console.log(`[INFO] Tổng ${apiRequests.length} API requests, ${this.wsMessages.length} WebSocket messages được capture.`);
    }

    async stop() {
        console.log('\n[INFO] Đang dừng và lưu dữ liệu...');
        await this.save();

        if (this.browser) {
            await this.browser.close();
            console.log('[INFO] Browser đã đóng.');
        }

        process.exit(0);
    }
}

// Main execution
async function main() {
    const capture = new PoeRequestCapture();

    // Xử lý Ctrl+C
    process.on('SIGINT', async () => {
        await capture.stop();
    });

    try {
        await capture.launch();

        // Giữ process chạy
        await new Promise(() => { });
    } catch (err) {
        console.error('[ERROR]', err);
        process.exit(1);
    }
}

main();
