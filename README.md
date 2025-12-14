# Rev AI Studio

Thư viện Node.js tương tác với Google Gemini thông qua AI Studio interface bằng browser automation.

## Demo

https://github.com/user-attachments/assets/32c964fe-3086-405e-a959-3ac41a021d67

## Cài đặt

```bash
npm install
```

## Giới thiệu

Rev AI Studio là thư viện cho phép bạn tương tác với Google Gemini thông qua giao diện AI Studio (aistudio.google.com) bằng cách tự động hóa trình duyệt. Thư viện tự động quản lý session đăng nhập và hỗ trợ chat liên tục mà không cần đóng/mở browser nhiều lần.

### Đặc điểm chính

- Tự động quản lý phiên đăng nhập
- Chế độ headless để chạy ngầm
- Duy trì browser mở để chat liên tục
- Tự động reconnect khi bị mất kết nối
- Hỗ trợ callback để theo dõi trạng thái

## API Documentation

### Class: WrgemClient

Client chính để tương tác với AI Studio.

#### Constructor

```javascript
const WrgemClient = require('./index');
const client = new WrgemClient();
```

Tạo một instance mới của WrgemClient. Mỗi instance quản lý một browser session riêng biệt.

---

### Phương thức: `init(options)`

Khởi tạo client và thiết lập phiên đăng nhập.

#### Tham số

| Tham số | Type | Mặc định | Mô tả |
|---------|------|----------|-------|
| `options` | Object | `{}` | Đối tượng cấu hình |
| `options.userDataDir` | String | `~/.wrgem_data` | Thư mục lưu trữ session và cookies |
| `options.headless` | Boolean/String | `'new'` | Chế độ headless: `false`, `true`, hoặc `'new'` |

#### Hành vi

1. **Nếu đã có session** (lần chạy thứ 2 trở đi):
   - Mở browser ở chế độ headless
   - Tự động đăng nhập từ session đã lưu
   - Kiểm tra trạng thái đăng nhập
   - Đóng browser sau khi kiểm tra

2. **Nếu chưa có session** (lần đầu tiên):
   - Mở browser có giao diện
   - Đợi người dùng đăng nhập thủ công
   - Lưu session vào `userDataDir`
   - Đóng browser sau khi đăng nhập xong

#### Giá trị trả về

`Promise<Object>` - Đối tượng kết quả với cấu trúc:

```javascript
{
  success: true,
  data: true,
  metadata: {
    method: 'initFromFile',      // Hoặc 'init_aistudio'
    headless: true,               // Chế độ đã sử dụng
    userDataDir: '...',           // Đường dẫn thư mục session
    browserClosed: true           // Browser đã được đóng
  }
}
```

#### Ví dụ 1: Khởi tạo lần đầu

```javascript
const WrgemClient = require('./index');

async function firstTimeSetup() {
  const client = new WrgemClient();
  
  // Lần đầu tiên, browser sẽ mở để bạn đăng nhập
  const result = await client.init();
  
  console.log('Khởi tạo thành công:', result);
  // Browser sẽ tự động đóng sau khi bạn đăng nhập xong
}

firstTimeSetup();
```

#### Ví dụ 2: Khởi tạo với session tùy chỉnh

```javascript
const WrgemClient = require('./index');

async function initWithCustomSession() {
  const client = new WrgemClient();
  
  const result = await client.init({
    userDataDir: './my_custom_session',
    headless: 'new'  // Sử dụng chế độ headless mới
  });
  
  console.log('Đã khởi tạo:', result.metadata);
}

initWithCustomSession();
```

---

### Phương thức: `request_aistudio(message, options)`

Gửi tin nhắn đến Gemini và nhận phản hồi.

#### Tham số

| Tham số | Type | Bắt buộc | Mô tả |
|---------|------|----------|-------|
| `message` | String | ✓ | Nội dung tin nhắn gửi đến AI |
| `options` | Object | ✗ | Đối tượng cấu hình |
| `options.onStatus` | Function | ✗ | Callback nhận thông báo trạng thái |

