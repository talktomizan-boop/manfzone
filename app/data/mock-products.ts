/**
 * Mock Product Data for Development
 * Remove this file in production - use real data from Supabase
 */

export interface MockProduct {
  id: string;
  name: string;
  slug: string;
  shortDescription?: string;
  price: number;
  compare_at_price: number | null;
  image_url: string | null;
  category?: string;
  rating_average: number;
  rating_count: number;
  in_stock: boolean;
  is_featured: boolean;
}

export const mockProducts: MockProduct[] = [
  {
    id: 'p1',
    name: 'Premium Wireless Headphones',
    slug: 'premium-wireless-headphones',
    shortDescription: 'High-quality audio with noise cancellation',
    price: 8999,
    compare_at_price: 12999,
    image_url: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400',
    category: 'Electronics',
    rating_average: 5,
    rating_count: 128,
    in_stock: true,
    is_featured: true,
  },
  {
    id: 'p2',
    name: 'Smart Watch Pro',
    slug: 'smart-watch-pro',
    shortDescription: 'Track your fitness and stay connected',
    price: 15999,
    compare_at_price: 19999,
    image_url: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400',
    category: 'Electronics',
    rating_average: 4,
    rating_count: 89,
    in_stock: true,
    is_featured: true,
  },
  {
    id: 'p3',
    name: 'Classic Cotton T-Shirt',
    slug: 'classic-cotton-tshirt',
    shortDescription: 'Comfortable everyday wear',
    price: 599,
    compare_at_price: 999,
    image_url: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400',
    category: 'Fashion',
    rating_average: 4,
    rating_count: 234,
    in_stock: true,
    is_featured: false,
  },
  {
    id: 'p4',
    name: 'Running Shoes Pro',
    slug: 'running-shoes-pro',
    shortDescription: 'Professional running shoes with advanced cushioning',
    price: 3999,
    compare_at_price: 5499,
    image_url: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400',
    category: 'Fashion',
    rating_average: 5,
    rating_count: 156,
    in_stock: true,
    is_featured: true,
  },
  {
    id: 'p5',
    name: 'Leather Wallet',
    slug: 'leather-wallet',
    shortDescription: 'Premium leather wallet with RFID protection',
    price: 1299,
    compare_at_price: 1999,
    image_url: 'https://images.unsplash.com/photo-1627123424574-724758594e93?w=400',
    category: 'Fashion',
    rating_average: 4,
    rating_count: 67,
    in_stock: true,
    is_featured: false,
  },
  {
    id: 'p6',
    name: 'Ceramic Coffee Mug Set',
    slug: 'ceramic-coffee-mug-set',
    shortDescription: 'Set of 4 premium ceramic mugs',
    price: 899,
    compare_at_price: 1299,
    image_url: 'https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?w=400',
    category: 'Home & Living',
    rating_average: 5,
    rating_count: 45,
    in_stock: true,
    is_featured: false,
  },
  {
    id: 'p7',
    name: 'Yoga Mat Premium',
    slug: 'yoga-mat-premium',
    shortDescription: 'Non-slip premium yoga mat',
    price: 1299,
    compare_at_price: 1899,
    image_url: 'https://images.unsplash.com/photo-1601925260368-ae2f83cf8b7f?w=400',
    category: 'Sports',
    rating_average: 4,
    rating_count: 98,
    in_stock: true,
    is_featured: false,
  },
  {
    id: 'p8',
    name: 'Wireless Earbuds Pro',
    slug: 'wireless-earbuds-pro',
    shortDescription: 'True wireless earbuds with ANC',
    price: 4999,
    compare_at_price: 6999,
    image_url: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=400',
    category: 'Electronics',
    rating_average: 5,
    rating_count: 201,
    in_stock: true,
    is_featured: true,
  },
];
