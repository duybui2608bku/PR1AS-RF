# Worker Setup Flow

Tài liệu mô tả quy trình setup profile cho Worker trong hệ thống PR1AS-RF.

## Tổng quan

Worker Setup được chia thành các bước (steps) tuần tự để người dùng hoàn thiện thông tin profile và cấu hình dịch vụ cung cấp.

---

## Step 1: Thông tin cơ bản (Basic Information)

### Mô tả

Bước này thu thập thông tin cá nhân cơ bản của Worker để hiển thị trên profile.

### Tính năng

- **Auto-fill**: Nếu user đã setup từ trước, hệ thống tự động điền các thông tin đã có vào form
- **Validation**: Validate tất cả các trường bắt buộc trước khi chuyển sang step tiếp theo

### Các trường thông tin cần thu thập

Dựa trên schema `WorkerProfile` trong `user.model.ts`:

| Trường          | Kiểu dữ liệu | Bắt buộc | Mô tả                                                              |
| --------------- | ------------ | -------- | ------------------------------------------------------------------ |
| `date_of_birth` | Date         | Không    | Ngày sinh                                                          |
| `gender`        | Enum         | Có       | Giới tính (MALE, FEMALE, OTHER)                                    |
| `height_cm`     | Number       | Không    | Chiều cao (cm)                                                     |
| `weight_kg`     | Number       | Không    | Cân nặng (kg)                                                      |
| `star_sign`     | String       | Không    | Cung hoàng đạo (dropdown select)                                   |
| `lifestyle`     | String       | Không    | Châm ngôn cuộc sống                                                |
| `hobbies`       | String[]     | Không    | Sở thích (tag system - tự tạo tag)                                 |
| `introduction`  | String       | Không    | Giới thiệu bản thân                                                |
| `quote`         | String       | Không    | Câu nói yêu thích                                                  |
| `gallery_urls`  | String[]     | Không    | Gallery ảnh (sử dụng Ant Design Image Crop để giới hạn kích thước) |

### UI Components

- Form với các input fields tương ứng
- Image upload với crop functionality (Ant Design)
- Tag input cho hobbies
- Date picker cho date_of_birth
- Select dropdown cho gender và star_sign

---

## Step 2: Dịch vụ sẽ cung cấp (Services Configuration)

### Mô tả

Bước này cho phép Worker chọn và cấu hình các dịch vụ mà họ muốn cung cấp, bao gồm việc chọn category, service cụ thể và thiết lập giá cả.

### Quy trình

#### 2.1. Chọn Category

- **API Endpoint**: `GET /api/services?category={category}`
- **Categories**:
  - `ASSISTANCE` - Dịch vụ hỗ trợ
  - `COMPANIONSHIP` - Dịch vụ đồng hành
- **UI**: Hiển thị dạng Card để user chọn category
- **Response**: Danh sách services thuộc category đó

#### 2.2. Chọn Services

- Sau khi chọn category, hiển thị danh sách các services con tương ứng với category đó
- User có thể chọn nhiều services
- Mỗi service hiển thị:
  - Tên service (đa ngôn ngữ: en, vi, zh, ko)
  - Mô tả service
  - Category
  - Rules (nếu có): physical_touch, intellectual_conversation_required, dress_code

#### 2.3. Thiết lập giá cả (Pricing)

Sau khi chọn một service, Worker cần thiết lập giá cho dịch vụ đó.

**Cấu trúc giá:**

- Một service có thể được cung cấp theo nhiều đơn vị thời gian:
  - **Theo giờ** (hourly)
  - **Theo ngày** (daily)
  - **Theo tháng** (monthly)

**Ví dụ:**

```
Service: "Dịch vụ đồng hành"
- 3 USD / 1 giờ
- 4 USD / 2 giờ
- 4 USD / 1 ngày
- 5 USD / 3 ngày
- 100 USD / 1 tháng
```

**Lưu ý:**

- Giá được nhập theo đơn vị tiền tệ mà User đang cài đặt trong hệ thống
- Cần validate giá phải là số dương
- Cần validate thời gian phải hợp lệ (ví dụ: không được nhập số giờ âm)

### API Endpoints liên quan

| Method | Endpoint                   | Mô tả                                                       |
| ------ | -------------------------- | ----------------------------------------------------------- |
| GET    | `/api/services`            | Lấy danh sách tất cả services (có thể filter theo category) |
| GET    | `/api/services/:id`        | Lấy thông tin chi tiết một service                          |
| GET    | `/api/services/code/:code` | Lấy service theo code                                       |

### Data Structure

**Service Schema** (từ `service.type.ts`):

```typescript
{
  category: ServiceCategory; // ASSISTANCE | COMPANIONSHIP
  code: string;
  name: { en, vi, zh?, ko? };
  description: { en, vi, zh?, ko? };
  companionship_level: number | null;
  rules: {
    physical_touch: boolean;
    intellectual_conversation_required: boolean;
    dress_code: DressCode;
  } | null;
  is_active: boolean;
}
```

---

## Lưu ý kỹ thuật

1. **State Management**: Cần lưu trữ state của từng step để có thể quay lại và chỉnh sửa
2. **Validation**: Validate đầy đủ ở cả client và server side
3. **Error Handling**: Xử lý lỗi một cách user-friendly
4. **Loading States**: Hiển thị loading khi gọi API
5. **Responsive**: UI phải responsive trên các thiết bị khác nhau
6. **Accessibility**: Đảm bảo accessibility cho người dùng

---

## Next Steps

- [ ] Implement Step 1 UI components
- [ ] Implement Step 2 UI components với service selection
- [ ] Implement pricing configuration form
- [ ] Tạo API endpoints cho worker profile update
- [ ] Tạo API endpoints cho worker service configuration
- [ ] Implement validation logic
- [ ] Write unit tests
