import json

# Đọc file gốc
with open('captured/api_summary_2025-12-10T06-15-30-113Z.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

# Các query names liên quan đến chat/message
relevant_queries = [
    'ChatPageQuery',
    'ChatHistoryFilteredPaginationQuery', 
    'AddMessageBreakMutation',
    'SendMessageMutation',
    'MessageFragment',
    'chatHelpers_sendMessageMutation_Mutation',
    'subscriptionsMutation'  # Để theo dõi realtime updates
]

# Các URL patterns quan trọng
relevant_url_patterns = [
    '/api/gql_POST',  # GraphQL API
]

def is_relevant_request(req):
    """Kiểm tra request có liên quan đến gọi model không"""
    url = req.get('url', '')
    headers = req.get('headers', {})
    query_name = headers.get('poe-queryname', '')
    
    # Kiểm tra query name
    if query_name and any(q in query_name for q in relevant_queries):
        return True
    
    # Kiểm tra postData có chứa message/chat
    post_data = req.get('postData', '')
    if post_data and any(keyword in post_data.lower() for keyword in ['sendmessage', 'addmessage', 'chatpage']):
        return True
        
    return False

def is_relevant_response(resp):
    """Kiểm tra response có liên quan đến message không"""
    # Lọc response dựa trên request URL
    url = resp.get('url', '')
    if '/api/gql_POST' in url:
        return True
    return False

# Lọc requests
filtered_requests = []
for req in data.get('apiRequests', []):
    if is_relevant_request(req):
        filtered_requests.append(req)
        print(f"Kept request: {req.get('headers', {}).get('poe-queryname', 'N/A')} - {req.get('url', '')[:80]}")

# Lọc responses  
filtered_responses = []
for resp in data.get('apiResponses', []):
    if is_relevant_response(resp):
        filtered_responses.append(resp)
        print(f"Kept response: {resp.get('url', '')[:80]}")

# Giữ tất cả WebSocket messages vì chúng chứa response từ AI
websocket_messages = data.get('webSocketMessages', [])

# Tạo dữ liệu mới
filtered_data = {
    'totalRequests': len(filtered_requests),
    'totalResponses': len(filtered_responses),
    'totalWebSocketMessages': len(websocket_messages),
    'apiRequests': filtered_requests,
    'apiResponses': filtered_responses,
    'webSocketMessages': websocket_messages
}

# Lưu file mới
output_file = 'captured/api_summary_filtered.json'
with open(output_file, 'w', encoding='utf-8') as f:
    json.dump(filtered_data, f, indent=2, ensure_ascii=False)

print(f"\n=== Kết quả lọc ===")
print(f"Requests gốc: {data.get('totalRequests', 0)} -> Requests đã lọc: {len(filtered_requests)}")
print(f"Responses gốc: {data.get('totalResponses', 0)} -> Responses đã lọc: {len(filtered_responses)}")
print(f"WebSocket messages: {len(websocket_messages)}")
print(f"\nĐã lưu vào: {output_file}")
