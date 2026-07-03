import type {
  LegalContentData,
  LegalPageKey,
  LegalSection,
  LocalizedText,
} from "../types/legal";

export const LEGAL_MESSAGES = {
  FETCHED: "Legal content fetched successfully",
  UPDATED: "Legal content updated successfully",
  RESET: "Legal content reset to defaults",
} as const;

type Locale = keyof LocalizedText;

const EMPTY_LOCALIZED: LocalizedText = { vi: "", en: "", zh: "", ko: "" };

/** Build a LocalizedText from four literals. */
const t = (vi: string, en: string, zh: string, ko: string): LocalizedText => ({
  vi,
  en,
  zh,
  ko,
});

/**
 * Assemble a section body as sanitized HTML per locale from an optional lead
 * paragraph and an optional bullet list. Mirrors the layout of the original
 * next-intl legal sections (paragraph + `<ul>`).
 */
const body = (
  content?: Partial<LocalizedText>,
  items?: Record<Locale, string[]>
): LocalizedText => {
  const one = (loc: Locale): string => {
    const parts: string[] = [];
    const para = content?.[loc];
    if (para) parts.push(`<p>${para}</p>`);
    const list = items?.[loc];
    if (list && list.length > 0) {
      parts.push(`<ul>${list.map((li) => `<li>${li}</li>`).join("")}</ul>`);
    }
    return parts.join("");
  };
  return {
    vi: one("vi"),
    en: one("en"),
    zh: one("zh"),
    ko: one("ko"),
  };
};

const section = (
  title: LocalizedText,
  sectionBody: LocalizedText
): LegalSection => ({
  title,
  body: sectionBody,
});

const LAST_UPDATED_MAY_2026 = t(
  "Cập nhật lần cuối: tháng 5 năm 2026",
  "Last updated: May 2026",
  "最后更新：2026年5月",
  "최종 업데이트: 2026년 5월"
);

