/**
 * Example sử dụng Poe Client V2 (với CDP)
 */

const PoeClientV2 = require('./src/poe-client-v2');

async function main() {
    const client = new PoeClientV2();

    try {
        // Lần đầu: Login với browser hiện
        // await client.init_poe({ headless: false });

        // Các lần sau: Dùng session đã lưu, browser headless
        await client.initFromFile({ headless: true });

        console.log('\n=== Test: Gửi message ===');
        const response = await client.request_poe('mô hình của bạn hiện tại là gì', 'Claude-Opus-4.5');

        console.log('\n\nResponse:', response);

    } catch (error) {
        console.error('\n❌ Lỗi:', error.message);
    } finally {
        // Không close browser nếu muốn gửi nhiều message
        // await client.close();
        console.log('\n=== Test hoàn thành ===');
    }
}

if (require.main === module) {
    main().catch(console.error);
}

module.exports = { main };
