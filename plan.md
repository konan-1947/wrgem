- lấy mã markdown của phản hồi thay vì lấy text như bh
- tổ chức session theo phiên mở browser

## Quản lý nhiều instance browser

### Các hàm chính

**init()**
- Setup credential lần đầu
- Kiểm tra đã login chưa
- Mở browser => check => ĐÓNG ngay
- Chỉ chạy 1 lần khi setup

**chat(message, options)**
- Gửi message và nhận response
- Browser mở LIÊN TỤC (không đóng sau mỗi lần chat)
- Lần đầu: mở browser mới từ credential đã lưu
- Các lần sau: dùng lại browser đang mở
- Giữ context tự động trong UI của AI Studio

**close()**
- Đóng browser đang mở
- Kết thúc session chat
- User chủ động gọi khi xong việc

### Flow sử dụng

```javascript
const client = new AIStudioClient();

// Bước 1: Setup credential (chỉ 1 lần)
await client.init();

// Bước 2: Chat liên tục (browser mở liên tục)
await client.chat("câu 1"); // Mở browser
await client.chat("câu 2"); // Dùng lại browser
await client.chat("câu 3"); // Dùng lại browser

// Bước 3: Đóng khi xong
await client.close();
```

### Multi-instance

Mỗi instance quản lý 1 browser riêng:

```javascript
const client1 = new AIStudioClient();
const client2 = new AIStudioClient();

await client1.chat("câu hỏi 1"); // Browser 1
await client2.chat("câu hỏi 2"); // Browser 2

await client1.close(); // Đóng browser 1
await client2.close(); // Đóng browser 2
```

### Cần sửa trong request_aistudio.js

1. Đầu hàm: Check nếu browser đã mở thì không init lại
2. Cuối hàm: Bỏ các đoạn đóng browser
3. Đổi tên thành chat.js cho rõ nghĩa