const PRIVACY_DEFAULT: LegalContentData = {
  title: t(
    "Chính sách bảo mật",
    "Privacy Policy",
    "隐私政策",
    "개인정보처리방침"
  ),
  lastUpdated: LAST_UPDATED_MAY_2026,
  intro: { ...EMPTY_LOCALIZED },
  sections: [
    section(
      t(
        "1. Thông tin chúng tôi thu thập",
        "1. Information We Collect",
        "1. 我们收集的信息",
        "1. 수집하는 정보"
      ),
      body(
        t(
          "Chúng tôi thu thập các thông tin bạn cung cấp khi đăng ký tài khoản bao gồm: họ và tên, địa chỉ email, số điện thoại, và thông tin thanh toán. Ngoài ra, chúng tôi có thể thu thập dữ liệu sử dụng như địa chỉ IP, loại trình duyệt, trang bạn truy cập và thời gian sử dụng nhằm cải thiện trải nghiệm dịch vụ.",
          "We collect information you provide when registering for an account, including: full name, email address, phone number, and payment information. In addition, we may collect usage data such as IP address, browser type, pages you visit and time of use to improve the service experience.",
          "我们收集您在注册账户时提供的信息，包括：姓名、电子邮件地址、电话号码和付款信息。此外，我们可能会收集使用数据，例如 IP 地址、浏览器类型、您访问的页面和使用时间，以改善服务体验。",
          "계정 등록 시 제공하는 전체 이름, 이메일 주소, 전화번호, 결제 정보를 수집합니다. 또한 서비스 경험을 개선하기 위해 IP 주소, 브라우저 유형, 방문한 페이지, 이용 시간 등 사용 데이터를 수집할 수 있습니다."
        )
      )
    ),
    section(
      t(
        "2. Mục đích sử dụng thông tin",
        "2. Purpose of Using Information",
        "2. 使用信息的目的",
        "2. 정보 이용 목적"
      ),
      body(undefined, {
        vi: [
          "Tạo và quản lý tài khoản của bạn.",
          "Xử lý giao dịch và thanh toán.",
          "Gửi thông báo liên quan đến dịch vụ, bao gồm xác nhận đặt lịch và cập nhật hệ thống.",
          "Cải thiện và phát triển tính năng sản phẩm.",
          "Tuân thủ các nghĩa vụ pháp lý.",
        ],
        en: [
          "Create and manage your account.",
          "Process transactions and payments.",
          "Send service-related notifications, including booking confirmations and system updates.",
          "Improve and develop product features.",
          "Comply with legal obligations.",
        ],
        zh: [
          "创建并管理您的账户。",
          "处理交易和付款。",
          "发送与服务相关的通知，包括预约确认和系统更新。",
          "改进和开发产品功能。",
          "履行法律义务。",
        ],
        ko: [
          "계정 생성 및 관리.",
          "거래와 결제 처리.",
          "예약 확인 및 시스템 업데이트를 포함한 서비스 관련 알림 발송.",
          "제품 기능 개선 및 개발.",
          "법적 의무 준수.",
        ],
      })
    ),
    section(
      t(
        "3. Chia sẻ thông tin",
        "3. Sharing Information",
        "3. 共享信息",
        "3. 정보 공유"
      ),
      body(
        t(
          "Chúng tôi không bán, trao đổi hoặc chuyển nhượng thông tin cá nhân của bạn cho bên thứ ba, ngoại trừ các đối tác cung cấp dịch vụ hỗ trợ vận hành nền tảng (ví dụ: cổng thanh toán) và trong trường hợp pháp luật yêu cầu.",
          "We do not sell, trade, or transfer your personal information to third parties, except for partners who provide services to support the operation of the platform (e.g., payment gateways) and in cases required by law.",
          "我们不会将您的个人信息出售、交易或转让给第三方，但为支持平台运营而提供服务的合作伙伴（例如付款网关）以及法律要求的情况除外。",
          "플랫폼 운영을 지원하는 서비스 제공 파트너(예: 결제 게이트웨이) 또는 법률상 요구되는 경우를 제외하고, 개인정보를 제3자에게 판매, 거래 또는 이전하지 않습니다."
        )
      )
    ),
    section(
      t(
        "4. Bảo mật dữ liệu",
        "4. Data Security",
        "4. 数据安全",
        "4. 데이터 보안"
      ),
      body(
        t(
          "Chúng tôi áp dụng các biện pháp kỹ thuật và tổ chức phù hợp để bảo vệ thông tin cá nhân của bạn trước nguy cơ truy cập trái phép, mất mát hoặc phá hủy. Mật khẩu được mã hóa một chiều và mọi kết nối đều sử dụng giao thức HTTPS.",
          "We apply appropriate technical and organizational measures to protect your personal information against unauthorized access, loss or destruction. Passwords are one-way encrypted and all connections use the HTTPS protocol.",
          "我们采取适当的技术和组织措施，保护您的个人信息免遭未经授权的访问、丢失或破坏。密码经过单向加密，所有连接均使用 HTTPS 协议。",
          "무단 접근, 분실 또는 파괴로부터 개인정보를 보호하기 위해 적절한 기술적 및 조직적 조치를 적용합니다. 비밀번호는 단방향으로 암호화되며 모든 연결은 HTTPS 프로토콜을 사용합니다."
        )
      )
    ),
    section(
      t("5. Cookie", "5. Cookies", "5. Cookie", "5. 쿠키"),
      body(
        t(
          "Chúng tôi sử dụng cookie phiên để duy trì trạng thái đăng nhập và cookie phân tích để hiểu cách người dùng tương tác với nền tảng. Bạn có thể vô hiệu hóa cookie trong cài đặt trình duyệt, tuy nhiên một số tính năng có thể không hoạt động đúng.",
          "We use session cookies to maintain login status and analytics cookies to understand how users interact with the platform. You can disable cookies in your browser settings, however some features may not function properly.",
          "我们使用会话 Cookie 来维护登录状态，并使用分析 Cookie 来了解用户如何与平台互动。您可以在浏览器设置中禁用 Cookie，但某些功能可能无法正常运行。",
          "로그인 상태를 유지하기 위해 세션 쿠키를 사용하고, 사용자가 플랫폼과 상호작용하는 방식을 이해하기 위해 분석 쿠키를 사용합니다. 브라우저 설정에서 쿠키를 비활성화할 수 있지만 일부 기능이 정상적으로 작동하지 않을 수 있습니다."
        )
      )
    ),
    section(
      t(
        "6. Quyền của bạn",
        "6. Your Rights",
        "6. 您的权利",
        "6. 사용자의 권리"
      ),
      body(
        t(
          "Bạn có quyền truy cập, chỉnh sửa hoặc yêu cầu xóa thông tin cá nhân của mình bất kỳ lúc nào bằng cách liên hệ với chúng tôi qua email hỗ trợ. Chúng tôi sẽ phản hồi trong vòng 7 ngày làm việc.",
          "You have the right to access, edit or request deletion of your personal information at any time by contacting us via support email. We will respond within 7 working days.",
          "您可以随时通过支持电子邮件与我们联系，访问、编辑或要求删除您的个人信息。我们将在 7 个工作日内回复。",
          "사용자는 지원 이메일을 통해 언제든지 자신의 개인정보 열람, 수정 또는 삭제를 요청할 권리가 있습니다. 당사는 영업일 기준 7일 이내에 응답합니다."
        )
      )
    ),
    section(
      t("7. Liên hệ", "7. Contact", "7. 联系我们", "7. 문의"),
      body(
        t(
          "Nếu bạn có bất kỳ câu hỏi nào về chính sách bảo mật này, vui lòng liên hệ với chúng tôi qua email được hiển thị ở chân trang.",
          "If you have any questions about this privacy policy, please contact us via the email displayed in the footer.",
          "如果您对本隐私政策有任何疑问，请通过页脚中显示的电子邮件与我们联系。",
          "이 개인정보처리방침에 대해 질문이 있으면 푸터에 표시된 이메일로 문의하세요."
        )
      )
    ),
  ],
};

