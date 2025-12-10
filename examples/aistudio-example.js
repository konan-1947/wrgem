const AIStudioClient = require('../index');

async function main() {
    const client = new AIStudioClient();

    try {
        // Auto init: Nếu có session → headless, nếu chưa → browser hiện
        const initResult = await client.init();

        if (!initResult.success) {
            console.error('Init failed:', initResult.error);
            return;
        }

        console.log('Init success:', initResult.metadata);

        console.log('\n=== Gửi message tới Gemini ===');
        const result = await client.request_aistudio('Bạn là ai? Trả lời ngắn gọn.');

        if (result.success) {
            console.log('\n\nResponse:', result.data);
            console.log('\nMetadata:', result.metadata);
        } else {
            console.error('\nError:', result.error);
        }

    } catch (error) {
        console.error('\nException:', error.message);
    } finally {
        await client.close();
    }
}

main();