#### Callback `onStatus`

Hàm callback nhận một tham số `status` (string) với các giá trị:

- `'reconnecting'` - Đang kết nối lại browser
- `'finding_input'` - Đang tìm ô nhập liệu
- `'filling_message'` - Đang điền tin nhắn
- `'sending_request'` - Đang gửi yêu cầu
- `'waiting_response'` - Đang chờ phản hồi

#### Hành vi

1. Kiểm tra browser có đang hoạt động không
2. Nếu cần, tự động reconnect từ session
3. Tìm và điền tin nhắn vào textarea
4. Gửi tin nhắn bằng Ctrl+Enter
5. Chờ và thu thập phản hồi từ AI
6. **Giữ browser mở** để có thể chat tiếp

#### Giá trị trả về

`Promise<Object>` - Đối tượng kết quả với cấu trúc:

```javascript
{
  success: true,
  data: "Nội dung phản hồi từ AI...",
  metadata: {
    inputMessage: "Tin nhắn đã gửi",
    responseLength: 1234,
    model: 'gemini'
  }
}
```

Hoặc khi có lỗi:

```javascript
{
  success: false,
  error: "Mô tả lỗi",
  code: "TEXTAREA_NOT_FOUND",  // Hoặc "REQUEST_ERROR"
  metadata: {
    inputMessage: "Tin nhắn đã gửi"
  }
}
```

#### Ví dụ 1: Chat đơn giản

```javascript
const WrgemClient = require('./index');

async function simpleChat() {
  const client = new WrgemClient();
  
  // Khởi tạo (browser sẽ đóng sau khi init)
  await client.init();
  
  // Chat lần 1 (browser sẽ mở lại và giữ mở)
  const response1 = await client.request_aistudio('Xin chào!');
  console.log('AI:', response1.data);
  
  // Chat lần 2 (dùng lại browser đang mở)
  const response2 = await client.request_aistudio('Bạn khỏe không?');
  console.log('AI:', response2.data);
  
  // Đóng browser khi hoàn thành
  await client.close();
}

simpleChat();
```

#### Ví dụ 2: Chat với callback theo dõi trạng thái

```javascript
const WrgemClient = require('./index');

async function chatWithStatus() {
  const client = new WrgemClient();
  await client.init();
  
  const response = await client.request_aistudio('Giải thích AI là gì?', {
    onStatus: (status) => {
      const statusMessages = {
        'reconnecting': '🔄 Đang kết nối...',
        'finding_input': '🔍 Đang tìm ô nhập...',
        'filling_message': '✍️  Đang viết tin nhắn...',
        'sending_request': '📤 Đang gửi...',
        'waiting_response': '⏳ Đang chờ phản hồi...'
      };
      console.log(statusMessages[status] || status);
    }
  });
  
  console.log('\n📩 Phản hồi:', response.data);
  console.log('📊 Độ dài:', response.metadata.responseLength, 'ký tự');
  
  await client.close();
}

chatWithStatus();
```

#### Ví dụ 3: Chat liên tục (giống chatbot)

```javascript
const WrgemClient = require('./index');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

async function chatbot() {
  const client = new WrgemClient();
  await client.init();
  
  console.log('🤖 Chatbot đã sẵn sàng! Gõ "exit" để thoát.\n');
  
  const askQuestion = () => {
    rl.question('Bạn: ', async (message) => {
      if (message.toLowerCase() === 'exit') {
        await client.close();
        rl.close();
        return;
      }
      
      const response = await client.request_aistudio(message);
      
      if (response.success) {
        console.log('AI:', response.data, '\n');
      } else {
        console.log('Lỗi:', response.error, '\n');
      }
      
      askQuestion(); // Tiếp tục hỏi
    });
  };
  
  askQuestion();
}

chatbot();
```

#### Ví dụ 4: Xử lý lỗi