const TERMS_DEFAULT: LegalContentData = {
  title: t("Điều khoản sử dụng", "Terms of Use", "使用条款", "이용약관"),
  lastUpdated: LAST_UPDATED_MAY_2026,
  intro: { ...EMPTY_LOCALIZED },
  sections: [
    section(
      t(
        "1. Chấp nhận điều khoản",
        "1. Acceptance of Terms",
        "1. 接受条款",
        "1. 약관의 수락"
      ),
      body(
        t(
          "Bằng cách truy cập hoặc sử dụng nền tảng, bạn đồng ý bị ràng buộc bởi các điều khoản và điều kiện này. Nếu bạn không đồng ý với bất kỳ phần nào, vui lòng không sử dụng dịch vụ.",
          "By accessing or using the platform, you agree to be bound by these terms and conditions. If you do not agree with any part, please do not use the service.",
          "通过访问或使用本平台，您同意受这些条款和条件的约束。如果您不同意任何部分，请不要使用该服务。",
          "플랫폼에 접근하거나 사용함으로써 본 약관에 구속되는 데 동의합니다. 일부라도 동의하지 않는 경우 서비스를 이용하지 마세요."
        )
      )
    ),
    section(
      t(
        "2. Tài khoản người dùng",
        "2. User Account",
        "2. 用户账户",
        "2. 사용자 계정"
      ),
      body(undefined, {
        vi: [
          "Bạn phải đủ 18 tuổi trở lên để đăng ký và sử dụng dịch vụ.",
          "Bạn chịu trách nhiệm bảo mật thông tin đăng nhập của mình.",
          "Mỗi người dùng chỉ được tạo một tài khoản. Tài khoản trùng lặp có thể bị xóa.",
          "Thông tin tài khoản phải chính xác và được cập nhật kịp thời.",
        ],
        en: [
          "You must be 18 years of age or older to register and use the service.",
          "You are responsible for maintaining the security of your login information.",
          "Each user can only create one account. Duplicate accounts may be deleted.",
          "Account information must be accurate and updated promptly.",
        ],
        zh: [
          "您必须年满 18 岁才能注册和使用该服务。",
          "您负责维护登录信息的安全性。",
          "每个用户只能创建一个账户。重复的账户可能会被删除。",
          "账户信息必须准确并及时更新。",
        ],
        ko: [
          "서비스를 등록하고 이용하려면 만 18세 이상이어야 합니다.",
          "로그인 정보의 보안을 유지할 책임은 사용자에게 있습니다.",
          "각 사용자는 하나의 계정만 만들 수 있습니다. 중복 계정은 삭제될 수 있습니다.",
          "계정 정보는 정확해야 하며 변경 시 즉시 업데이트해야 합니다.",
        ],
      })
    ),
    section(
      t(
        "3. Sử dụng dịch vụ",
        "3. Service Usage",
        "3. 服务使用",
        "3. 서비스 이용"
      ),
      body(
        t(
          "Bạn đồng ý không sử dụng nền tảng để:",
          "You agree not to use the platform to:",
          "您同意不将平台用于：",
          "사용자는 플랫폼을 다음 목적으로 사용하지 않을 것에 동의합니다:"
        ),
        {
          vi: [
            "Vi phạm bất kỳ luật pháp hoặc quy định hiện hành nào.",
            "Gửi nội dung spam, lừa đảo hoặc gây hại.",
            "Xâm phạm quyền riêng tư hoặc sở hữu trí tuệ của người khác.",
            "Phá hoại hoặc can thiệp vào hệ thống và máy chủ của chúng tôi.",
          ],
          en: [
            "Violate any applicable laws or regulations.",
            "Send spam, fraudulent or harmful content.",
            "Infringe upon the privacy or intellectual property rights of others.",
            "Disrupt or interfere with our systems and servers.",
          ],
          zh: [
            "违反任何适用的法律或法规。",
            "发送垃圾邮件、欺诈或有害内容。",
            "侵犯他人的隐私或知识产权。",
            "破坏或干扰我们的系统和服务器。",
          ],
          ko: [
            "관련 법률 또는 규정을 위반하는 행위.",
            "스팸, 사기성 또는 유해한 콘텐츠 전송.",
            "타인의 개인정보 또는 지식재산권 침해.",
            "당사의 시스템과 서버를 방해하거나 간섭하는 행위.",
          ],
        }
      )
    ),
    section(
      t(
        "4. Thanh toán và hoàn tiền",
        "4. Payment and Refund",
        "4. 付款和退款",
        "4. 결제 및 환불"
      ),
      body(
        t(
          "Các giao dịch nạp ví được xử lý qua cổng thanh toán được chứng nhận. Số dư trong ví chỉ có thể được sử dụng trên nền tảng. Chúng tôi không hoàn trả số dư ví trừ khi có lỗi kỹ thuật được xác nhận từ phía hệ thống.",
          "Wallet top-up transactions are processed through certified payment gateways. Wallet balance can only be used on the platform. We do not refund wallet balance unless there is a confirmed technical error from the system side.",
          "钱包充值交易通过经过认证的支付网关处理。钱包余额只能在平台上使用。除非系统方面确认存在技术错误，否则我们不退还钱包余额。",
          "지갑 충전 거래는 인증된 결제 게이트웨이를 통해 처리됩니다. 지갑 잔액은 플랫폼 내에서만 사용할 수 있습니다. 시스템 측의 확인된 기술 오류가 있는 경우를 제외하고 지갑 잔액은 환불되지 않습니다."
        )
      )
    ),
    section(
      t(
        "5. Gói dịch vụ",
        "5. Service Packages",
        "5. 服务套餐",
        "5. 서비스 패키지"
      ),
      body(
        t(
          "Các gói nâng cấp (Gold, Diamond) có hiệu lực theo chu kỳ thanh toán đã chọn. Gói tự động gia hạn trừ khi bạn hủy trước ngày gia hạn. Chúng tôi có quyền thay đổi giá hoặc tính năng gói với thông báo trước ít nhất 30 ngày.",
          "Upgrade packages (Gold, Diamond) are effective according to the selected billing cycle. Packages automatically renew unless you cancel before the renewal date. We reserve the right to change prices or package features with at least 30 days' prior notice.",
          "升级套餐（黄金、钻石）根据所选账单周期生效。套餐会自动续订，除非您在续订日期前取消。我们保留更改价格或套餐功能的权利，并至少提前 30 天通知。",
          "업그레이드 패키지(Gold, Diamond)는 선택한 청구 주기에 따라 적용됩니다. 갱신일 전에 취소하지 않으면 패키지는 자동으로 갱신됩니다. 당사는 최소 30일 전에 고지한 후 가격 또는 패키지 기능을 변경할 권리를 보유합니다."
        )
      )
    ),
    section(
      t(
        "6. Chấm dứt tài khoản",
        "6. Account Termination",
        "6. 账户终止",
        "6. 계정 종료"
      ),
      body(
        t(
          "Chúng tôi có quyền tạm ngừng hoặc xóa tài khoản nếu phát hiện hành vi vi phạm điều khoản, gian lận hoặc gây hại cho người dùng khác. Bạn cũng có thể yêu cầu xóa tài khoản bất kỳ lúc nào bằng cách liên hệ với bộ phận hỗ trợ.",
          "We reserve the right to suspend or delete accounts if we detect violations of the terms, fraud or harm to other users. You can also request account deletion at any time by contacting support.",
          "如果我们发现违反条款、欺诈或损害其他用户的行为，我们保留暂停或删除账户的权利。您也可以随时通过联系客服要求删除账户。",
          "약관 위반, 사기 또는 다른 사용자에게 피해를 주는 행위가 확인되는 경우 계정을 정지하거나 삭제할 권리를 보유합니다. 또한 사용자는 지원팀에 연락하여 언제든지 계정 삭제를 요청할 수 있습니다."
        )
      )
    ),
    section(
      t(
        "7. Giới hạn trách nhiệm",
        "7. Limitation of Liability",
        "7. 责任限制",
        "7. 책임의 제한"
      ),
      body(
        t(
          'Dịch vụ được cung cấp theo trạng thái "như hiện tại". Chúng tôi không đảm bảo dịch vụ luôn hoạt động liên tục và không chịu trách nhiệm về thiệt hại gián tiếp phát sinh từ việc sử dụng nền tảng.',
          "Service is provided on an 'as is' basis. We do not guarantee service will always be continuous and are not liable for indirect damages arising from the use of the platform.",
          "服务按“原样”提供。我们不保证服务始终连续，且不对因使用平台而产生的间接损害负责。",
          "서비스는 '있는 그대로' 제공됩니다. 서비스가 항상 중단 없이 제공된다고 보장하지 않으며, 플랫폼 사용으로 인해 발생하는 간접 손해에 대해 책임을 지지 않습니다."
        )
      )
    ),
    section(
      t(
        "8. Thay đổi điều khoản",
        "8. Changes to Terms",
        "8. 条款变更",
        "8. 약관 변경"
      ),
      body(
        t(
          "Chúng tôi có thể cập nhật điều khoản này định kỳ. Mọi thay đổi sẽ được thông báo qua email hoặc thông báo trong ứng dụng. Việc tiếp tục sử dụng dịch vụ sau khi thay đổi được áp dụng đồng nghĩa với việc bạn chấp nhận điều khoản mới.",
          "We may update these terms periodically. Any changes will be notified via email or in-app notification. Continued use of the service after changes are applied means you accept the new terms.",
          "我们可能会定期更新这些条款。任何变更都将通过电子邮件或应用内通知。在变更应用后继续使用服务意味着您接受新条款。",
          "당사는 본 약관을 주기적으로 업데이트할 수 있습니다. 변경 사항은 이메일 또는 앱 내 알림으로 안내됩니다. 변경 사항이 적용된 후 서비스를 계속 이용하면 새 약관에 동의한 것으로 간주됩니다."
        )
      )
    ),
  ],
};

/**
 * Factory default content for the legal pages. Seeds each singleton on first
 * access and is the target for the admin "reset" action. Mirrors the original
 * next-intl `Privacy` / `Terms` namespaces, which remain the SSR fallback when
 * the API is unreachable.
 */
export const LEGAL_DEFAULTS: Record<LegalPageKey, LegalContentData> = {
  privacy: PRIVACY_DEFAULT,
  terms: TERMS_DEFAULT,
};
