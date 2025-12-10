/**
 * Main - AI Studio Client Class
 */

const init = require('./init');
const request_aistudio = require('./request_aistudio');
const close = require('./close');

class AIStudioClient {
    constructor() {
        this.browser = null;
        this.page = null;
    }

    /**
     * Khởi tạo client (auto-detect session)
     * - Nếu có session → headless mode
     * - Nếu chưa có → browser hiện để login
     */
    async init(options = {}) {
        return await init.call(this, options);
    }

    /**
     * Gửi message và nhận response
     */
    async request_aistudio(message, options = {}) {
        return await request_aistudio.call(this, message, options);
    }

    /**
     * Đóng browser
     */
    async close() {
        return await close.call(this);
    }
}

module.exports = AIStudioClient;
