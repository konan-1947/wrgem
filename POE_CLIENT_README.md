# Poe API Client - Thư viện Node.js

Thư viện để gọi API của Poe.com và chat với các AI models như Claude, GPT-4, v.v.

## Cài đặt

```bash
npm install ws
```

## Lấy Credentials từ Browser

Trước khi sử dụng, bạn cần lấy `cookies` và `formkey` từ browser:

### Bước 1: Mở DevTools
1. Mở https://poe.com trên Chrome/Edge
2. Đăng nhập vào tài khoản
3. Nhấn F12 để mở DevTools

### Bước 2: Lấy Cookies
1. Vào tab **Application** (hoặc **Storage**)
2. Chọn **Cookies** → `https://poe.com`
3. Copy toàn bộ cookies thành chuỗi format:
   ```
   p-b=xxx; poe-tchannel-channel=xxx; __cf_bm=xxx; _gcl_au=xxx; _fbp=xxx
   ```

### Bước 3: Lấy Formkey
1. Vào tab **Network**
2. Gửi một message bất kỳ trên Poe
3. Tìm request có tên `gql_POST`
4. Vào tab **Headers** → **Request Headers**
5. Copy giá trị của `poe-formkey`

## Sử dụng

### Cơ bản

```javascript
const PoeClient = require('./src/poe-client');

async function main() {
  // Khởi tạo
  const client = new PoeClient();
  
  await client.init_poe({
    cookies: 'p-b=xxx; poe-tchannel-channel=xxx; ...',
    formkey: 'your-formkey-here'
  });

  // Gửi message
  const response = await client.request_poe('Xin chào!', 'Claude-Opus-4.5');
  console.log('Response:', response);

  // Đóng kết nối
  client.close();
}

main();
```

### Với Streaming Callback

```javascript
const response = await client.request_poe(
  'Viết một bài thơ về mùa thu',
  'Claude-Opus-4.5',
  {
    onUpdate: (text) => {
      // Được gọi mỗi khi có text update
      console.log('Streaming:', text);
    },
    onComplete: (fullText) => {
      // Được gọi khi hoàn thành
      console.log('Done!');
    }
  }
);
```

## API Reference

### `init_poe(options)`

Khởi tạo client với credentials.

**Parameters:**
- `options.cookies` (string, required): Cookie string từ browser
- `options.formkey` (string, required): poe-formkey từ browser
- `options.tchannel` (string, optional): poe-tchannel (sẽ tự tạo nếu không có)

**Returns:** `Promise<boolean>`

**Example:**
```javascript
await client.init_poe({
  cookies: 'p-b=xxx; __cf_bm=xxx',
  formkey: '20cead32e377150ac4c38f25139c73ff'
});
```

### `request_poe(message, bot, options)`

Gửi message đến AI model và nhận response.

**Parameters:**
- `message` (string, required): Nội dung message
- `bot` (string, optional): Tên bot (mặc định: 'Claude-Opus-4.5')
- `options` (object, optional):
  - `onUpdate` (function): Callback khi có text update (streaming)
  - `onComplete` (function): Callback khi hoàn thành

**Returns:** `Promise<string>` - Response text đầy đủ

**Example:**
```javascript
const response = await client.request_poe('Hello!', 'GPT-4o', {
  onUpdate: (text) => console.log(text),
  onComplete: (text) => console.log('Done:', text)
});
```

### `close()`

Đóng WebSocket connection.

**Example:**
```javascript
client.close();
```

## Các Bot Phổ Biến

- `Claude-Opus-4.5` - Claude Opus 4.5 từ Anthropic
- `GPT-4o` - GPT-4 Omni từ OpenAI
- `Claude-Sonnet-3.5` - Claude Sonnet 3.5
- `Gemini-2.0-Flash` - Gemini 2.0 Flash từ Google
- `DeepSeek-R1` - DeepSeek R1

## Lưu Ý

⚠️ **Bảo mật:**
- Không commit cookies/formkey vào Git
- Cookies có thể hết hạn, cần update định kỳ
- Formkey thay đổi theo session

⚠️ **Rate Limiting:**
- Poe có giới hạn số request
- Nên có delay giữa các request
- Free account có giới hạn message

⚠️ **Ổn định:**
- WebSocket có thể disconnect đột ngột
- Nên có error handling và retry logic
- Lưu ý timeout khi response quá dài

## Troubleshooting

### Lỗi "Chưa khởi tạo client"
→ Gọi `init_poe()` trước khi gọi `request_poe()`

### Lỗi "WebSocket closed"
→ Cookies hoặc formkey đã hết hạn, cần lấy lại

### Timeout
→ Response quá dài, tăng timeout trong code hoặc chờ lâu hơn

### 403 Forbidden
→ Cookies không hợp lệ hoặc bị Cloudflare block

## License

MIT
