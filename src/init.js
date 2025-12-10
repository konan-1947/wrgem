/**
 * init - Auto khởi tạo (smart init)
 * - Nếu có session → init từ file (headless)
 * - Nếu chưa có → khởi tạo lần đầu (browser hiện)
 */

const fs = require('fs');
const { getDefaultUserDataDir } = require('./utils');
const ResponseFormat = require('./responseFormat');
const init_aistudio = require('./init_aistudio');
const initFromFile = require('./initFromFile');

async function init(options = {}) {
    try {
        const userDataDir = options.userDataDir || getDefaultUserDataDir();

        // Check xem đã có session chưa
        const hasSession = fs.existsSync(userDataDir);

        if (hasSession) {
            console.log('→ Tìm thấy session, init từ file...');
            // Có session → dùng headless
            await initFromFile.call(this, {
                ...options,
                headless: options.headless !== undefined ? options.headless : true
            });

            // Đóng browser sau khi init
            console.log('→ Đóng browser sau init...');
            if (this.browser) {
                await this.browser.close();
                this.browser = null;
                this.page = null;
            }

            return ResponseFormat.success(true, {
                method: 'initFromFile',
                headless: true,
                userDataDir,
                browserClosed: true
            });
        } else {
            console.log('→ Chưa có session, khởi tạo lần đầu...');
            // Chưa có session → browser hiện để login
            await init_aistudio.call(this, {
                ...options,
                headless: false
            });

            // Đóng browser sau khi login xong
            console.log('→ Đóng browser sau login...');
            if (this.browser) {
                await this.browser.close();
                this.browser = null;
                this.page = null;
            }

            return ResponseFormat.success(true, {
                method: 'init_aistudio',
                headless: false,
                userDataDir,
                browserClosed: true
            });
        }
    } catch (error) {
        return ResponseFormat.error(error.message, 'INIT_ERROR');
    }
}

module.exports = init;
