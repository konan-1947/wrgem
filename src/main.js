/**
 * Main - AI Studio Client Class
 */

const init = require('./init');
const chat = require('./chat');
const close = require('./close');

// Global registry để track tất cả instances
const activeClients = new Set();

class WrgemClient {
    constructor() {
        this.browser = null;
        this.page = null;

        // Thêm instance vào registry
        activeClients.add(this);
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
     * Gửi message và nhận response
     */
    async request_aistudio(message, options = {}) {
        return await chat.call(this, message, options);
    }

    /**
     * Đóng browser
     */
    async close() {
        const result = await close.call(this);

        // Xóa instance khỏi registry sau khi đóng
        activeClients.delete(this);

        return result;
    }
}

// Cleanup tất cả instances khi process kết thúc
const cleanupAll = async () => {
    if (activeClients.size > 0) {
        console.log(`Đang đóng ${activeClients.size} browser instance(s)...`);
        const promises = Array.from(activeClients).map(client => client.close());
        await Promise.all(promises);
        activeClients.clear();
    }
};

// Register cleanup handlers
process.on('SIGINT', async () => {
    console.log('\nNhận tín hiệu dừng, đang cleanup...');
    await cleanupAll();
    process.exit(0);
});

process.on('SIGTERM', async () => {
    console.log('\nNhận tín hiệu terminate, đang cleanup...');
    await cleanupAll();
    process.exit(0);
});

process.on('beforeExit', async () => {
    await cleanupAll();
});

module.exports = WrgemClient;
