## Demo


https://github.com/user-attachments/assets/32c964fe-3086-405e-a959-3ac41a021d67


## Các hàm công khai

| Hàm | Tham số | Mô tả | Trả về |
|-----|---------|-------|--------|
| `init(options)` | `options` (object): Cấu hình khởi tạo<br>- `userDataDir`: Thư mục lưu session<br>- `headless`: Chế độ headless | Khởi tạo client và thiết lập phiên đăng nhập. Tự động phát hiện session và chọn chế độ phù hợp. | `Promise<Object>`: Kết quả khởi tạo với thông tin session |
| `request_aistudio(message, options)` | `message` (string): Nội dung tin nhắn<br>`options` (object): Tùy chọn<br>- `onStatus`: Callback theo dõi trạng thái | Gửi tin nhắn đến Gemini và nhận phản hồi. Browser giữ mở liên tục để chat tiếp. | `Promise<Object>`: Phản hồi từ AI với nội dung và metadata |
| `close()` | Không có | Đóng browser và giải phóng tài nguyên. | `Promise<void>` |