```javascript
const WrgemClient = require('./index');

async function chatWithErrorHandling() {
  const client = new WrgemClient();
  
  try {
    await client.init();
    
    const response = await client.request_aistudio('Hello AI!');
    
    if (response.success) {
      console.log('Thành công:', response.data);
    } else {
      console.error('Lỗi:', response.error);
      console.error('Mã lỗi:', response.code);
    }
  } catch (error) {
    console.error('Lỗi không mong đợi:', error.message);
  } finally {
    await client.close();
  }
}

chatWithErrorHandling();
```

---

### Phương thức: `close()`

Đóng browser và giải phóng tài nguyên.

#### Tham số

Không có tham số.

#### Hành vi

1. Đóng tất cả các page đang mở
2. Đóng browser instance
3. Xóa client khỏi registry
4. Giải phóng tài nguyên

#### Giá trị trả về

`Promise<void>` - Không trả về giá trị

#### Lưu ý

- Luôn gọi `close()` khi hoàn thành để tránh rò rỉ tài nguyên
- Có thể sử dụng trong block `finally` để đảm bảo được gọi
- Process tự động cleanup khi nhận SIGINT/SIGTERM

#### Ví dụ 1: Đóng thủ công

```javascript
const WrgemClient = require('./index');

async function example() {
  const client = new WrgemClient();
  await client.init();
  
  await client.request_aistudio('Test message');
  
  // Đóng khi xong việc
  await client.close();
  console.log('Browser đã đóng');
}

example();
```

#### Ví dụ 2: Tự động đóng với try-finally

```javascript
const WrgemClient = require('./index');

async function safeExample() {
  const client = new WrgemClient();
  
  try {
    await client.init();
    await client.request_aistudio('Test');
  } finally {
    // Đảm bảo browser luôn được đóng
    await client.close();
  }
}

safeExample();
```

---

## Quản lý vòng đời Browser

### Lifecycle Flow

```
┌─────────────┐
│   init()    │  ← Browser mở, kiểm tra session, rồi ĐÓNG
└─────────────┘
       │
       ▼
┌──────────────────┐
│ request_aistudio │  ← Browser mở lại và GIỮ MỞ
└──────────────────┘
       │
       ▼
┌──────────────────┐
│ request_aistudio │  ← Dùng lại browser đang mở
└──────────────────┘
       │
       ▼
┌──────────────────┐
│ request_aistudio │  ← Dùng lại browser đang mở
└──────────────────┘
       │
       ▼
┌─────────────┐
│   close()   │  ← ĐÓNG browser
└─────────────┘
```

### Auto Cleanup

Thư viện tự động cleanup browser khi:
- Nhận tín hiệu SIGINT (Ctrl+C)
- Nhận tín hiệu SIGTERM
- Process kết thúc (beforeExit)

```javascript
// Không cần lo lắng, browser sẽ tự động đóng khi bạn Ctrl+C
const client = new WrgemClient();
await client.init();
await client.request_aistudio('Hello');
// Ctrl+C → Browser tự động đóng
```

---

## Best Practices

### 1. Tái sử dụng Client Instance

```javascript
// ✅ ĐÚNG - Tạo một instance và dùng nhiều lần
const client = new WrgemClient();
await client.init();
await client.request_aistudio('Message 1');
await client.request_aistudio('Message 2');
await client.close();

// ❌ SAI - Tạo nhiều instance không cần thiết
for (let i = 0; i < 10; i++) {
  const client = new WrgemClient(); // Lãng phí tài nguyên
  await client.init();
  await client.request_aistudio('Message');
  await client.close();
}
```

### 2. Luôn gọi close()

```javascript
// ✅ ĐÚNG - Sử dụng finally
try {
  const client = new WrgemClient();
  await client.init();
  await client.request_aistudio('Message');
} finally {
  await client.close();
}

// ❌ SAI - Không đóng browser
const client = new WrgemClient();
await client.init();
await client.request_aistudio('Message');
// Quên close() → Browser vẫn chạy ngầm
```

### 3. Xử lý lỗi đúng cách

