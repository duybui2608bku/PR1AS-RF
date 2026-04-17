# Worker Setup Feature Documentation

## Tổng Quan
Wizard 2 bước để worker thiết lập profile và dịch vụ.

## Cấu Trúc File
```
app/worker/setup/
├── page.tsx                        # Trang chính, điều khiển 2 step
└── components/
    ├── Step1BasicInfo.tsx           # Step 1: Thông tin cơ bản (10 sub-steps)
    ├── Step1BasicInfo.module.scss   # Styles cho Step 1
    ├── Step2Services.tsx            # Step 2: Chọn dịch vụ + định giá
    ├── Step2Services.module.scss    # Styles cho Step 2
    ├── StepLayout.tsx               # Layout wrapper cho mỗi step
    └── StepLayout.module.scss
```

## Component Hierarchy
```
WorkerSetupPage (AuthGuard)
├── Step1BasicInfo (10 sub-steps: location → gallery)
│   ├── Location sub-step (geolocation API)
│   ├── Birthday/Gender sub-step
│   ├── Height/Weight sub-step
│   ├── Experience/Title sub-step
│   ├── Star Sign sub-step
│   ├── Lifestyle sub-step
│   ├── Hobbies sub-step (tag input)
│   ├── Introduction sub-step
│   ├── Quote sub-step
│   └── Gallery sub-step (image upload + crop)
└── Step2Services (chọn dịch vụ + pricing)
```

## API Integration
| Hook | API Endpoint | Mô tả |
|------|-------------|-------|
| `useApiQueryData` | `/auth/me` | Lấy worker profile hiện tại |
| `useApiMutation` (PATCH) | `/auth/profile` | Cập nhật profile |
| `useApiMutation` (POST) | `/worker/services` | Lưu dịch vụ đã chọn |

## State Management
- **Form state**: `Form.useForm()` (Ant Design) cho input fields
- **Local state**: `stepData` (aggregate data qua 10 sub-steps), `hobbies[]`, `fileList[]`, `location`
- **Sub-step navigation**: `currentSubStep` index (0-9)

## Debug Guide
1. **Location không lấy được**: Kiểm tra browser GPS permission, navigator.geolocation support
2. **Upload ảnh lỗi**: Kiểm tra `uploadImage()` utility, file size < 5MB, format JPG/PNG/WebP
3. **Data mất khi back**: stepData được lưu trong state, form values persist qua Form instance
4. **Step 2 không save**: Kiểm tra `servicesMutation` POST `/worker/services`
