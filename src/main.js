/**
 * Main - AI Studio Client Class
 */

const init = require('./init');
const chat = require('./chat');
const close = require('./close');

class AIStudioClient {
    constructor() {
        this.browser = null;
        this.page = null;
    }

    /**
     * Khởi tạo client (auto-detect session)
     * - Nếu có session => headless mode
     * - Nếu chưa có => browser hiện để login
     */
    async init(options = {}) {
        return await init.call(this, options);
    }

    /**
     * Gửi message và nhận response (chat liên tục)
     */
    async chat(message, options = {}) {
        return await chat.call(this, message, options);
    }

    /**
     * Đóng browser
     */
    async close() {
        return await close.call(this);
    }
}

module.exports = AIStudioClient;
