# Error Handler Utilities

Module xử lý lỗi tập trung với Ant Design notification.

## Tính năng

- ✅ Xử lý lỗi API tự động với notification
- ✅ Hỗ trợ nhiều loại lỗi (network, validation, server, etc.)
- ✅ Hiển thị thông báo lỗi chi tiết cho validation errors
- ✅ Tự động xử lý lỗi 401 (unauthorized)
- ✅ Tích hợp với axios interceptor

## Sử dụng

### 1. Tự động xử lý lỗi API

Lỗi API sẽ được xử lý tự động thông qua axios interceptor. Không cần làm gì thêm:

```typescript
import { api } from "@/lib/axios";

// Lỗi sẽ tự động hiển thị notification
const response = await api.get("/users");
```

### 2. Sử dụng hook useErrorHandler

```typescript
import { useErrorHandler } from "@/lib/hooks";

function MyComponent() {
  const { handleError, handleSuccess, handleWarning, handleInfo } = useErrorHandler();

  const handleSubmit = async () => {
    try {
      await api.post("/users", data);
      handleSuccess("Tạo người dùng thành công!");
    } catch (error) {
      handleError(error);
    }
  };

  return <button onClick={handleSubmit}>Submit</button>;
}
```

### 3. Bỏ qua notification tự động

Nếu bạn muốn tự xử lý lỗi mà không hiển thị notification tự động:

```typescript
import { api } from "@/lib/axios";

try {
  const response = await api.get("/users", {
    skipErrorNotification: true, // Bỏ qua notification tự động
  });
} catch (error) {
  // Tự xử lý lỗi ở đây
  console.error("Custom error handling:", error);
}
```

### 4. Sử dụng trực tiếp các hàm notification

```typescript
import {
  showErrorNotification,
  showSuccessNotification,
  showWarningNotification,
  showInfoNotification,
} from "@/lib/utils/error-handler";

// Hiển thị thông báo lỗi
showErrorNotification(error);

// Hiển thị thông báo thành công
showSuccessNotification("Thao tác thành công!");

// Hiển thị cảnh báo
showWarningNotification("Cảnh báo", "Mô tả chi tiết");

// Hiển thị thông tin
showInfoNotification("Thông tin", "Mô tả chi tiết");
```

## Các loại lỗi được xử lý

- **Network errors**: Lỗi kết nối mạng, timeout
- **401 Unauthorized**: Tự động logout và redirect về trang login
- **403 Forbidden**: Thông báo không có quyền truy cập
- **404 Not Found**: Thông báo không tìm thấy tài nguyên
- **422 Validation**: Hiển thị chi tiết lỗi validation
- **500+ Server errors**: Thông báo lỗi server

## Trang 404

Trang 404 được tự động xử lý bởi Next.js thông qua file `app/not-found.tsx`.

## Error Boundary

Error Boundary được tích hợp vào Providers để bắt các lỗi React:

```typescript
// Tự động bắt lỗi React errors
// Hiển thị UI lỗi với nút "Thử lại"
```

