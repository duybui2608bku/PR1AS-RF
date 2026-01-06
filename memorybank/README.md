# Memory Bank - PR1AS Project

Memory Bank là tập hợp tài liệu tổng hợp về kiến trúc, patterns, và implementation details của dự án PR1AS.

## Cấu trúc Memory Bank

### Core Documents

- **[project-overview.md](./project-overview.md)**: Tổng quan về dự án, kiến trúc tổng thể, và các tính năng chính
- **[backend.md](./backend.md)**: Chi tiết về backend architecture, patterns, và implementation
- **[frontend.md](./frontend.md)**: Chi tiết về frontend architecture, components, và patterns
- **[api-reference.md](./api-reference.md)**: Tài liệu API reference đầy đủ cho tất cả endpoints

### Module-Specific Documents

- **[wallet.md](./wallet.md)**: Hệ thống Wallet với VNPay integration
- **[chat.md](./chat.md)**: Hệ thống Chat/Messaging với Socket.IO

## Cách sử dụng Memory Bank

### Cho Developers mới

1. Bắt đầu với `project-overview.md` để hiểu tổng quan dự án
2. Đọc `backend.md` hoặc `frontend.md` tùy theo phần bạn làm việc
3. Tham khảo `api-reference.md` khi cần làm việc với APIs
4. Đọc module-specific docs khi làm việc với các tính năng cụ thể

### Khi phát triển tính năng mới

1. Tham khảo các patterns trong `backend.md` hoặc `frontend.md`
2. Follow coding conventions và architecture patterns
3. Update memory bank khi thêm tính năng mới hoặc thay đổi architecture

### Khi debug hoặc troubleshoot

1. Kiểm tra `api-reference.md` để verify API contracts
2. Tham khảo module-specific docs để hiểu flow
3. Check error codes và handling patterns

## Cập nhật Memory Bank

### Khi nào cần update

- Thêm tính năng mới hoặc module mới
- Thay đổi architecture hoặc patterns
- Thêm/sửa API endpoints
- Thay đổi database schema
- Thêm dependencies hoặc công nghệ mới

### Cách update

1. Update file liên quan trong memory bank
2. Tạo file mới nếu module/tính năng mới đủ lớn
3. Update `project-overview.md` để reflect changes
4. Update `api-reference.md` nếu có API changes
5. Commit changes với message rõ ràng

## Best Practices

### Documentation Standards

- Sử dụng tiếng Việt cho documentation
- Code examples và technical terms có thể dùng tiếng Anh
- Format code blocks với proper syntax highlighting
- Include examples và use cases khi có thể
- Link giữa các documents khi có liên quan

### Structure

- Mỗi document nên có:
  - Tổng quan ngắn gọn
  - Kiến trúc và components
  - API/Interface details
  - Examples và use cases
  - Security considerations
  - Future enhancements

### Maintenance

- Review và update memory bank định kỳ
- Remove outdated information
- Keep examples up-to-date với codebase
- Document breaking changes

## Quick Links

### Backend
- [Backend Architecture](./backend.md)
- [API Reference](./api-reference.md)
- [Wallet System](./wallet.md)
- [Chat System](./chat.md)

### Frontend
- [Frontend Architecture](./frontend.md)
- [API Reference](./api-reference.md)
- [Wallet Integration](./wallet.md#frontend-components)
- [Chat Integration](./chat.md#frontend-components)

### General
- [Project Overview](./project-overview.md)
- [API Reference](./api-reference.md)

## Contributing

Khi contribute vào memory bank:

1. **Be thorough**: Include đầy đủ thông tin cần thiết
2. **Be accurate**: Verify thông tin với codebase
3. **Be clear**: Sử dụng ngôn ngữ rõ ràng, dễ hiểu
4. **Be consistent**: Follow format và structure hiện có
5. **Be helpful**: Include examples và use cases thực tế

## Notes

- Memory bank được maintain song song với codebase
- Khi có conflict giữa memory bank và code, code là source of truth
- Memory bank nên được update ngay sau khi code changes
- Regular reviews giúp keep memory bank accurate và useful

