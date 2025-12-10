/**
 * Response Format - Cấu trúc response chuẩn cho tất cả API
 */

class ResponseFormat {
    /**
     * Tạo response thành công
     */
    static success(data, metadata = {}) {
        return {
            success: true,
            data: data,
            metadata: metadata,
            error: null,
            timestamp: new Date().toISOString()
        };
    }

    /**
     * Tạo response lỗi
     */
    static error(errorMessage, errorCode = null, metadata = {}) {
        return {
            success: false,
            data: null,
            metadata: metadata,
            error: {
                message: errorMessage,
                code: errorCode
            },
            timestamp: new Date().toISOString()
        };
    }

    /**
     * Tạo response cho streaming (update từng phần)
     */
    static streaming(partialData, metadata = {}) {
        return {
            success: true,
            data: partialData,
            metadata: {
                ...metadata,
                isStreaming: true,
                isComplete: false
            },
            error: null,
            timestamp: new Date().toISOString()
        };
    }

    /**
     * Tạo response khi streaming hoàn thành
     */
    static streamComplete(finalData, metadata = {}) {
        return {
            success: true,
            data: finalData,
            metadata: {
                ...metadata,
                isStreaming: false,
                isComplete: true
            },
            error: null,
            timestamp: new Date().toISOString()
        };
    }
}

module.exports = ResponseFormat;
