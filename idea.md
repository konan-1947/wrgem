- một thư viện javascript/typescript
- chức năng: wrapper cho aistudio.google.com, để có thể sử dụng free gemini
- cách thức thực hiện:
    + Reverse engineering API của aistudio.google.com
    + Phân tích network requests để tìm endpoints
    + Replicate các HTTP requests với proper headers và authentication
    + Cung cấp API wrapper đơn giản

## Bước 1: Thu thập thông tin

### 1.1. Phân tích Network Traffic
- Mở aistudio.google.com và DevTools (F12)
- Vào tab Network
- Gửi một message và quan sát các requests
- **Tìm kiếm:**
  - API endpoint URL (thường dạng `/api/...` hoặc `/_/...`)
  - Request method (POST/GET)
  - Request headers (Authorization, cookies, custom headers)
  - Request payload format
  - Response format

### 1.2. Xác định Authentication
- **Cookies quan trọng:**
  - `__Secure-1PSID` hoặc tương tự
  - Session cookies
- **Headers cần thiết:**
  - `Authorization` (nếu có)
  - `X-Goog-...` headers
  - `at` parameter (API token)
- **Cách lấy:**
  - Export cookies từ browser đã login
  - Hoặc dùng Puppeteer login 1 lần để lấy cookies

### 1.3. Phân tích Request Format
- Request body structure
- Protobuf encoding (nếu có)
- JSON format
- Query parameters

## Bước 2: Reverse Engineering

### 2.1. Tìm API Endpoint
Các endpoint thường gặp:
```
POST https://aistudio.google.com/_/BardChatUi/data/...
POST https://generativelanguage.googleapis.com/...
```

### 2.2. Giải mã Request
- Inspect request payload
- Xác định các fields bắt buộc:
  - Message content
  - Conversation ID
  - Model name
  - Temperature, top_p, top_k parameters
- Xác định format: JSON, form-data, hoặc protobuf

### 2.3. Giải mã Response
- Response có thể là:
  - JSON
  - Server-Sent Events (SSE) cho streaming
  - Protobuf
- Parse để lấy text response
- Handle partial responses (streaming)

## Bước 3: Implementation

### 3.1. HTTP Client Setup
```typescript
class AIStudioAPI {
  private cookies: string
  private headers: Record<string, string>
  private baseURL: string
  
  constructor(cookies: string) {
    this.cookies = cookies
    this.headers = {
      'Content-Type': 'application/json',
      'Cookie': cookies,
      'User-Agent': 'Mozilla/5.0...',
      // Các headers khác từ phân tích
    }
  }
}
```

### 3.2. Send Message Method
```typescript
async sendMessage(prompt: string): Promise<string> {
  const payload = {
    // Format từ reverse engineering
    message: prompt,
    conversationId: this.conversationId,
    // Các fields khác...
  }
  
  const response = await fetch(this.endpoint, {
    method: 'POST',
    headers: this.headers,
    body: JSON.stringify(payload)
  })
  
  return this.parseResponse(response)
}
```

### 3.3. Handle Streaming
```typescript
async *sendMessageStream(prompt: string) {
  const response = await fetch(this.endpoint, {
    method: 'POST',
    headers: this.headers,
    body: JSON.stringify(payload)
  })
  
  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  
  while (true) {
    const {done, value} = await reader.read()
    if (done) break
    
    const chunk = decoder.decode(value)
    const parsed = this.parseChunk(chunk)
    yield parsed
  }
}
```

## Bước 4: Authentication Helper

### 4.1. Cookie Extractor
```typescript
// Option 1: Manual - user cung cấp cookies
const api = new AIStudioAPI(userCookies)

// Option 2: Auto - dùng Puppeteer lấy cookies
async function getCookies() {
  const browser = await puppeteer.launch()
  const page = await browser.newPage()
  await page.goto('https://aistudio.google.com')
  // User login manually
  const cookies = await page.cookies()
  await browser.close()
  return cookies
}
```

### 4.2. Session Management
- Store cookies securely
- Detect khi cookies expired
- Refresh mechanism

## API Design

```typescript
interface AIStudioClient {
  // Initialize với cookies
  static fromCookies(cookies: string): AIStudioClient
  
  // Hoặc login lần đầu
  static async initialize(): Promise<AIStudioClient>
  
  // Send message
  sendMessage(prompt: string, options?: MessageOptions): Promise<string>
  
  // Streaming
  sendMessageStream(prompt: string): AsyncIterator<string>
  
  // Utils
  isAuthenticated(): boolean
  refreshSession(): Promise<void>
}

interface MessageOptions {
  conversationId?: string
  temperature?: number
  maxTokens?: number
}
```

## Tools Cần Thiết

### Phân tích
- Chrome DevTools Network tab
- Postman/Insomnia để test requests
- Burp Suite (advanced)

### Development
- `node-fetch` hoặc `axios` cho HTTP requests
- `eventsource` cho SSE streaming
- `protobufjs` nếu API dùng protobuf

### Testing
- Request validation
- Response parsing
- Error scenarios

## Challenges

### 1. API Stability
- Google có thể thay đổi API bất kỳ lúc nào
- **Giải pháp:** Version detection, fallback mechanisms

### 2. Authentication Complexity
- Cookies có thể có thời hạn ngắn
- Có thể cần thêm tokens động
- **Giải pháp:** Auto-refresh, re-authentication flow

### 3. Rate Limiting
- Phát hiện và handle 429 responses
- **Giải pháp:** Request throttling, exponential backoff

### 4. Request Format
- API có thể dùng encoding phức tạp
- **Giải pháp:** Careful analysis, use existing libraries

### 5. Legal/ToS
- Reverse engineering có thể vi phạm Terms of Service
- **Giải pháp:** Educational purpose disclaimer

## Next Steps

1. **Research Phase:**
   - Mở DevTools và phân tích 1-2 hours
   - Document tất cả findings
   
2. **Prototype:**
   - Implement basic request/response
   - Test với simple prompts
   
3. **Refine:**
   - Handle edge cases
   - Add streaming support
   - Error handling
   
4. **Package:**
   - Clean API
   - Documentation
   - Examples