```javascript
// ✅ ĐÚNG - Kiểm tra success
const response = await client.request_aistudio('Message');
if (response.success) {
  console.log(response.data);
} else {
  console.error('Lỗi:', response.error);
}

// ❌ SAI - Không kiểm tra lỗi
const response = await client.request_aistudio('Message');
console.log(response.data); // Có thể undefined nếu lỗi
```

### 4. Sử dụng callback khi cần feedback

```javascript
// ✅ ĐÚNG - Hiển thị trạng thái cho người dùng
await client.request_aistudio('Message', {
  onStatus: (status) => console.log('⏳', status)
});

// ✅ CŨNG OK - Không cần callback nếu không cần feedback ngay
await client.request_aistudio('Message');
```

---

## Các trường hợp sử dụng

### Use Case 1: Batch Processing

```javascript
const WrgemClient = require('./index');

async function batchProcess(questions) {
  const client = new WrgemClient();
  
  try {
    await client.init();
    
    const results = [];
    for (const question of questions) {
      console.log('Đang xử lý:', question);
      const response = await client.request_aistudio(question);
      results.push({
        question,
        answer: response.data,
        success: response.success
      });
    }
    
    return results;
  } finally {
    await client.close();
  }
}

// Sử dụng
const questions = [
  'AI là gì?',
  'Machine Learning hoạt động như thế nào?',
  'Phân biệt AI và ML'
];

batchProcess(questions).then(results => {
  results.forEach(r => {
    console.log('\nQ:', r.question);
    console.log('A:', r.answer);
  });
});
```

### Use Case 2: Server Integration

```javascript
const express = require('express');
const WrgemClient = require('./index');

const app = express();
app.use(express.json());

// Tạo một client dùng chung
let client = null;

async function initClient() {
  client = new WrgemClient();
  await client.init();
  console.log('AI Client đã sẵn sàng');
}

app.post('/api/chat', async (req, res) => {
  try {
    const { message } = req.body;
    const response = await client.request_aistudio(message);
    
    res.json({
      success: response.success,
      answer: response.data,
      error: response.error
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Cleanup khi shutdown
process.on('SIGTERM', async () => {
  if (client) await client.close();
  process.exit(0);
});

// Khởi động server
initClient().then(() => {
  app.listen(3000, () => {
    console.log('Server đang chạy tại http://localhost:3000');
  });
});
```

### Use Case 3: Context-aware Chat

```javascript
const WrgemClient = require('./index');

async function contextAwareChat() {
  const client = new WrgemClient();
  await client.init();
  
  // Context được AI Studio tự động quản lý trong UI
  // Các tin nhắn tiếp theo sẽ nhớ context
  
  await client.request_aistudio('Tôi tên là Nam');
  await client.request_aistudio('Tôi thích lập trình');
  
  // AI sẽ nhớ tên và sở thích từ các tin nhắn trước
  const response = await client.request_aistudio('Tên tôi là gì?');
  console.log(response.data); // "Tên bạn là Nam"
  
  await client.close();
}

contextAwareChat();
```

---

## Troubleshooting

### Browser không mở khi init()

**Nguyên nhân**: Đã có session từ lần chạy trước

**Giải pháp**: 
```bash
# Xóa session để login lại
rm -rf ~/.wrgem_data
```

### Timeout khi chờ response

**Nguyên nhân**: Câu hỏi quá phức tạp hoặc mạng chậm

**Giải pháp**: Timeout mặc định là 60s, có thể tăng bằng cách sửa timeout trong source code

### Lỗi "Textarea not found"

**Nguyên nhân**: Page AI Studio thay đổi cấu trúc hoặc chưa load xong

**Giải pháp**: 
- Kiểm tra lại URL AI Studio có đúng không
- Đảm bảo đã đăng nhập thành công
- Thử reconnect bằng cách gửi lại request

---

## Giới hạn

- Yêu cầu đăng nhập Google account
- Phụ thuộc vào giao diện web của AI Studio
- Timeout 60s cho mỗi response
- Không hỗ trợ upload file/image
- Chỉ hỗ trợ text chat

---

## License

MIT
