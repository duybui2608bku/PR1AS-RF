export interface ServiceUser {
  id: string;
  name: string;
  avatar: string;
}

export interface Service {
  id: string;
  title: string;
  category: string;
  categoryCode: string;
  location: string;
  price: number;
  priceUnit: string;
  rating: number;
  reviewCount: number;
  image: string;
  users: ServiceUser[];
  featured?: boolean;
  loved?: boolean;
}

// Unsplash images for different service types
const serviceImages = {
  PERSONAL_ASSISTANT: [
    'https://images.unsplash.com/photo-1551836022-d5d88e9218df?w=800&h=600&fit=crop',
    'https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=800&h=600&fit=crop',
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&h=600&fit=crop',
  ],
  ON_SITE_PROFESSIONAL_ASSIST: [
    'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?w=800&h=600&fit=crop',
    'https://images.unsplash.com/photo-1552664730-d307ca884978?w=800&h=600&fit=crop',
    'https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=800&h=600&fit=crop',
  ],
  VIRTUAL_ASSISTANT: [
    'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=800&h=600&fit=crop',
    'https://images.unsplash.com/photo-1551434678-e076c223a692?w=800&h=600&fit=crop',
    'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&h=600&fit=crop',
  ],
  TOUR_GUIDE: [
    'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=800&h=600&fit=crop',
    'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&h=600&fit=crop',
    'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=800&h=600&fit=crop',
  ],
  TRANSLATOR: [
    'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=800&h=600&fit=crop',
    'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=800&h=600&fit=crop',
    'https://images.unsplash.com/photo-1521737711867-e3b97375f902?w=800&h=600&fit=crop',
  ],
  COMPANIONSHIP_LEVEL_1: [
    'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=800&h=600&fit=crop',
    'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=800&h=600&fit=crop',
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&h=600&fit=crop',
  ],
  COMPANIONSHIP_LEVEL_2: [
    'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=800&h=600&fit=crop',
    'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=800&h=600&fit=crop',
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&h=600&fit=crop',
  ],
  COMPANIONSHIP_LEVEL_3: [
    'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=800&h=600&fit=crop',
    'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=800&h=600&fit=crop',
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&h=600&fit=crop',
  ],
};

const locations = [
  'Quận 1, TP.HCM',
  'Quận 3, TP.HCM',
  'Quận 7, TP.HCM',
  'Quận 2, TP.HCM',
  'Quận Bình Thạnh, TP.HCM',
  'Quận 10, TP.HCM',
  'Quận Phú Nhuận, TP.HCM',
  'Quận 5, TP.HCM',
  'Quận 11, TP.HCM',
  'Quận Tân Bình, TP.HCM',
  'Quận 12, TP.HCM',
  'Quận Thủ Đức, TP.HCM',
];

function getRandomImage(code: string): string {
  const images = serviceImages[code as keyof typeof serviceImages] || serviceImages.PERSONAL_ASSISTANT;
  return images[Math.floor(Math.random() * images.length)];
}

function getRandomLocation(): string {
  return locations[Math.floor(Math.random() * locations.length)];
}

function generateUsers(count: 1 | 2): ServiceUser[] {
  const userCount = Math.random() > 0.5 ? count : 1;
  const users: ServiceUser[] = [];
  for (let i = 0; i < userCount; i++) {
    users.push({
      id: `user-${Math.random().toString(36).substr(2, 9)}`,
      name: `User ${String.fromCharCode(65 + Math.floor(Math.random() * 26))}${i + 1}`,
      avatar: `https://i.pravatar.cc/150?img=${Math.floor(Math.random() * 70) + 1}`,
    });
  }
  return users;
}

