2/5: ý tưởng: thay vì đăng nhập thông thường, popup vào trình duyệt trực tiếp và lấy auth

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

## Cơ chế hoạt động bên trong

### Tổng quan kiến trúc

Project sử dụng **Puppeteer** với **Stealth Plugin** để tự động hóa trình duyệt Chrome và tương tác với giao diện web của AI Studio.

```
┌─────────────────────────────────────────────────────────┐
│                    WrgemClient                          │
│  ┌──────────┐  ┌──────────┐  ┌──────────────────────┐  │
│  │  init()  │  │  chat()  │  │      close()         │  │
│  └────┬─────┘  └────┬─────┘  └──────────────────────┘  │
└───────┼─────────────┼─────────────────────────────────┘
        │             │
        ▼             ▼
┌─────────────────────────────────────────────────────────┐
│              Puppeteer + Stealth Plugin                 │
│  ┌──────────────────────────────────────────────────┐   │
│  │         Chrome Browser (Headless/Visible)        │   │
│  │  ┌────────────────────────────────────────────┐  │   │
│  │  │      aistudio.google.com/prompts/...      │  │   │
│  │  │                                            │  │   │
│  │  │  [Textarea] ← Nhập message                │  │   │
│  │  │  [Response Container] ← Lấy kết quả       │  │   │
│  │  └────────────────────────────────────────────┘  │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

### Chi tiết từng bước

#### 1. Khởi tạo Browser (init)

**File**: `src/init.js`, `src/init_aistudio.js`, `src/initFromFile.js`

##### Bước 1.1: Kiểm tra session

```javascript
// Kiểm tra thư mục userDataDir có tồn tại không
const hasSession = fs.existsSync(userDataDir);
```

- **Có session**: Gọi `initFromFile()` → Headless mode
- **Chưa có session**: Gọi `init_aistudio()` → Browser hiện để login

##### Bước 1.2: Launch browser với Puppeteer

```javascript
// Sử dụng puppeteer-extra với stealth plugin
puppeteer.use(StealthPlugin());

this.browser = await puppeteer.launch({
    headless: headless,           // 'new', true, hoặc false
    userDataDir: userDataDir,     // Lưu cookies và session
    args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-blink-features=AutomationControlled',  // Ẩn dấu hiệu automation
        '--disable-features=IsolateOrigins,site-per-process'
    ],
    defaultViewport: {
        width: 1280,
        height: 800
    }
});
```

**Các tham số quan trọng**:
- `userDataDir`: Thư mục lưu cookies, localStorage, session → Không cần login lại
- `--disable-blink-features=AutomationControlled`: Ẩn `navigator.webdriver` để tránh bị phát hiện
- `StealthPlugin()`: Thay đổi các thuộc tính browser để giống người dùng thật

##### Bước 1.3: Tạo page và set User Agent

```javascript
this.page = await this.browser.newPage();

// Set User Agent giống Chrome thật
await this.page.setUserAgent(
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
    '(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
);
```

##### Bước 1.4: Truy cập AI Studio

```javascript
await this.page.goto(
    'https://aistudio.google.com/prompts/new_chat?model=gemini-2.5-pro',
    { waitUntil: 'networkidle2' }  // Đợi network yên
);
```

##### Bước 1.5: Toggle device mode (Trick quan trọng)

```javascript
// Tạo CDP session để điều khiển DevTools Protocol
const client = await this.page.target().createCDPSession();

// Chuyển sang mobile mode
await client.send('Emulation.setDeviceMetricsOverride', {
    width: 375,
    height: 667,
    deviceScaleFactor: 2,
    mobile: true
});

await this.page.waitForTimeout(500);

// Chuyển lại desktop mode
await client.send('Emulation.clearDeviceMetricsOverride');
```

**Tại sao cần trick này?**
- AI Studio đôi khi không render đầy đủ UI khi load lần đầu
- Toggle device mode **trigger lại render** → UI hiện ra đầy đủ

##### Bước 1.6: Đợi UI load và kiểm tra login

```javascript
// Đợi textarea xuất hiện
try {
    await this.page.waitForSelector('textarea', { timeout: 10000 });
} catch (e) {
    // Nếu không thấy, reload lại
    await this.page.reload({ waitUntil: 'networkidle2' });
    await this.page.waitForSelector('textarea', { timeout: 10000 });
}

