/**
 * request_aistudio - Gửi message và nhận response
 */

const ResponseFormat = require('./responseFormat');
const initFromFile = require('./initFromFile');
const _waitForResponse = require('./_waitForResponse');

async function request_aistudio(message, options = {}) {
    try {
        // Mở browser headless
        await initFromFile.call(this, { headless: false });

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
            // Đóng browser trước khi return error
            if (this.browser) {
                await this.browser.close();
                this.browser = null;
                this.page = null;
            }
            return ResponseFormat.error('Không tìm thấy textarea để nhập message', 'TEXTAREA_NOT_FOUND');
        }

        // Clear và nhập message
        await textarea.click({ clickCount: 3 });
        await textarea.type(message, { delay: 10 });

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

        // Đóng browser sau khi nhận response
        if (this.browser) {
            await this.browser.close();
            this.browser = null;
            this.page = null;
        }

        return ResponseFormat.success(response, {
            inputMessage: message,
            responseLength: response.length,
            model: 'gemini'
        });
    } catch (error) {
        // Đóng browser nếu có lỗi
        if (this.browser) {
            await this.browser.close();
            this.browser = null;
            this.page = null;
        }

        return ResponseFormat.error(error.message, 'REQUEST_ERROR', {
            inputMessage: message
        });
    }
}

module.exports = request_aistudio;
