# Các Request Quan Trọng Để Gửi/Nhận Message từ Model

## 1. GỬI MESSAGE ĐẾN MODEL

### Request: `sendMessageMutation`
- **URL**: `https://poe.com/api/gql_POST`
- **Method**: `POST`
- **Headers quan trọng**:
  - `poe-queryname`: `sendMessageMutation`
  - `poe-tchannel`: `poe-chan109-8888-suhntfkrousdsyfxctsv` (channel ID)
  - `poe-formkey`: `f32d50d70952fcd1fb3bbfaa50521b3f` (CSRF token)
  - `content-type`: `application/json`

### Request Body:
```json
{
  "queryName": "sendMessageMutation",
  "variables": {
    "chatId": null,
    "bot": "Claude-Opus-4.5",
    "query": "xin chào",
    "source": {
      "sourceType": "chat_input",
      "chatInputMetadata": {
        "useVoiceRecord": false
      }
    },
    "clientNonce": "2OtlCH93bkI14SYa",
    "sdid": "c3e6b781-97bd-4f65-8e8e-86ac7a57eeca",
    "attachments": [],
    "chatNonce": "al5CMikT56Gz268S",
    "existingMessageAttachmentsIds": [],
    "shouldFetchChat": true,
    "referencedMessageId": null,
    "parameters": null,
    "fileHashJwts": []
  },
  "extensions": {
    "hash": "f95f047271a7c0dc68454cf6df8dc24de0746ac2257fcd20e78f3b45fa929dca"
  }
}
```

### Response:
- Trả về thông tin message đã tạo
- Bao gồm `messageId`, `chatId`, `chatCode`
- Job ID để theo dõi quá trình xử lý

---

## 2. NHẬN RESPONSE TỪ MODEL

### WebSocket Connection
- **URL**: `wss://tch917001.tch.poe.com/up/chan109-8888/updates?min_seq=4807332353&channel=poe-chan109-8888-suhntfkrousdsyfxctsv&hash=17789837973223261609&generation=1`

### WebSocket Messages - Streaming Response

Response được gửi qua WebSocket theo dạng **streaming** (từng phần):

#### Message 1: Khởi tạo (text rỗng)
```json
{
  "message_type": "subscriptionUpdate",
  "payload": {
    "subscription_name": "messageAdded",
    "data": {
      "messageAdded": {
        "messageId": 457234370765,
        "text": "",
        "state": "incomplete",
        "bot": {
          "displayName": "Claude-Opus-4.5",
          "botId": 1040
        }
      }
    }
  }
}
```

#### Message 2: Streaming (ký tự đầu)
```json
{
  "messageAdded": {
    "text": "X",
    "state": "incomplete"
  }
}
```

#### Message 3: Streaming (tiếp tục)
```json
{
  "messageAdded": {
    "text": "Xin chào! Rất v",
    "state": "incomplete"
  }
}
```

#### Message 4: Streaming (gần hoàn thành)
```json
{
  "messageAdded": {
    "text": "Xin chào! Rất vui được gặp bạn.",
    "state": "incomplete"
  }
}
```

#### Message cuối: Hoàn thành
```json
{
  "messageAdded": {
    "text": "Xin chào! Rất vui được gặp bạn. B...",
    "state": "complete"
  }
}
```

---

## 3. SUBSCRIPTION - Đăng Ký Nhận Updates

### Request: `subscriptionsMutation`
- **URL**: `https://poe.com/api/gql_POST`
- **Method**: `POST`

Đăng ký các subscription để nhận realtime updates:
- `messageAdded` - Khi có message mới
- `messageCreated` - Khi message được tạo
- `messageTextUpdated` - Khi nội dung message cập nhật
- `jobStarted` - Khi job bắt đầu
- `jobUpdated` - Khi job cập nhật

---

## TÓM TẮT FLOW

1. **Gửi message**: POST request → `sendMessageMutation`
2. **Nhận job ID**: Response trả về job ID và message ID
3. **WebSocket streaming**: Nhận response từ AI qua WebSocket messages
   - Text được stream từng phần
   - State thay đổi từ `incomplete` → `complete`
4. **Kết thúc**: Message state = `complete`

---

## FILES CHỨA DỮ LIỆU

- **`api_summary_2025-12-10T06-15-30-113Z.json`**: File chính đã lọc
  - `apiRequests`: Chứa sendMessageMutation và subscriptionsMutation
  - `apiResponses`: Response từ GraphQL API
  - `webSocketMessages`: **QUAN TRỌNG NHẤT** - chứa câu trả lời từ AI

- **`websocket_2025-12-10T06-15-30-113Z.json`**: Toàn bộ WebSocket messages
- **`requests_2025-12-10T06-15-30-113Z.json`**: Toàn bộ HTTP requests
- **`responses_2025-12-10T06-15-30-113Z.json`**: Toàn bộ HTTP responses
