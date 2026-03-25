export interface ServiceListing {
  id: string;
  title: string;
  image: string;
  loved?: boolean;
  category: string;
  categoryCode: string;
  location: string;
  rating: number;
  reviewCount: number;
  users: Array<{
    id: string;
    name: string;
    avatar: string;
  }>;
  price: number;
  priceUnit: string;
}