// Kiểm tra đã login chưa
const isLoggedIn = await _checkIfLoggedIn.call(this);
```

##### Bước 1.7: Kiểm tra login (_checkIfLoggedIn)

**File**: `src/_checkIfLoggedIn.js`

```javascript
// 1. Kiểm tra URL có phải trang login không
const currentUrl = this.page.url();
if (currentUrl.includes('accounts.google.com')) {
    return false;  // Đang ở trang login
}

// 2. Tìm các selector đặc trưng của AI Studio
const selectors = [
    'textarea[placeholder*="Enter"]',  // Ô nhập message
    'textarea',
    '[contenteditable="true"]'
];

for (const sel of selectors) {
    const el = await this.page.$(sel);
    if (el) {
        return true;  // Tìm thấy → Đã login
    }
}

// 3. Kiểm tra URL có hợp lệ không
if (currentUrl.includes('aistudio.google.com/app')) {
    return true;
}

return false;  // Chưa login
```

---

#### 2. Gửi message và nhận response (request_aistudio)

**File**: `src/chat.js`

##### Bước 2.1: Kiểm tra browser còn hoạt động không

```javascript
const needReconnect = !this.browser ||
    !this.page ||
    !this.browser.isConnected() ||
    this.page.isClosed();

if (needReconnect) {
    // Reconnect từ session
    await initFromFile.call(this, { headless: 'new' });
}
```

##### Bước 2.2: Tìm textarea để nhập message

```javascript
const textareaSelectors = [
    'textarea[placeholder*="Enter"]',  // Selector chính
    'textarea',                        // Fallback 1
    '[contenteditable="true"]'         // Fallback 2
];

let textarea = null;
for (const selector of textareaSelectors) {
    textarea = await this.page.$(selector);
    if (textarea) break;
}

if (!textarea) {
    throw new Error('Không tìm thấy textarea');
}
```

**Tại sao có nhiều selector?**
- AI Studio có thể thay đổi cấu trúc HTML
- Dùng nhiều selector để tăng độ tin cậy

##### Bước 2.3: Điền message vào textarea

```javascript
// Click vào textarea
await textarea.click();

// Clear nội dung cũ
await textarea.evaluate(el => el.value = '');

// Set value và trigger events
await textarea.evaluate((el, text) => {
    el.value = text;
    // Trigger events để UI nhận biết thay đổi
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
}, message);

// Đợi UI update
await this.page.waitForTimeout(300);
```

**Tại sao phải trigger events?**
- React/Angular cần events để update state
- Không trigger → UI không biết có thay đổi

##### Bước 2.4: Gửi message bằng Ctrl+Enter

```javascript
await this.page.keyboard.down('Control');
await this.page.keyboard.press('Enter');
await this.page.keyboard.up('Control');
```

**Tại sao dùng Ctrl+Enter thay vì click button?**
- Đơn giản và ổn định hơn
- Không phụ thuộc vào selector của button

##### Bước 2.5: Đợi và lấy response

**File**: `src/_waitForResponse.js`

```javascript
// Polling mỗi 500ms để kiểm tra response
const checkInterval = setInterval(async () => {
    // Chạy code trong browser context
    const responseData = await this.page.evaluate(() => {
        // 1. Tìm tất cả chat turn containers
        const containers = document.querySelectorAll('.chat-turn-container');
        
        if (containers.length > 0) {
            // 2. Lấy container cuối cùng (response mới nhất)
            const lastContainer = containers[containers.length - 1];
            
            // 3. Lấy turn content
            const turnContent = lastContainer.querySelector('.turn-content');
            
            if (turnContent) {
                // 4. Tìm ms-cmark-node (component chứa markdown đã render)
                const cmarkNode = turnContent.querySelector('ms-cmark-node');
                
                if (cmarkNode) {
                    // 5. Lấy HTML để convert sang markdown
                    const html = cmarkNode.innerHTML;
                    const textPreview = cmarkNode.textContent?.trim() || '';
                    
                    // 6. Check footer có like button không (response complete)
                    const footer = lastContainer.querySelector('.turn-footer');
                    const hasLikeButton = footer ? 
                        !!footer.querySelector('button[iconname="thumb_up"]') : false;
                    
                    return { html, textPreview, hasFooter: hasLikeButton };
                }
            }
        }
        
        return { html: '', textPreview: '', hasFooter: false };
    });
    
    // ... xử lý responseData
}, 500);
```

**Cấu trúc HTML của AI Studio**:
```html
<div class="chat-turn-container">
    <div class="turn-content">
        <ms-cmark-node>
            <!-- HTML đã render từ markdown -->
            <p>Đây là response từ AI...</p>
            <pre><code>console.log('code');</code></pre>
        </ms-cmark-node>
    </div>
    <div class="turn-footer">
        <button iconname="thumb_up">👍</button>  <!-- Xuất hiện khi hoàn thành -->
    </div>
