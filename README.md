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
| `options.onUpdate` | Function | ✗ | Callback nhận response theo từng phần (streaming) |
| `options.onComplete` | Function | ✗ | Callback được gọi khi response hoàn tất |

#### Callback `onStatus`

Hàm callback nhận một tham số `status` (string) với các giá trị:

- `'reconnecting'` - Đang kết nối lại browser
- `'finding_input'` - Đang tìm ô nhập liệu
- `'filling_message'` - Đang điền tin nhắn
- `'sending_request'` - Đang gửi yêu cầu
- `'waiting_response'` - Đang chờ phản hồi
- `'streaming'` - Đang nhận response theo từng phần

#### Callback `onUpdate`

Hàm callback nhận response theo từng phần khi AI đang trả lời (streaming). Callback này sẽ được gọi nhiều lần trong quá trình AI sinh ra câu trả lời.

**Tham số:**
- `content` (String) - Nội dung response hiện tại (đã format dạng markdown)

**Lưu ý:**
- Callback này được gọi mỗi 500ms khi phát hiện có nội dung mới
- Mỗi lần gọi sẽ trả về toàn bộ nội dung từ đầu đến thời điểm hiện tại
- Phù hợp để hiển thị progress real-time trong UI

#### Callback `onComplete`

Hàm callback được gọi khi AI đã trả lời hoàn tất.

**Tham số:**
- `content` (String) - Nội dung response đầy đủ cuối cùng (đã format dạng markdown)

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
        'reconnecting': 'Đang kết nối...',
        'finding_input': 'Đang tìm ô nhập...',
        'filling_message': 'Đang viết tin nhắn...',
        'sending_request': 'Đang gửi...',
        'waiting_response': 'Đang chờ phản hồi...'
      };
      console.log(statusMessages[status] || status);
    }
  });
  
  console.log('\nPhản hồi:', response.data);
  console.log('Độ dài:', response.metadata.responseLength, 'ký tự');
  
  await client.close();
}

chatWithStatus();
```

#### Ví dụ 3: Nhận response theo từng phần (Streaming)

```javascript
const WrgemClient = require('./index');

async function chatWithStreaming() {
  const client = new WrgemClient();
  await client.init();
  
  console.log('Đang hỏi AI...\n');
  
  const response = await client.request_aistudio('Viết một bài thơ ngắn về mùa xuân', {
    onStatus: (status) => {
      if (status === 'streaming') {
        console.log('AI đang trả lời...\n');
      }
    },
    onUpdate: (content) => {
      // Xóa màn hình và hiển thị nội dung mới
      process.stdout.write('\x1Bc'); // Clear console
      console.log('AI đang viết:\n');
      console.log(content);
    },
    onComplete: (finalContent) => {
      console.log('\n--- Hoàn tất ---');
      console.log('Độ dài:', finalContent.length, 'ký tự');
    }
  });
  
  if (response.success) {
    console.log('\nResponse cuối cùng:', response.data);
  }
  
  await client.close();
}

chatWithStreaming();
```

#### Ví dụ 4: Chat liên tục (giống chatbot)

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
  
  console.log('Chatbot đã sẵn sàng! Gõ "exit" để thoát.\n');
  
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

#### Ví dụ 5: Xử lý lỗi

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


