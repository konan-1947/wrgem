// SCRIPT ĐƠN GIẢN: Nhập thủ công formkey
// Copy vào F12 Console

async function testManual() {
    console.log('=== HƯỚNG DẪN ===');
    console.log('1. Mở Network tab');
    console.log('2. Tìm request bất kỳ tới poe.com/api/gql_POST');
    console.log('3. Xem Headers → Request Headers → tìm "poe-formkey"');
    console.log('4. Copy giá trị formkey và paste vào dưới\n');

    // Lấy tchannel
    const cookies = document.cookie;
    const channelMatch = cookies.match(/poe-tchannel-channel=([^;]+)/);
    const tchannel = channelMatch ? decodeURIComponent(channelMatch[1]) : null;

    console.log('✓ tchannel:', tchannel);

    // ===== NHẬP FORMKEY VÀO ĐÂY =====
    const formkey = 'PASTE_FORMKEY_VAO_DAY'; // <-- Thay đổi dòng này
    // ================================

    if (formkey === 'PASTE_FORMKEY_VAO_DAY') {
        console.error('\n❌ Vui lòng sửa dòng 20: paste formkey vào giữa dấu nháy');
        console.log('   Ví dụ: const formkey = "ba076c0be18acfa08697...";');
        return;
    }

    console.log('✓ formkey:', formkey.substring(0, 20) + '...\n');

    // Gửi subscription
    console.log('→ Đang gửi subscription...');
    const subPayload = {
        "queryName": "subscriptionsMutation",
        "variables": {
            "subscriptions": [{
                "subscriptionName": "messageAdded",
                "query": null,
                "queryHash": "1de88182ca9bf1136f6cc5787fe923b9e2c6de690d728fba4fdca4af18c57ab3"
            }]
        },
        "extensions": {
            "hash": "5a7bfc9ce3b4e456cd05a537cfa27096f08417593b8d9b53f57587f3b7b63e99"
        }
    };

    const subResp = await fetch('https://poe.com/api/gql_POST', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'poe-queryname': 'subscriptionsMutation',
            'poe-tchannel': tchannel,
            'poe-formkey': formkey,
            'poegraphql': '1'
        },
        body: JSON.stringify(subPayload)
    });

    const subData = await subResp.json();
    console.log('✓ Subscription OK:', subData, '\n');

    // Đợi 1s
    await new Promise(r => setTimeout(r, 1000));

    // Kết nối WebSocket
    const minSeq = Math.floor(Date.now() * 1000);
    const hash = Math.floor(Math.random() * 1e19);
    const wsUrl = `wss://tch917001.tch.poe.com/up/chan109-8888/updates?min_seq=${minSeq}&channel=${tchannel}&hash=${hash}&generation=1`;

    console.log('→ Đang kết nối WebSocket...');
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
        console.log('✅ CONNECTED!');
        ws.send(JSON.stringify({ type: 'ping' }));
    };

    ws.onmessage = (e) => {
        console.log('📨', e.data);
    };

    ws.onerror = (e) => {
        console.error('❌ Error:', e);
    };

    ws.onclose = (e) => {
        console.log(`✗ Closed (${e.code})`);
    };

    window.testWs = ws;
    console.log('\n💡 Gửi message trong chat để test!');
}

testManual();
