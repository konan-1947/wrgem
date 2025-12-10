const AIStudioClient = require('../index');
const readline = require('readline');

// Tạo interface để đọc input từ terminal
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

async function askQuestion(question) {
    return new Promise((resolve) => {
        rl.question(question, (answer) => {
            resolve(answer);
        });
    });
}

async function chatbot() {
    const client = new AIStudioClient();

    try {
        console.log('=== Gemini Chatbot ===\n');

        // Init để setup session (browser sẽ đóng sau init)
        console.log('→ Đang khởi tạo...');
        const initResult = await client.init();

        if (!initResult.success) {
            console.error('✗ Init failed:', initResult.error.message);
            return;
        }

        console.log('✓ Sẵn sàng! (Browser đã đóng)\n');

        // Chat loop - Mỗi request sẽ mở browser headless riêng
        while (true) {
            // Nhập message
            const userMessage = await askQuestion('Bạn: ');

            // Check exit commands
            if (!userMessage || userMessage.toLowerCase() === 'exit' || userMessage.toLowerCase() === 'quit') {
                console.log('\n→ Thoát chatbot...');
                break;
            }

            // Gửi message (tự động mở/đóng browser headless)
            console.log('\nGemini: ');
            const result = await client.request_aistudio(userMessage);

            if (result.success) {
                console.log(result.data);
                console.log(`\n[${result.metadata.responseLength} ký tự]\n`);
            } else {
                console.error('✗ Lỗi:', result.error.message);
            }
        }

    } catch (error) {
        console.error('\n✗ Exception:', error.message);
    } finally {
        rl.close();
        console.log('✓ Đã đóng chatbot');
    }
}

console.log('Nhập "exit" hoặc "quit" để thoát\n');
chatbot();
