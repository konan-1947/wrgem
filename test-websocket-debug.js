// SCRIPT 2: INSPECT WEBSOCKET URL TỪ NETWORK TAB
// Copy vào F12 Console

console.log('=== HƯỚNG DẪN DEBUG WEBSOCKET ===\n');
console.log('1. Mở tab Network trong F12');
console.log('2. Filter: WS hoặc WebSocket');
console.log('3. Gửi 1 message trong chat UI của Poe');
console.log('4. Xem WebSocket connection nào được tạo');
console.log('5. Click vào WebSocket đó và xem:');
console.log('   - URL đầy đủ');
console.log('   - Headers');
console.log('   - Messages tab để xem data\n');

// Lấy tất cả thông tin có thể từ page
console.log('=== THÔNG TIN HIỆN TẠI ===\n');

// Cookies
const cookies = document.cookie;
console.log('Cookies:', cookies, '\n');

// Channel từ cookie
const channelMatch = cookies.match(/poe-tchannel-channel=([^;]+)/);
const tchannel = channelMatch ? decodeURIComponent(channelMatch[1]) : null;
console.log('tchannel từ cookie:', tchannel, '\n');

// Thử tìm WebSocket từ __NEXT_DATA__ (Poe dùng Next.js)
try {
    const nextData = document.getElementById('__NEXT_DATA__');
    if (nextData) {
        const data = JSON.parse(nextData.textContent);
        console.log('__NEXT_DATA__:', data);
    }
} catch (e) {
    console.log('Không tìm thấy __NEXT_DATA__');
}

// Tìm trong window object
console.log('\nCác biến window có thể hữu ích:');
for (let key in window) {
    if (key.toLowerCase().includes('poe') ||
        key.toLowerCase().includes('websocket') ||
        key.toLowerCase().includes('channel')) {
        try {
            console.log(`  ${key}:`, window[key]);
        } catch (e) { }
    }
}

console.log('\n💡 Sau khi gửi message, hãy chụp screenshot tab Network/WS cho tôi!');
