// TEST: Gửi subscriptionsMutation trước khi kết nối WebSocket
// Copy vào F12 Console

async function testWithSubscription() {
    console.log('=== TEST VỚI SUBSCRIPTION ===\n');

    // 1. Lấy thông tin cần thiết
    const cookies = document.cookie;
    const channelMatch = cookies.match(/poe-tchannel-channel=([^;]+)/);
    const tchannel = channelMatch ? decodeURIComponent(channelMatch[1]) : null;

    if (!tchannel) {
        console.error('❌ Không tìm thấy tchannel');
        return;
    }

    console.log('✓ tchannel:', tchannel);

    // 2. Lấy formkey từ localStorage hoặc meta tag
    let formkey = null;
    const scripts = document.querySelectorAll('script');
    for (let script of scripts) {
        if (script.textContent.includes('formkey')) {
            const match = script.textContent.match(/"formkey":"([^"]+)"/);
            if (match) {
                formkey = match[1];
                break;
            }
        }
    }

    if (!formkey) {
        console.error('❌ Không tìm thấy formkey');
        console.log('💡 Hãy mở Network tab → Headers của bất kỳ request nào → tìm "poe-formkey"');
        return;
    }

    console.log('✓ formkey:', formkey.substring(0, 20) + '...');

    // 3. Gửi subscriptionsMutation (giống như browser thật)
    console.log('\n→ Đang gửi subscriptionsMutation...');

    const subscriptionPayload = {
        "queryName": "subscriptionsMutation",
        "variables": {
            "subscriptions": [
                {
                    "subscriptionName": "messageAdded",
                    "query": null,
                    "queryHash": "1de88182ca9bf1136f6cc5787fe923b9e2c6de690d728fba4fdca4af18c57ab3"
                }
            ]
        },
        "extensions": {
            "hash": "5a7bfc9ce3b4e456cd05a537cfa27096f08417593b8d9b53f57587f3b7b63e99"
        }
    };

    try {
        const subResponse = await fetch('https://poe.com/api/gql_POST', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'poe-queryname': 'subscriptionsMutation',
                'poe-tchannel': tchannel,
                'poe-formkey': formkey,
                'poegraphql': '1'
            },
            body: JSON.stringify(subscriptionPayload)
        });

        const subData = await subResponse.json();
        console.log('✓ Subscription response:', subData);

    } catch (e) {
        console.error('❌ Lỗi subscribe:', e);
        return;
    }

    // 4. Đợi 1 giây rồi kết nối WebSocket
    console.log('\n→ Đang đợi 1s trước khi kết nối WebSocket...');
    await new Promise(r => setTimeout(r, 1000));

    // 5. Kết nối WebSocket
    const minSeq = Math.floor(Date.now() * 1000);
    const hash = Math.floor(Math.random() * 1e19);
    const wsUrl = `wss://tch917001.tch.poe.com/up/chan109-8888/updates?min_seq=${minSeq}&channel=${tchannel}&hash=${hash}&generation=1`;

    console.log('→ Đang kết nối WebSocket...');
    console.log('  URL:', wsUrl);

    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
        console.log('\n✅ WebSocket CONNECTED!');
        ws.send(JSON.stringify({ type: 'ping' }));
        console.log('→ Sent ping');
    };

    ws.onmessage = (event) => {
        console.log('\n📨 Message:', event.data);
        try {
            const data = JSON.parse(event.data);
            if (data.type === 'pong') {
                console.log('  └─ PONG received');
            } else {
                console.log('  └─ Parsed:', data);
            }
        } catch (e) { }
    };

    ws.onerror = (error) => {
        console.error('\n❌ WebSocket ERROR:', error);
    };

    ws.onclose = (event) => {
        console.log(`\n✗ WebSocket CLOSED (Code: ${event.code})`);
    };

    window.testWs = ws;
    console.log('\n💡 WebSocket đang chạy. Gửi message trong chat để test!');
}

// Chạy
testWithSubscription();
