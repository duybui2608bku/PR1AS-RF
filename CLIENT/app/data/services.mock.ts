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

