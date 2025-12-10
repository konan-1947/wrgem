/**
 * _checkIfLoggedIn - Kiểm tra đã đăng nhập chưa
 * @private
 */

async function _checkIfLoggedIn() {
    try {
        console.log('  → Check login...');
        await this.page.waitForTimeout(3000);

        const currentUrl = this.page.url();
        console.log('  → URL:', currentUrl);

        if (currentUrl.includes('accounts.google.com')) {
            console.log('  → Đang ở trang login');
            return false;
        }

        const selectors = [
            'textarea[placeholder*="Enter"]',
            'textarea',
            '[contenteditable="true"]'
        ];

        for (const sel of selectors) {
            const el = await this.page.$(sel);
            if (el) {
                console.log(`  ✓ Tìm thấy: ${sel}`);
                return true;
            }
        }

        if (currentUrl.includes('aistudio.google.com/app')) {
            console.log('  ✓ URL hợp lệ');
            return true;
        }

        console.log('  ✗ Không detect được');
        return false;
    } catch (error) {
        console.log('  ✗ Lỗi:', error.message);
        return false;
    }
}

module.exports = _checkIfLoggedIn;
