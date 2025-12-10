# Rev AI Studio

Thư viện Node.js để tương tác với Google AI Studio (Gemini) miễn phí.

## Cài đặt

```bash
npm install
```

## Tính năng

- ✅ Tương tác với Gemini qua aistudio.google.com
- ✅ Headless mode - Chạy ngầm không cần browser hiện
- ✅ Session persistence - Lưu đăng nhập, không cần login lại
- ✅ Auto bypass detection - Tự động bypass các cơ chế phát hiện automation

## Sử dụng

```javascript
const AIStudioClient = require('./index');

async function main() {
    const client = new AIStudioClient();
    
    // Lần đầu: Login (browser hiện)
    // await client.init_aistudio({ headless: false });
    
    // Các lần sau: Dùng session (headless)
    await client.initFromFile({ headless: true });
    
    // Gửi message
    const response = await client.request_aistudio('Xin chào! Bạn là ai?');
    console.log('Response:', response);
    
    await client.close();
}

main();
```

## API

### Methods

#### `init_aistudio(options)`
Khởi tạo lần đầu tiên (cần login)

**Params:**
- `options.headless` - Boolean, mặc định `false`
- `options.userDataDir` - String, đường dẫn lưu session

**Returns:** Promise<Boolean>

#### `initFromFile(options)`
Khởi tạo từ session đã lưu

**Params:**
- `options.headless` - Boolean, mặc định `true`
- `options.userDataDir` - String, đường dẫn session

**Returns:** Promise<Boolean>

#### `request_aistudio(message, options)`
Gửi message và nhận response

**Params:**
- `message` - String, nội dung message
- `options` - Object (optional)
  - `options.onUpdate` - Function, callback khi có update
  - `options.onComplete` - Function, callback khi hoàn thành

**Returns:** Promise<String> - Response text

#### `close()`
Đóng browser

**Returns:** Promise<void>

## Examples

```javascript
// Example 1: Sử dụng cơ bản
const AIStudioClient = require('./index');

const client = new AIStudioClient();
await client.initFromFile({ headless: true });
const response = await client.request_aistudio('Giải thích về AI');
console.log(response);
await client.close();
```

```javascript
// Example 2: Streaming callback
const client = new AIStudioClient();
await client.initFromFile({ headless: true });

const response = await client.request_aistudio('Kể một câu chuyện', {
    onUpdate: (text) => {
        console.log('Update:', text.substring(0, 50) + '...');
    },
    onComplete: (text) => {
        console.log('Complete! Length:', text.length);
    }
});

await client.close();
```

## Lưu ý

### Lần đầu tiên sử dụng

1. Chạy với `headless: false`:
```javascript
await client.init_aistudio({ headless: false });
```

2. Đăng nhập Google trong browser tự động mở
3. Nhấn Enter trong console sau khi login
4. Session được lưu trong `.chrome-user-data-aistudio`

### Các lần sau

Chỉ cần dùng `initFromFile` với `headless: true`:
```javascript
await client.initFromFile({ headless: true });
```

### Bảo mật

- Thêm `.chrome-user-data-aistudio` vào `.gitignore`
- Không commit session lên Git
- Session chứa cookie đăng nhập Google

## Cách hoạt động

Thư viện sử dụng Puppeteer với các kỹ thuật:
- **Stealth Plugin**: Bypass detection automation
- **Device Emulation Toggle**: Trigger UI re-render
- **CDP Protocol**: Control browser ở mức thấp

## License

MIT
