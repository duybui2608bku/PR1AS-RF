import { Service } from "../models/service/service";
import { WorkerService } from "../models/worker/worker-service";
import { ServiceCategory } from "../types/service/service.type";
import { logger } from "../utils/logger";

const NEW_SERVICES = [
  {
    category: ServiceCategory.ASSISTANCE,
    code: "VIRTUAL_ASSISTANT",
    icon: "Bot",
    name: { en: "Virtual Assistant", vi: "Trợ lý ảo" },
    description: {
      en: "Remote assistance.",
      vi: "## Linh hoạt – Tiết kiệm – Hiệu quả\n\nDịch vụ **Trợ lý ảo (Virtual Assistant)** giúp bạn tối ưu hóa thời gian và nguồn lực bằng cách hỗ trợ xử lý các công việc quản trị, vận hành và kỹ thuật số từ xa. Đội ngũ trợ lý chuyên nghiệp luôn sẵn sàng đồng hành cùng bạn thông qua các nền tảng trực tuyến, đảm bảo công việc được vận hành liên tục, nhanh chóng và hiệu quả.\n\n---\n\n## Dịch vụ phù hợp cho\n\n### Quản trị nội dung\n- Quản lý email và lịch làm việc\n- Soạn thảo văn bản, tài liệu\n- Thiết kế slide thuyết trình cơ bản\n- Cập nhật nội dung trên mạng xã hội\n\n### Nghiên cứu & tổng hợp\n- Tìm kiếm và tổng hợp dữ liệu\n- Phân tích đối thủ cạnh tranh\n- Lập báo cáo thị trường\n- Hỗ trợ lên kế hoạch công tác hoặc du lịch\n\n### Quản lý vận hành từ xa\n- Trực tin nhắn khách hàng (Inbox/Chat)\n- Lên lịch hẹn và nhắc việc\n- Theo dõi và quản lý To-do list\n- Hỗ trợ điều phối công việc từ xa\n\n### Hỗ trợ kỹ thuật cơ bản\n- Nhập liệu và xử lý dữ liệu thủ công\n- Chỉnh sửa video cơ bản\n- Quản lý tài liệu và lưu trữ đám mây\n- Hỗ trợ thao tác trên các nền tảng số\n\n### Hỗ trợ công việc linh hoạt\n- Xử lý nhanh các yêu cầu phát sinh\n- Phối hợp đa nền tảng làm việc trực tuyến\n- Hỗ trợ cá nhân hóa theo nhu cầu doanh nghiệp hoặc cá nhân\n\n---\n\n## Lợi ích nổi bật\n\n- Tiết kiệm chi phí vận hành và nhân sự\n- Tăng hiệu suất xử lý công việc hằng ngày\n- Chủ động vận hành mọi lúc, mọi nơi\n- Linh hoạt theo khối lượng và nhu cầu công việc\n- Giúp bạn tập trung vào các quyết định chiến lược quan trọng",
    },
    companionship_level: null,
    rules: null,
    is_active: true,
  },
  {
    category: ServiceCategory.ASSISTANCE,
    code: "DIRECT_SUPPORT",
    icon: "Headphones",
    name: { en: "Direct Support", vi: "Hỗ trợ trực tiếp" },
    description: {
      en: "Personal assistant services.",
      vi: "## Có mặt trực tiếp – Xử lý tận nơi – Đồng hành chuyên nghiệp\n\nDịch vụ **Hỗ trợ trực tiếp** kết nối bạn với đội ngũ trợ lý chuyên nghiệp sẵn sàng hiện diện trực tiếp tại địa điểm theo yêu cầu. Đây là giải pháp tối ưu cho những công việc cần sự có mặt thực tế, khả năng xử lý linh hoạt và phối hợp hiệu quả tại hiện trường.\n\n---\n\n## Dịch vụ phù hợp cho\n\n### Hỗ trợ sự kiện\n- Đón tiếp khách mời\n- Quản lý danh sách tham dự\n- Điều phối hậu cần\n- Hỗ trợ vận hành tại sự kiện\n\n### Thủ tục hành chính\n- Đại diện xử lý hồ sơ\n- Nộp chứng từ\n- Làm việc với cơ quan chức năng\n- Thực hiện các giao dịch trực tiếp\n\n### Hỗ trợ cá nhân & công việc\n- Sắp xếp lịch trình\n- Chuẩn bị hậu cần cho các cuộc họp\n- Hỗ trợ di chuyển\n- Quản lý công việc phát sinh\n\n### Giám sát & kiểm tra thực tế\n- Theo dõi tiến độ thi công\n- Kiểm tra hiện trạng mặt bằng\n- Giám sát hàng hóa\n- Xác minh thông tin tại địa điểm yêu cầu\n\n### Hỗ trợ vận hành linh hoạt\n- Đáp ứng nhanh các nhu cầu phát sinh\n- Phối hợp xử lý công việc trực tiếp\n- Đại diện làm việc thay bạn khi cần thiết\n\n---\n\n## Lợi ích nổi bật\n\n- Tiết kiệm thời gian và nguồn lực cá nhân\n- Chủ động xử lý công việc dù bạn không thể có mặt\n- Đảm bảo tính chuyên nghiệp trong giao tiếp và vận hành\n- Linh hoạt theo nhu cầu, thời gian và địa điểm yêu cầu\n- Báo cáo minh bạch, cập nhật tiến độ liên tục",
    },
    companionship_level: null,
    rules: null,
    is_active: true,
  },
  {
    category: ServiceCategory.ASSISTANCE,
    code: "TRANSLATION",
    icon: "Languages",
    name: { en: "Translation", vi: "Phiên dịch" },
    description: {
      en: "Interpretation and language support.",
      vi: "## Kết nối ngôn ngữ – Xóa bỏ rào cản\n\nDịch vụ **Phiên dịch viên (Interpreter)** cung cấp giải pháp hỗ trợ ngôn ngữ chuyên nghiệp cho đa dạng nhu cầu giao tiếp và làm việc. Từ các cuộc họp kinh doanh quan trọng đến hỗ trợ giao tiếp trong đời sống hằng ngày, đội ngũ phiên dịch viên giúp bạn truyền tải thông điệp chính xác, tự nhiên và phù hợp với từng bối cảnh văn hóa.\n\n---\n\n## Các loại hình hỗ trợ\n\n### Phiên dịch tháp tùng (Escort Interpreting)\n- Đồng hành trong các buổi gặp gỡ đối tác\n- Hỗ trợ tham quan nhà máy, hội chợ và triển lãm\n- Hỗ trợ giao dịch dân sự và làm việc trực tiếp tại địa phương\n- Linh hoạt di chuyển theo lịch trình thực tế\n\n### Phiên dịch hội nghị & đàm phán\n- Hỗ trợ các cuộc họp thương mại và kỹ thuật\n- Phiên dịch trong đàm phán hợp đồng\n- Hỗ trợ ký kết và trao đổi chuyên sâu\n- Đảm bảo tính chính xác và chuyên nghiệp trong giao tiếp\n\n### Phiên dịch chuyên ngành\n- Phiên dịch lĩnh vực Y tế, Luật, Công nghệ, Xây dựng và nhiều ngành nghề khác\n- Hỗ trợ thuật ngữ chuyên môn theo từng lĩnh vực\n- Đảm bảo khả năng truyền đạt đúng nội dung và ngữ cảnh chuyên ngành\n\n### Hỗ trợ thủ tục hành chính (Admin Translation)\n- Hướng dẫn và giải thích giấy tờ, biểu mẫu\n- Hỗ trợ làm việc với cơ quan hành chính địa phương\n- Hỗ trợ người nước ngoài trong các thủ tục cần giao tiếp trực tiếp\n- Đồng hành xử lý các tình huống phát sinh liên quan đến ngôn ngữ\n\n---\n\n## Phù hợp với\n\n- Doanh nhân và đối tác đi công tác\n- Chuyên gia nước ngoài làm việc tại địa phương\n- Cá nhân cần hỗ trợ ngôn ngữ trong bệnh viện hoặc cơ quan hành chính\n- Doanh nghiệp tổ chức hội họp, hội thảo và đàm phán quốc tế\n\n---\n\n## Lợi ích nổi bật\n\n- Giao tiếp chính xác và hiệu quả trong mọi tình huống\n- Giảm thiểu rủi ro do khác biệt ngôn ngữ và văn hóa\n- Hỗ trợ linh hoạt theo thời gian và địa điểm yêu cầu\n- Đội ngũ chuyên nghiệp với kinh nghiệm đa lĩnh vực\n- Tăng sự tự tin và thuận lợi khi làm việc trong môi trường quốc tế",
    },
    companionship_level: null,
    rules: null,
    is_active: true,
  },
  {
    category: ServiceCategory.COMPANIONSHIP,
    code: "TOUR_GUIDE",
    icon: "Map",
    name: { en: "Tour Guide", vi: "Tour guide" },
    description: {
      en: "Tour guiding and travel support.",
      vi: "## Trải nghiệm bản địa – Hành trình cá nhân hóa\n\nDịch vụ **Hướng dẫn viên địa phương (Local Guide)** mang đến cho bạn không chỉ một người dẫn đường, mà còn là người đồng hành am hiểu sâu sắc về văn hóa, ẩm thực và đời sống bản địa. Chúng tôi giúp mỗi hành trình trở nên chân thực, khác biệt và giàu trải nghiệm hơn theo đúng phong cách riêng của bạn.\n\n---\n\n## Dịch vụ tiêu chuẩn\n\n### Thiết kế lộ trình riêng\n- Xây dựng lịch trình theo sở thích cá nhân\n- Tối ưu thời gian và trải nghiệm di chuyển\n- Phù hợp với nhu cầu khám phá văn hóa, lịch sử, nhiếp ảnh hoặc ẩm thực\n\n### Trải nghiệm bản địa\n- Khám phá các địa điểm độc đáo ngoài tuyến du lịch phổ biến\n- Tiếp cận những \"hidden gems\" chỉ người địa phương am hiểu\n- Trải nghiệm nhịp sống và văn hóa địa phương chân thực\n\n### Hỗ trợ điều phối hành trình\n- Hỗ trợ đặt bàn nhà hàng, quán cà phê hoặc địa điểm tham quan\n- Sắp xếp phương tiện di chuyển phù hợp\n- Hỗ trợ xử lý các tình huống phát sinh trong chuyến đi\n\n### Kể chuyện văn hóa\n- Chia sẻ kiến thức về lịch sử, văn hóa và con người địa phương\n- Giới thiệu những nét đặc trưng ít được biết đến\n- Mang lại trải nghiệm khám phá sâu sắc và nhiều cảm xúc hơn\n\n### Đồng hành linh hoạt\n- Hỗ trợ cá nhân, nhóm bạn hoặc gia đình\n- Điều chỉnh lịch trình linh hoạt theo nhu cầu thực tế\n- Đảm bảo trải nghiệm tự do nhưng vẫn an toàn và thuận tiện\n\n---\n\n## Phù hợp với\n\n- Khách du lịch tự túc muốn khám phá sâu hơn về địa phương\n- Nhóm bạn yêu thích trải nghiệm cá nhân hóa\n- Gia đình cần người hỗ trợ điều phối và đồng hành\n- Du khách quốc tế muốn tiếp cận văn hóa bản địa một cách chân thực\n\n---\n\n## Lợi ích nổi bật\n\n- Trải nghiệm du lịch mang tính cá nhân hóa cao\n- Khám phá địa phương theo góc nhìn bản địa thực tế\n- Tiết kiệm thời gian tìm kiếm và lên kế hoạch\n- Chủ động, linh hoạt và an toàn trong suốt hành trình\n- Tạo nên những trải nghiệm đáng nhớ thay vì chỉ \"tham quan\"",
    },
    companionship_level: null,
    rules: null,
    is_active: true,
  },
  {
    category: ServiceCategory.COMPANIONSHIP,
    code: "PRESENCE",
    icon: "Users",
    name: { en: "Presence", vi: "Sự hiện diện" },
    description: {
      en: "Companionship package level 1.",
      vi: "## Thoải mái – Gần gũi – Chia sẻ niềm vui\n\nDịch vụ **Đồng hành cấp độ 1 (ĐH1)** mang đến những trải nghiệm thư giãn, nhẹ nhàng và tự nhiên trong cuộc sống thường nhật. Với tinh thần thoải mái và thân thiện, đây là hình thức đồng hành phù hợp cho những ai muốn có người cùng chia sẻ thời gian, trò chuyện và tận hưởng các hoạt động giải trí đơn giản.\n\n---\n\n## Hoạt động phù hợp\n\n- Ăn uống và khám phá địa điểm mới\n- Đi dạo, cà phê hoặc trò chuyện thư giãn\n- Xem phim và tham gia các hoạt động giải trí nhẹ nhàng\n- Đồng hành trong các hoạt động đời sống thường ngày\n- Chia sẻ thời gian và tạo nên những khoảnh khắc vui vẻ\n\n---\n\n## Môi trường hoạt động\n\nCác buổi gặp gỡ và đồng hành được ưu tiên tổ chức tại:\n- Quán cà phê\n- Công viên\n- Trung tâm thương mại\n- Rạp chiếu phim\n- Nhà hàng và không gian công cộng phù hợp\n\nĐảm bảo sự thoải mái, an toàn và tự nhiên cho cả hai bên.\n\n---\n\n## Phong cách đồng hành\n\n### Dresscode\n- Trang phục tự do (Casual)\n- Năng động, lịch sự và thoải mái\n- Phù hợp với tính chất của từng hoạt động\n\n### Tinh thần tương tác\n- Thân thiện và tích cực\n- Tôn trọng không gian cá nhân\n- Tạo cảm giác gần gũi như những người bạn đồng hành\n\n---\n\n## Giá trị cốt lõi\n\n- Mang lại cảm giác thư giãn và dễ chịu\n- Tạo nên những trải nghiệm đời thường tích cực\n- Đồng hành bằng sự hiện diện chân thành\n- Lan tỏa niềm vui qua những khoảnh khắc đơn giản\n\n---\n\n## Phù hợp với\n\n- Người cần bạn đồng hành cho các hoạt động giải trí nhẹ nhàng\n- Cá nhân muốn kết nối và trò chuyện trong không khí thoải mái\n- Người mới đến thành phố cần người đồng hành khám phá địa điểm\n- Những ai tìm kiếm trải nghiệm giao tiếp tự nhiên và tích cực",
    },
    companionship_level: 1,
    rules: null,
    is_active: true,
  },
  {
    category: ServiceCategory.COMPANIONSHIP,
    code: "CONNECTION",
    icon: "Link",
    name: { en: "Connection", vi: "Kết nối" },
    description: {
      en: "Companionship package level 2.",
      vi: "## Lịch thiệp – Kết nối – Tương tác\n\nDịch vụ **Đồng hành cấp độ 2 (ĐH2)** mang đến trải nghiệm đồng hành chỉn chu và tương tác sâu hơn trong các hoạt động đời sống, giải trí và giao tiếp xã hội. Không chỉ đơn thuần là cùng tham gia hoạt động, người đồng hành còn đóng vai trò hỗ trợ kết nối, tạo không khí thoải mái và nâng cao trải nghiệm giao tiếp.\n\n---\n\n## Hoạt động phù hợp\n\n- Đồng hành mua sắm (Shopping)\n- Trò chuyện và chia sẻ\n- Tâm sự, thư giãn sau giờ làm việc\n- Cùng chơi game hoặc tham gia hoạt động giải trí\n- Tham dự các chương trình văn nghệ hoặc sự kiện nhẹ nhàng\n- Đồng hành trong các buổi gặp gỡ mang tính giao tiếp xã hội\n\n---\n\n## Môi trường hoạt động\n\nCác hoạt động thường diễn ra tại:\n- Nhà hàng và quán cà phê\n- Trung tâm thương mại\n- Khu vui chơi và giải trí phức hợp\n- Sự kiện văn hóa hoặc hoạt động cộng đồng\n- Không gian phù hợp với giao tiếp và tương tác trực tiếp\n\nĐảm bảo sự lịch sự, thoải mái và phù hợp với từng bối cảnh.\n\n---\n\n## Phong cách đồng hành\n\n### Dresscode\n- Trang phục lịch sự (Smart Casual)\n- Gọn gàng, tinh tế và phù hợp với hoạt động\n- Chú trọng hình ảnh và tác phong giao tiếp\n\n### Kỹ năng tương tác\n- Giao tiếp tự nhiên và lịch thiệp\n- Biết lắng nghe và duy trì cuộc trò chuyện\n- Tạo cảm giác dễ chịu và kết nối tích cực\n- Hỗ trợ tương tác trong các tình huống xã hội\n\n---\n\n## Giá trị cốt lõi\n\n- Tăng sự kết nối trong giao tiếp và trải nghiệm\n- Mang lại cảm giác thoải mái và đồng điệu\n- Tạo nên những khoảnh khắc tương tác tích cực\n- Đồng hành với sự tinh tế và tôn trọng\n\n---\n\n## Phù hợp với\n\n- Người cần bạn đồng hành cho các hoạt động giải trí và giao tiếp\n- Cá nhân muốn có trải nghiệm tương tác tự nhiên, lịch sự\n- Người cần hỗ trợ kết nối trong các không gian xã hội\n- Những ai tìm kiếm sự đồng hành nhẹ nhàng nhưng chỉn chu hơn trong trải nghiệm",
    },
    companionship_level: 2,
    rules: null,
    is_active: true,
  },
  {
    category: ServiceCategory.COMPANIONSHIP,
    code: "FORMAL",
    icon: "Crown",
    name: { en: "Formal", vi: "Trang trọng" },
    description: {
      en: "Companionship package level 3.",
      vi: "## Chuyên nghiệp – Đẳng cấp – Bản lĩnh\n\nDịch vụ **Đồng hành cấp độ 3 (ĐH3)** là cấp độ đồng hành cao cấp dành cho những môi trường yêu cầu sự chuyên nghiệp, tinh tế và khả năng giao tiếp vượt trội. Người đồng hành không chỉ sở hữu tác phong chỉn chu mà còn có khả năng thích nghi linh hoạt, xử lý tình huống khéo léo và hỗ trợ hiệu quả trong các bối cảnh mang tính xã hội, công việc hoặc sự kiện cao cấp.\n\n---\n\n## Hoạt động phù hợp\n\n- Giao tiếp và tương tác đa phương trong nhóm hoặc sự kiện\n- Đồng hành tại tiệc tối, hội nghị và các buổi gặp mặt quan trọng\n- Hỗ trợ tư vấn và kết nối giao tiếp\n- Tham gia các hoạt động văn nghệ, trình diễn hoặc giải trí cao cấp\n- Đồng hành trong các trò chơi trí tuệ hoặc hoạt động cần kỹ năng chuyên môn\n- Hỗ trợ xây dựng hình ảnh và tạo ấn tượng trong môi trường xã hội\n\n---\n\n## Môi trường hoạt động\n\nCác hoạt động thường diễn ra tại:\n- Không gian cao cấp và riêng tư (Private)\n- Nhà hàng sang trọng và lounge\n- Hội nghị, gala hoặc sự kiện doanh nghiệp\n- Tiệc tối, networking và các buổi gặp gỡ đối tác\n- Không gian yêu cầu tác phong chuyên nghiệp và chuẩn mực giao tiếp cao\n\nĐảm bảo sự tinh tế, lịch sự và phù hợp với từng bối cảnh đặc thù.\n\n---\n\n## Phong cách đồng hành\n\n### Dresscode\n- Trang phục trang trọng (Formal)\n- Vest, váy tiệc hoặc trang phục công sở cao cấp\n- Hình ảnh chỉn chu, chuyên nghiệp và phù hợp với sự kiện\n\n### Kỹ năng & tác phong\n- Giao tiếp khéo léo và tinh tế\n- Tư duy linh hoạt trong các tình huống tương tác\n- Khả năng thích nghi với nhiều môi trường khác nhau\n- Tác phong tự tin, điềm tĩnh và chuyên nghiệp\n\n---\n\n## Giá trị cốt lõi\n\n- Mang lại trải nghiệm đồng hành đẳng cấp và chuyên nghiệp\n- Hỗ trợ xây dựng hình ảnh cá nhân trong các môi trường quan trọng\n- Tạo sự tự tin và thuận lợi trong giao tiếp xã hội\n- Đồng hành với sự tinh tế, bản lĩnh và trách nhiệm\n\n---\n\n## Phù hợp với\n\n- Doanh nhân và chuyên gia tham gia sự kiện cao cấp\n- Cá nhân cần người đồng hành trong môi trường giao tiếp chuyên nghiệp\n- Người tham dự hội nghị, tiệc tối hoặc hoạt động networking\n- Khách hàng yêu cầu cao về hình ảnh, tác phong và kỹ năng giao tiếp",
    },
    companionship_level: 3,
    rules: null,
    is_active: true,
  },
];

const EXPECTED_CODES = NEW_SERVICES.map((s) => s.code);

export async function seedServices(): Promise<void> {
  const existingCount = await Service.countDocuments({
    code: { $in: EXPECTED_CODES },
    "description.vi": { $nin: [null, ""] },
  });

  if (existingCount === EXPECTED_CODES.length) {
    logger.info("Services already seeded, skipping.");
    return;
  }

  await WorkerService.deleteMany({});
  await Service.deleteMany({});
  await Service.insertMany(NEW_SERVICES);
  logger.info(`Seeded ${NEW_SERVICES.length} services.`);
}
