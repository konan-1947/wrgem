# Kế hoạch phát triển CLI Wrgem

## Mục tiêu chính
Tạo một CLI tương tác với Google Gemini thông qua AI Studio dựa trên nền tảng hiện tại, tận dụng tối đa khả năng duy trì context chat của trình duyệt automation.

## Ý tưởng cốt lõi
Dự án hiện tại sử dụng cơ chế trình duyệt automation (Puppeteer) thay vì API chính thức, điều này mang lại một lợi thế đặc biệt: **khả năng duy trì context chat liên tục trong cùng một phiên làm việc**.

## Điểm khác biệt so với các CLI dùng API
- **Các CLI dùng API**: Phải quản lý conversation ID, history, context window; dễ bị giới hạn bởi API
- **CLI dựa trên trình duyệt (của chúng ta)**: Context chat được duy trì tự động bởi chính giao diện AI Studio trong trình duyệt; không giới hạn số lượng tin nhắn; hành vi giống hệt như chat web thật

## Tính năng chính
1. **Chế độ interactive**: Cho phép chat liên tục mà không mất context
2. **Duy trì toàn bộ cuộc trò chuyện**: Không cần lưu trữ history trong CLI
3. **Hiệu suất tối ưu**: Chỉ mở trình duyệt một lần cho cả phiên làm việc
4. **Trải nghiệm tự nhiên**: Hành vi giống hệt như sử dụng AI Studio trực tiếp

## Lợi ích
- Người dùng có thể tiếp tục cuộc trò chuyện mà không lo mất bối cảnh
- Không cần quản lý phức tạp như các hệ thống API
- Tận dụng tối đa khả năng của AI Studio web
- Giải pháp độc đáo so với các CLI dùng API truyền thống