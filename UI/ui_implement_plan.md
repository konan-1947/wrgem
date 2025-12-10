# Kế Hoạch Implement TUI cho AIStudio Client

## Mục Tiêu

Refactor `examples/aistudio-example.js` sang sử dụng Ink framework để có TUI chuyên nghiệp, dễ maintain và mở rộng.

## Công Nghệ Sử Dụng

### Core
- **Ink**: React-based terminal UI framework
- **React**: Quản lý component và state
- **ink-text-input**: Component nhập liệu
- **ink-spinner**: Loading indicator
- **chalk**: Màu sắc terminal

### Lý Do Chọn Ink
- Component-based architecture dễ maintain
- Hỗ trợ Flexbox layout tự nhiên
- Quản lý state với React hooks
- Xử lý streaming text hiệu quả
- Community lớn và nhiều components có sẵn

## Cấu Trúc File Mới

```
examples/
├── aistudio-ink.js          # Entry point mới với Ink
├── components/              # React components cho TUI
│   ├── App.js              # Main app component
│   ├── ChatView.js         # Hiển thị conversation
│   ├── InputBox.js         # Input field với prompt
│   ├── StatusBar.js        # Status bar (separator + status)
│   ├── ThinkingIndicator.js # Thinking animation
│   └── Message.js          # Single message component
└── hooks/
    └── useAIStudio.js      # Hook quản lý AIStudio client
```

## Chi Tiết Implementation

### Phase 1: Setup và Dependencies

**Cài đặt packages:**
```bash
npm install ink react ink-text-input ink-spinner chalk
```

### Phase 2: Tạo Components

#### 1. Message.js
Component hiển thị một tin nhắn (user hoặc assistant).

**Props:**
- `role`: 'user' | 'assistant'
- `content`: string
- `time`: number | null

**Chức năng:**
- Hiển thị icon khác nhau cho user/assistant
- Format nội dung với line breaks
- Hiển thị thời gian respond nếu có

#### 2. ChatView.js
Component hiển thị toàn bộ conversation history.

**Props:**
- `messages`: Array của message objects
- `height`: chiều cao available

**Chức năng:**
- Render danh sách messages
- Auto-scroll đến message mới nhất
- Xử lý layout khi nhiều messages

#### 3. ThinkingIndicator.js
Component hiển thị trạng thái thinking với animation.

**Props:**
- `elapsedTime`: number (giây)
- `showPreviousConversation`: boolean

**Chức năng:**
- Hiển thị "Thinking..." với spinner
- Đếm thời gian thinking
- Toggle giữa hiển thị conversation cũ/mới

#### 4. StatusBar.js
Component hiển thị separator và status.

**Props:**
- `status`: 'init' | 'ready' | 'thinking' | 'responding' | 'error'
- `message`: string (tùy chọn)
- `thinkingTime`: number (nếu thinking/responding)

**Chức năng:**
- Render separator line theo terminal width
- Hiển thị status message phù hợp
- Update thinking counter real-time

#### 5. InputBox.js
Component input field với prompt.

**Props:**
- `onSubmit`: (value: string) => void
- `disabled`: boolean
- `placeholder`: string

**Chức năng:**
- Hiển thị prompt "> "
- Xử lý submit khi Enter
- Disable khi đang thinking/responding
- Clear input sau submit

#### 6. App.js
Main component kết hợp tất cả components.

**State quản lý:**
- `mode`: 'init' | 'ready' | 'thinking' | 'responding'
- `messages`: Array messages
- `currentInput`: string
- `thinkingTime`: number
- `error`: string | null

**Layout:**
```
┌─────────────────────────────────┐
│                                 │
│      ChatView                   │
│      (messages)                 │
│                                 │
│                                 │
├─────────────────────────────────┤ <- StatusBar
│ > [Input]                       │ <- InputBox
└─────────────────────────────────┘
```

### Phase 3: Hooks Implementation

#### useAIStudio.js
Custom hook wrap AIStudioClient logic.

**Return values:**
```javascript
{
  isInitialized: boolean,
  isLoading: boolean,
  error: Error | null,
  sendMessage: (message: string) => Promise<void>,
  messages: Message[],
  thinkingTime: number
}
```

**Chức năng:**
- Khởi tạo AIStudioClient
- Quản lý lifecycle (init, request, cleanup)
- Handle streaming updates
- Track thinking time
- Error handling

**Implementation chi tiết:**
```javascript
const useAIStudio = () => {
  const [client] = useState(() => new AIStudioClient());
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState([]);
  const [thinkingTime, setThinkingTime] = useState(0);
  const [error, setError] = useState(null);

  // Init client on mount
  useEffect(() => {
    initClient();
    return () => cleanup();
  }, []);

  const initClient = async () => {
    // Suppress logs
    // Call client.init()
    // setIsInitialized
  };

  const sendMessage = async (text) => {
    // Tương tự requestWithStatus hiện tại
    // Nhưng update messages state thay vì render
    // onUpdate callback sẽ update message content
  };

  return {
    isInitialized,
    isLoading,
    error,
    sendMessage,
    messages,
    thinkingTime
  };
};
```

