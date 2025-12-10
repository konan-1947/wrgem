/**
 * Ví dụ sử dụng Poe Client với credentials file
 * 
 * Flow hoạt động:
 * 1. Lần đầu: Chạy init_poe() để mở browser, login và lưu credentials
 * 2. Các lần sau: Chỉ cần initFromFile() để load credentials, không cần browser
 */

const PoeClient = require('./src/poe-client');
const fs = require('fs');
const path = require('path');

async function main() {
    const client = new PoeClient();
    const credentialsPath = path.join(__dirname, 'src', 'poe-credentials.json');

    try {
        // Kiểm tra xem đã có credentials file chưa
        if (fs.existsSync(credentialsPath)) {
            console.log('=== Khởi tạo từ file credentials (không cần browser) ===\n');
            await client.initFromFile();
        } else {
            console.log('=== Lần đầu tiên: Khởi tạo với browser ===\n');
            await client.init_poe({
                headless: false,         // Hiện browser để login
                keepBrowserOpen: false   // Đóng browser sau khi lấy credentials
            });
            console.log('\n✓ Đã lưu credentials. Lần sau không cần mở browser nữa!\n');
        }

        // Gửi message test
        console.log('\n=== Test: Gửi message ===');
        const response = await client.request_poe('Xin chào!', 'Claude-Opus-4.5');
        console.log('\n\nResponse:', response);

    } catch (error) {
        console.error('\n❌ Lỗi:', error.message);

        // Nếu lỗi 403/401, có thể credentials đã hết hạn
        if (error.message.includes('403') || error.message.includes('401')) {
            console.log('\n⚠️  Credentials có thể đã hết hạn.');
            console.log('   Xóa file credentials và chạy lại để login mới.');
        }
    } finally {
        await client.close();
        console.log('\n=== Đã đóng client ===');
    }
}

// Chạy ví dụ
if (require.main === module) {
    main().catch(console.error);
}

module.exports = { main };
