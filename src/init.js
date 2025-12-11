/**
 * init - Setup credential và kiểm tra login
 * 
 * MỤC ĐÍCH:
 * - Chỉ dùng để setup credential lần đầu và kiểm tra login
 * - KHÔNG dùng để giữ browser mở cho chat
 * - Browser sẽ tự động ĐÓNG sau khi init xong
 * 
 * FLOW:
 * 1. Nếu ĐÃ CÓ session (userDataDir exists):
 *     Mở browser headless từ session file
 *     Kiểm tra đã login chưa
 *     ĐÓNG browser
 * 
 * 2. Nếu CHƯA CÓ session:
 *     Mở browser có UI
 *     Bắt user đăng nhập
 *     Lưu credential vào userDataDir
 *     ĐÓNG browser
 * 
 * LƯU Ý:
 * - init() chỉ chạy 1 lần khi setup thư viện
 * - Khi chat(), browser mới được mở và GIỮ LIÊN TỤC
 * - Gọi close() khi muốn đóng browser của chat()
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
            // Có session  dùng headless
            await initFromFile.call(this, {
                ...options,
                headless: options.headless !== undefined ? options.headless : true
            });

            // Đóng browser sau khi init
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
            // Chưa có session  browser hiện để login
            await init_aistudio.call(this, {
                ...options,
                headless: false
            });

            // Đóng browser sau khi login xong
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
