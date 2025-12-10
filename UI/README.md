# AIStudio TUI với Ink Framework

Terminal User Interface chuyên nghiệp cho AIStudio client sử dụng Ink framework.

## Cài Đặt Dependencies

```bash
npm install ink react ink-text-input ink-spinner chalk
```

## Chạy Ứng Dụng

```bash
node UI/index.js
```

Hoặc từ root project:

```bash
npm run ui
```

## Cấu Trúc

```
UI/
├── index.js                 # Entry point
├── components/              # React components
│   ├── App.js              # Main app component
│   ├── ChatView.js         # Hiển thị conversation
│   ├── InputBox.js         # Input field
│   ├── StatusBar.js        # Status bar
│   ├── ThinkingIndicator.js # Thinking animation
│   └── Message.js          # Single message
└── hooks/
    └── useAIStudio.js      # AIStudio client hook
```

## Tính Năng

- Component-based architecture với React
- Smooth streaming text updates
- 500ms minimum thinking screen
- Responsive layout với Flexbox
- Commands: `exit`, `quit`, `clear`
- Error handling

## So Sánh Với Version Cũ

### Ưu Điểm
- Code sạch hơn, dễ maintain
- Component reusable
- Better separation of concerns
- Smooth animations
- Dễ mở rộng features

### Version Cũ
Vẫn có sẵn tại `examples/aistudio-example.js` với ANSI codes thủ công.
