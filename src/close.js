/**
 * close - Đóng browser
 */

async function close() {
    if (this.browser) {
        await this.browser.close();
        this.browser = null;
        this.page = null;
        console.log('✓ Đã đóng browser');
    }
}

module.exports = close;