</div>
```

##### Bước 2.6: Phát hiện response hoàn thành

```javascript
// So sánh HTML hiện tại với lần trước
if (currentHtml && currentHtml === previousText) {
    noChangeCount++;
    
    // Điều kiện hoàn thành:
    // 1. Có footer với like button (chắc chắn nhất)
    // 2. HOẶC không thay đổi sau 10 lần check (10 * 500ms = 5s)
    if (hasFooter || noChangeCount >= maxNoChange) {
        clearInterval(checkInterval);
        
        // Convert HTML sang markdown
        const finalMarkdown = htmlToMarkdown(currentHtml);
        resolve(finalMarkdown);
    }
}
```

##### Bước 2.7: Convert HTML sang Markdown

**File**: `src/htmlToMarkdown.js`

```javascript
const TurndownService = require('turndown');

const turndownService = new TurndownService({
    headingStyle: 'atx',        // # Heading
    codeBlockStyle: 'fenced',   // ```code```
    bulletListMarker: '-'       // - List item
});

function htmlToMarkdown(html) {
    return turndownService.turndown(html);
}
```

**Ví dụ convert**:
```html
<!-- Input HTML -->
<p>Đây là <strong>bold</strong> text</p>
<pre><code class="language-js">console.log('hello');</code></pre>

<!-- Output Markdown -->
Đây là **bold** text

```js
console.log('hello');
```
```

---

#### 3. Đóng browser (close)

**File**: `src/close.js`

```javascript
async function close() {
    if (this.browser) {
        await this.browser.close();
        this.browser = null;
        this.page = null;
    }
}
```

**Auto cleanup** (trong `src/main.js`):
```javascript
// Cleanup tất cả instances khi process kết thúc
process.on('SIGINT', async () => {
    console.log('\nNhận tín hiệu dừng, đang cleanup...');
    await cleanupAll();
    process.exit(0);
});
```

---

### Các kỹ thuật quan trọng

#### 1. Stealth Mode

```javascript
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());
```

**Stealth Plugin làm gì?**
- Ẩn `navigator.webdriver` (dấu hiệu automation)
- Thay đổi `navigator.plugins`, `navigator.languages`
- Fake `chrome` object
- Bypass các phương pháp phát hiện bot

#### 2. Session Persistence

```javascript
userDataDir: './session_data'
```

**Lưu trữ**:
- Cookies
- localStorage
- IndexedDB
- Service Workers

→ Không cần login lại mỗi lần chạy

#### 3. Polling Pattern

```javascript
const checkInterval = setInterval(async () => {
    // Kiểm tra response
}, 500);
```

**Tại sao dùng polling thay vì waitForSelector?**
- Response streaming → Nội dung thay đổi liên tục
- Cần theo dõi sự thay đổi, không chỉ xuất hiện
- Hỗ trợ callback `onUpdate` để hiển thị progress

#### 4. Error Recovery

```javascript
try {
    textarea = await this.page.$(selector);
} catch (error) {
    // Reconnect và thử lại
    await initFromFile.call(this, { headless: 'new' });
    textarea = await this.page.$(selector);
}
```

**Tự động xử lý**:
- Browser bị đóng → Reconnect
- Page bị crash → Reload
- Network timeout → Retry

---

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