export const mockServices: Service[] = [
  // ASSISTANCE - PERSONAL_ASSISTANT
  {
    id: 'asst-1',
    title: 'Trợ lý cá nhân chuyên nghiệp',
    category: 'ASSISTANCE',
    categoryCode: 'PERSONAL_ASSISTANT',
    location: getRandomLocation(),
    price: 500000,
    priceUnit: 'giờ',
    rating: 4.9,
    reviewCount: 124,
    image: getRandomImage('PERSONAL_ASSISTANT'),
    users: generateUsers(1),
    loved: true,
  },
  {
    id: 'asst-2',
    title: 'Hỗ trợ cá nhân trong sinh hoạt hằng ngày',
    category: 'ASSISTANCE',
    categoryCode: 'PERSONAL_ASSISTANT',
    location: getRandomLocation(),
    price: 450000,
    priceUnit: 'giờ',
    rating: 4.8,
    reviewCount: 89,
    image: getRandomImage('PERSONAL_ASSISTANT'),
    users: generateUsers(2),
  },
  {
    id: 'asst-3',
    title: 'Dịch vụ trợ lý cá nhân tại nhà',
    category: 'ASSISTANCE',
    categoryCode: 'PERSONAL_ASSISTANT',
    location: getRandomLocation(),
    price: 550000,
    priceUnit: 'giờ',
    rating: 4.95,
    reviewCount: 203,
    image: getRandomImage('PERSONAL_ASSISTANT'),
    users: generateUsers(1),
    loved: true,
  },
  {
    id: 'asst-4',
    title: 'Trợ lý cá nhân linh hoạt',
    category: 'ASSISTANCE',
    categoryCode: 'PERSONAL_ASSISTANT',
    location: getRandomLocation(),
    price: 480000,
    priceUnit: 'giờ',
    rating: 4.7,
    reviewCount: 156,
    image: getRandomImage('PERSONAL_ASSISTANT'),
    users: generateUsers(2),
  },
  {
    id: 'asst-5',
    title: 'Hỗ trợ cá nhân chuyên nghiệp',
    category: 'ASSISTANCE',
    categoryCode: 'PERSONAL_ASSISTANT',
    location: getRandomLocation(),
    price: 520000,
    priceUnit: 'giờ',
    rating: 4.85,
    reviewCount: 234,
    image: getRandomImage('PERSONAL_ASSISTANT'),
    users: generateUsers(1),
  },

  // ASSISTANCE - ON_SITE_PROFESSIONAL_ASSIST
  {
    id: 'onsite-1',
    title: 'Hỗ trợ chuyên môn tại chỗ',
    category: 'ASSISTANCE',
    categoryCode: 'ON_SITE_PROFESSIONAL_ASSIST',
    location: getRandomLocation(),
    price: 800000,
    priceUnit: 'buổi',
    rating: 4.9,
    reviewCount: 67,
    image: getRandomImage('ON_SITE_PROFESSIONAL_ASSIST'),
    users: generateUsers(1),
    loved: true,
  },
  {
    id: 'onsite-2',
    title: 'Dịch vụ hỗ trợ chuyên môn trực tiếp',
    category: 'ASSISTANCE',
    categoryCode: 'ON_SITE_PROFESSIONAL_ASSIST',
    location: getRandomLocation(),
    price: 750000,
    priceUnit: 'buổi',
    rating: 4.8,
    reviewCount: 98,
    image: getRandomImage('ON_SITE_PROFESSIONAL_ASSIST'),
    users: generateUsers(2),
  },
  {
    id: 'onsite-3',
    title: 'Hỗ trợ chuyên môn tại địa điểm',
    category: 'ASSISTANCE',
    categoryCode: 'ON_SITE_PROFESSIONAL_ASSIST',
    location: getRandomLocation(),
    price: 850000,
    priceUnit: 'buổi',
    rating: 4.95,
    reviewCount: 145,
    image: getRandomImage('ON_SITE_PROFESSIONAL_ASSIST'),
    users: generateUsers(1),
  },

  // ASSISTANCE - VIRTUAL_ASSISTANT
  {
    id: 'virtual-1',
    title: 'Trợ lý ảo từ xa',
    category: 'ASSISTANCE',
    categoryCode: 'VIRTUAL_ASSISTANT',
    location: 'Online',
    price: 300000,
    priceUnit: 'giờ',
    rating: 4.9,
    reviewCount: 312,
    image: getRandomImage('VIRTUAL_ASSISTANT'),
    users: generateUsers(1),
    loved: true,
  },
  {
    id: 'virtual-2',
    title: 'Hỗ trợ từ xa qua nền tảng số',
    category: 'ASSISTANCE',
    categoryCode: 'VIRTUAL_ASSISTANT',
    location: 'Online',
    price: 280000,
    priceUnit: 'giờ',
    rating: 4.85,
    reviewCount: 189,
    image: getRandomImage('VIRTUAL_ASSISTANT'),
    users: generateUsers(2),
  },
  {
    id: 'virtual-3',
    title: 'Dịch vụ trợ lý ảo chuyên nghiệp',
    category: 'ASSISTANCE',
    categoryCode: 'VIRTUAL_ASSISTANT',
    location: 'Online',
    price: 320000,
    priceUnit: 'giờ',
    rating: 4.92,
    reviewCount: 267,
    image: getRandomImage('VIRTUAL_ASSISTANT'),
    users: generateUsers(1),
  },

  // ASSISTANCE - TOUR_GUIDE
  {
    id: 'tour-1',
    title: 'Hướng dẫn viên du lịch địa phương',
    category: 'ASSISTANCE',
    categoryCode: 'TOUR_GUIDE',
    location: getRandomLocation(),
    price: 1000000,
    priceUnit: 'ngày',
    rating: 4.95,
    reviewCount: 178,
    image: getRandomImage('TOUR_GUIDE'),
    users: generateUsers(1),
    loved: true,
  },
  {
    id: 'tour-2',
    title: 'Dịch vụ hướng dẫn du lịch chuyên nghiệp',
    category: 'ASSISTANCE',
    categoryCode: 'TOUR_GUIDE',
    location: getRandomLocation(),
    price: 950000,
    priceUnit: 'ngày',
    rating: 4.88,
    reviewCount: 234,
    image: getRandomImage('TOUR_GUIDE'),
    users: generateUsers(2),
  },
  {
    id: 'tour-3',
    title: 'Hướng dẫn viên du lịch kinh nghiệm',
    category: 'ASSISTANCE',
    categoryCode: 'TOUR_GUIDE',
    location: getRandomLocation(),
    price: 1100000,
    priceUnit: 'ngày',
    rating: 4.9,
    reviewCount: 156,
    image: getRandomImage('TOUR_GUIDE'),
    users: generateUsers(1),
  },

  // ASSISTANCE - TRANSLATOR
  {
    id: 'trans-1',
    title: 'Phiên dịch và biên dịch chuyên nghiệp',
    category: 'ASSISTANCE',
    categoryCode: 'TRANSLATOR',
    location: getRandomLocation(),
    price: 600000,
    priceUnit: 'giờ',
    rating: 4.9,
    reviewCount: 145,
    image: getRandomImage('TRANSLATOR'),
    users: generateUsers(1),
    loved: true,
  },
  {
    id: 'trans-2',
    title: 'Dịch vụ phiên dịch đa ngôn ngữ',
    category: 'ASSISTANCE',
    categoryCode: 'TRANSLATOR',
    location: getRandomLocation(),
    price: 650000,
    priceUnit: 'giờ',
    rating: 4.85,
    reviewCount: 198,
    image: getRandomImage('TRANSLATOR'),
    users: generateUsers(2),
  },
  {
    id: 'trans-3',
    title: 'Phiên dịch viên chuyên nghiệp',
    category: 'ASSISTANCE',
    categoryCode: 'TRANSLATOR',
    location: getRandomLocation(),
    price: 580000,
    priceUnit: 'giờ',
    rating: 4.88,
    reviewCount: 167,
    image: getRandomImage('TRANSLATOR'),
    users: generateUsers(1),
  },

  // COMPANIONSHIP - LEVEL 1
  {
    id: 'comp1-1',
    title: 'Đồng hành cấp 1 - Nhẹ nhàng',
    category: 'COMPANIONSHIP',
    categoryCode: 'COMPANIONSHIP_LEVEL_1',
    location: getRandomLocation(),
    price: 500000,
    priceUnit: 'giờ',
    rating: 4.8,
    reviewCount: 234,
    image: getRandomImage('COMPANIONSHIP_LEVEL_1'),
    users: generateUsers(1),
    loved: true,
  },
  {
    id: 'comp1-2',
    title: 'Đồng hành không tiếp xúc cơ thể',
    category: 'COMPANIONSHIP',
    categoryCode: 'COMPANIONSHIP_LEVEL_1',
    location: getRandomLocation(),
    price: 480000,
    priceUnit: 'giờ',
    rating: 4.75,
    reviewCount: 189,
    image: getRandomImage('COMPANIONSHIP_LEVEL_1'),
    users: generateUsers(2),
  },
  {
    id: 'comp1-3',
    title: 'Dịch vụ đồng hành cấp 1',
    category: 'COMPANIONSHIP',
    categoryCode: 'COMPANIONSHIP_LEVEL_1',
    location: getRandomLocation(),
    price: 520000,
    priceUnit: 'giờ',
    rating: 4.82,
    reviewCount: 312,
    image: getRandomImage('COMPANIONSHIP_LEVEL_1'),
    users: generateUsers(1),
  },

  // COMPANIONSHIP - LEVEL 2
  {
    id: 'comp2-1',
    title: 'Đồng hành cấp 2 - Trò chuyện trí tuệ',
    category: 'COMPANIONSHIP',
    categoryCode: 'COMPANIONSHIP_LEVEL_2',
    location: getRandomLocation(),
    price: 700000,
    priceUnit: 'giờ',
    rating: 4.9,
    reviewCount: 178,
    image: getRandomImage('COMPANIONSHIP_LEVEL_2'),
    users: generateUsers(1),
    loved: true,
  },
  {
    id: 'comp2-2',
    title: 'Đồng hành có trò chuyện trí tuệ',
    category: 'COMPANIONSHIP',
    categoryCode: 'COMPANIONSHIP_LEVEL_2',
    location: getRandomLocation(),
    price: 680000,
    priceUnit: 'giờ',
    rating: 4.85,
    reviewCount: 245,
    image: getRandomImage('COMPANIONSHIP_LEVEL_2'),
    users: generateUsers(2),
  },
  {
    id: 'comp2-3',
    title: 'Dịch vụ đồng hành cấp 2 chuyên nghiệp',
    category: 'COMPANIONSHIP',
    categoryCode: 'COMPANIONSHIP_LEVEL_2',
    location: getRandomLocation(),
    price: 720000,
    priceUnit: 'giờ',
    rating: 4.88,
    reviewCount: 198,
    image: getRandomImage('COMPANIONSHIP_LEVEL_2'),
    users: generateUsers(1),
  },

  // COMPANIONSHIP - LEVEL 3
  {
    id: 'comp3-1',
    title: 'Đồng hành cấp 3 - Có tiếp xúc cơ thể',
    category: 'COMPANIONSHIP',
    categoryCode: 'COMPANIONSHIP_LEVEL_3',
    location: getRandomLocation(),
    price: 1000000,
    priceUnit: 'giờ',
    rating: 4.95,
    reviewCount: 156,
    image: getRandomImage('COMPANIONSHIP_LEVEL_3'),
    users: generateUsers(1),
    loved: true,
  },
  {
    id: 'comp3-2',
    title: 'Đồng hành có tiếp xúc cơ thể',
    category: 'COMPANIONSHIP',
    categoryCode: 'COMPANIONSHIP_LEVEL_3',
    location: getRandomLocation(),
    price: 980000,
    priceUnit: 'giờ',
    rating: 4.9,
    reviewCount: 223,
    image: getRandomImage('COMPANIONSHIP_LEVEL_3'),
    users: generateUsers(2),
  },
  {
    id: 'comp3-3',
    title: 'Dịch vụ đồng hành cấp 3',
    category: 'COMPANIONSHIP',
    categoryCode: 'COMPANIONSHIP_LEVEL_3',
    location: getRandomLocation(),
    price: 1050000,
    priceUnit: 'giờ',
    rating: 4.92,
    reviewCount: 189,
    image: getRandomImage('COMPANIONSHIP_LEVEL_3'),
    users: generateUsers(1),
  },
];