### Phase 4: Main Entry Point

#### aistudio-ink.js
Entry point khởi chạy Ink app.

```javascript
const React = require('react');
const { render } = require('ink');
const App = require('./components/App');

render(<App />);
```

## Xử Lý Streaming Text

### Chiến lược
1. Khi `onUpdate` callback được gọi từ `client.request_aistudio`:
   - Update state message cuối cùng trong array
   - Ink tự động re-render component
   - React reconciliation đảm bảo chỉ update phần thay đổi

2. Delay 500ms thinking screen:
   - Sử dụng state flag `canShowResponse`
   - setTimeout set flag sau 500ms
   - Conditional render: nếu !canShowResponse thì show thinking, else show response

### Code Example
```javascript
const [pendingMessage, setPendingMessage] = useState(null);
const [canShowResponse, setCanShowResponse] = useState(false);

const sendMessage = async (text) => {
  setCanShowResponse(false);
  
  setTimeout(() => setCanShowResponse(true), 500);
  
  const result = await client.request_aistudio(text, {
    onUpdate: (content) => {
      setPendingMessage({ role: 'assistant', content });
    }
  });
};

// Trong render:
{canShowResponse && pendingMessage && (
  <Message {...pendingMessage} />
)}
```

## Layout và Responsive

### Terminal Size Handling
- Sử dụng `useStdout()` hook của Ink để lấy terminal dimensions
- ChatView height = total height - 2 (StatusBar + InputBox)
- StatusBar separator tự động điều chỉnh width

### Flexbox Layout
```jsx
<Box flexDirection="column" height="100%">
  <Box flexGrow={1}> {/* ChatView takes remaining space */}
    <ChatView messages={messages} />
  </Box>
  <Box> {/* StatusBar fixed height */}
    <StatusBar status={mode} thinkingTime={thinkingTime} />
  </Box>
  <Box> {/* InputBox fixed height */}
    <InputBox onSubmit={handleSubmit} disabled={isLoading} />
  </Box>
</Box>
```

## Xử Lý Commands

### Commands hỗ trợ
- `exit`, `quit`: Thoát app
- `clear`: Xóa messages
- `/help`: Hiển thị help

### Implementation
Trong InputBox.onSubmit:
```javascript
const handleSubmit = (value) => {
  if (value === 'exit' || value === 'quit') {
    process.exit(0);
  }
  if (value === 'clear') {
    clearMessages();
    return;
  }
  if (value.startsWith('/')) {
    handleCommand(value);
    return;
  }
  sendMessage(value);
};
```

## Error Handling

### Loại errors
- Init error: Không thể khởi tạo client
- Request error: Lỗi khi gửi message
- Network error: Timeout, connection lost

### Hiển thị
- Error message trong StatusBar với màu đỏ
- Error message trong ChatView như một message đặc biệt
- Cho phép user retry

## Testing Strategy

### Manual Testing Checklist
1. Khởi động app hiển thị init loading states
2. Input field enable sau khi init xong
3. Gửi message hiển thị thinking screen ít nhất 500ms
4. Conversation cũ visible trong thinking mode
5. Streaming text update mượt mà
6. Thời gian thinking đếm chính xác
7. Commands (exit, clear) hoạt động đúng
8. Terminal resize không break layout
9. Error hiển thị rõ ràng
10. Multiple messages trong conversation

### Test Cases
- Fast response (< 500ms)
- Slow response (> 5s)
- Very long response (multiple paragraphs)
- Error scenarios
- Empty input
- Special characters trong input

## Migration Plan

### Step-by-step
1. Tạo folder `components/` và `hooks/`
2. Implement từng component độc lập
3. Implement useAIStudio hook
4. Tạo aistudio-ink.js entry point
5. Test từng feature riêng
6. Integration testing
7. Compare với aistudio-example.js cũ
8. Document sự khác biệt

### Backward Compatibility
- Giữ nguyên `aistudio-example.js` cũ
- `aistudio-ink.js` là version mới
- User có thể chọn sử dụng version nào
- Cả hai đều sử dụng cùng AIStudioClient

## Improvements So Với Version Cũ

### Code Quality
- Component-based thay vì monolithic
- Separation of concerns rõ ràng
- Dễ test từng component
- Reusable components

### User Experience
- Smooth animations với Ink
- Better layout management
- Consistent styling
- More responsive

### Maintainability
- Dễ thêm features mới
- Dễ customize UI
- Clear code structure
- Type-safe với JSDoc hoặc TypeScript

### Performance
- Efficient re-rendering với React reconciliation
- Chỉ update phần thay đổi
- Không clear toàn bộ screen mỗi lần

## Future Enhancements

### Phase 2 Features
- Multi-turn conversation history scrolling
- Search trong conversation
- Export conversation to file
- Custom themes với config file
- Keyboard shortcuts
- Split view (code + chat)

### Advanced Features
- Syntax highlighting cho code blocks
- Image/file attachment support
- Voice input integration
- Multiple conversation tabs
- Conversation templates
