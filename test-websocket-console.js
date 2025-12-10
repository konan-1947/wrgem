// COPY ĐOẠN NÀY VÀO F12 CONSOLE TRÊN TRANG POE.COM
// Đảm bảo đã đăng nhập và đang ở trang chat

async function testPoeWebSocket() {
    console.log('=== TEST WEBSOCKET ===\n');

    // Lấy tchannel từ cookie
    const cookies = document.cookie;
    const channelMatch = cookies.match(/poe-tchannel-channel=([^;]+)/);
    const tchannel = channelMatch ? decodeURIComponent(channelMatch[1]) : null;

    if (!tchannel) {
        console.error('❌ Không tìm thấy tchannel. Vui lòng gửi 1 message thủ công trước.');
        return;
    }

    console.log('✓ tchannel:', tchannel);

    // Tạo WebSocket URL (giống y hệt URL thực)
    const minSeq = Math.floor(Date.now() * 1000);
    const hash = Math.floor(Math.random() * 1e19);
    const wsUrl = `wss://tch917001.tch.poe.com/up/chan109-8888/updates?min_seq=${minSeq}&channel=${tchannel}&hash=${hash}&generation=1`;

    console.log('✓ URL:', wsUrl);
    console.log('\n→ Đang kết nối WebSocket...\n');

    // Kết nối WebSocket
    const ws = new WebSocket(wsUrl);
    let messageCount = 0;

    ws.onopen = () => {
        console.log('✅ WebSocket CONNECTED!\n');
        // Gửi ping
        const pingMsg = JSON.stringify({ type: 'ping' });
        ws.send(pingMsg);
        console.log('→ Sent:', pingMsg, '\n');
    };

    ws.onmessage = (event) => {
        messageCount++;
        console.log(`\n📨 Message #${messageCount}:`);

        try {
            const data = JSON.parse(event.data);
            console.log('Parsed:', data);

            // Nếu là pong
            if (data.type === 'pong') {
                console.log('  └─ Type: PONG (heartbeat)');
                return;
            }

            // Parse nested messages
            if (data.messages && Array.isArray(data.messages)) {
                console.log(`  └─ Có ${data.messages.length} nested message(s):`);
                data.messages.forEach((msgStr, idx) => {
                    try {
                        const msg = JSON.parse(msgStr);
                        console.log(`     [${idx}]:`, msg);

                        // Kiểm tra messageAdded
                        if (msg.message_type === 'subscriptionUpdate') {
                            const payload = msg.payload;
                            if (payload?.subscription_name === 'messageAdded') {
                                const msgData = payload.data?.messageAdded;
                                if (msgData) {
                                    console.log(`\n     🤖 BOT RESPONSE:`);
                                    console.log(`        Author: ${msgData.author}`);
                                    console.log(`        Text: "${msgData.text}"`);
                                    console.log(`        State: ${msgData.state}`);
                                }
                            }
                        }
                    } catch (e) {
                        console.log(`     [${idx}] (raw):`, msgStr);
                    }
                });
            }
        } catch (e) {
            console.log('Raw data:', event.data);
        }
    };

    ws.onerror = (error) => {
        console.error('\n❌ WebSocket ERROR:', error);
    };

    ws.onclose = (event) => {
        console.log(`\n✗ WebSocket CLOSED`);
        console.log(`  Code: ${event.code}`);
        console.log(`  Reason: ${event.reason || '(no reason)'}`);
        console.log(`  Was Clean: ${event.wasClean}`);
    };

    // Lưu vào window
    window.testWs = ws;

    console.log('💡 Giờ hãy GỬI MESSAGE trong chat để xem response!\n');
    console.log('💡 Để đóng WebSocket: window.testWs.close()\n');

    return ws;
}

// Chạy
testPoeWebSocket();
