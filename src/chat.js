/**
 * chat - Gửi message và nhận response (chat liên tục)
 * 
 * MỤC ĐÍCH:
 * - Gửi message và nhận response từ AI Studio
 * - Browser mở LIÊN TỤC, không đóng sau mỗi lần chat
 * - Lần đầu: mở browser từ credential đã lưu
 * - Các lần sau: dùng lại browser đang mở
 * 
 * LƯU Ý:
 * - Browser chỉ đóng khi user gọi close() chủ động
 * - Context được AI Studio tự quản lý trong UI
 */

const ResponseFormat = require('./responseFormat');
const initFromFile = require('./initFromFile');
const _waitForResponse = require('./_waitForResponse');

async function chat(message, options = {}) {
    try {
        // Chỉ mở browser nếu chưa có browser đang mở
        if (!this.browser || !this.page) {
            await initFromFile.call(this, { headless: 'new' });
        }

        const textareaSelectors = [
            'textarea[placeholder*="Enter"]',
            'textarea',
            '[contenteditable="true"]'
        ];

        let textarea = null;
        for (const selector of textareaSelectors) {
            textarea = await this.page.$(selector);
            if (textarea) {
                break;
            }
        }

        if (!textarea) {
            return ResponseFormat.error('Không tìm thấy textarea để nhập message', 'TEXTAREA_NOT_FOUND');
        }

        // Clear và nhập message bằng cách set value trực tiếp
        await textarea.click();
        await textarea.evaluate(el => el.value = ''); // Clear

        // Set value và trigger events
        await textarea.evaluate((el, text) => {
            el.value = text;
            el.dispatchEvent(new Event('input', { bubbles: true }));
            el.dispatchEvent(new Event('change', { bubbles: true }));
        }, message);

        // Đợi một chút để UI update
        await this.page.waitForTimeout(300);

        // Đợi response container xuất hiện
        const responsePromise = _waitForResponse.call(this, message, options);

        // Gửi message bằng Ctrl+Enter
        await this.page.keyboard.down('Control');
        await this.page.keyboard.press('Enter');
        await this.page.keyboard.up('Control');

        // Đợi response với timeout
        const response = await Promise.race([
            responsePromise,
            new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Timeout: Không nhận được response sau 60s')), 60000)
            )
        ]);

        // GIỮ browser mở để chat tiếp

        return ResponseFormat.success(response, {
            inputMessage: message,
            responseLength: response.length,
            model: 'gemini'
        });
    } catch (error) {
        // GIỮ browser mở ngay cả khi có lỗi (user tự quyết định đóng)

        return ResponseFormat.error(error.message, 'REQUEST_ERROR', {
            inputMessage: message
        });
    }
}

module.exports = chat;
