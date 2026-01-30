/**
 * Domain Type Definitions
 * Business logic and application-level types
 */

import type { Product, ProductVariant, ProductImage, Category, Inventory } from './database.types';

// =====================================================
// PRODUCT DOMAIN
// =====================================================

export interface ProductWithDetails extends Product {
  category: Category | null;
  images: ProductImage[];
  variants: ProductVariant[];
  inventory: Inventory | null;
  primary_image?: ProductImage;
  rating_average?: number;
  rating_count?: number;
  in_stock: boolean;
}

export interface ProductCardData {
  id: string;
  name: string;
  slug: string;
  price: number;
  compare_at_price: number | null;
  image_url: string | null;
  rating_average: number;
  rating_count: number;
  in_stock: boolean;
  is_featured: boolean;
}

export interface ProductFilterOptions {
  category_id?: string;
  min_price?: number;
  max_price?: number;
  is_featured?: boolean;
  search?: string;
  sort_by?: 'price_asc' | 'price_desc' | 'newest' | 'popular' | 'rating';
  limit?: number;
  offset?: number;
}

// =====================================================
// CART DOMAIN
// =====================================================

export interface CartItemWithDetails {
  id: string;
  product_id: string;
  variant_id: string | null;
  product_name: string;
  variant_name: string | null;
  sku: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  image_url: string | null;
  in_stock: boolean;
  available_quantity: number;
}

export interface CartSummary {
  items: CartItemWithDetails[];
  subtotal: number;
  discount_amount: number;
  shipping_cost: number;
  tax_amount: number;
  total: number;
  item_count: number;
}

// =====================================================
// CHECKOUT DOMAIN
// =====================================================

export interface ShippingAddress {
  full_name: string;
  phone: string;
  address_line_1: string;
  address_line_2?: string;
  city: string;
  state_province?: string;
  postal_code?: string;
  country: string;
}

export interface CheckoutData {
  email: string;
  shipping_address: ShippingAddress;
  billing_address?: ShippingAddress;
  use_shipping_for_billing: boolean;
  payment_method: string;
  coupon_code?: string;
  customer_notes?: string;
}

export interface OrderSummary {
  order_id: string;
  order_number: string;
  status: string;
  total: number;
  payment_status: string;
  created_at: string;
}

// =====================================================
// AUTH DOMAIN
// =====================================================

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  full_name: string;
  phone?: string;
}

export interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  avatar_url: string | null;
  role: string;
}

// =====================================================
// ADMIN DOMAIN
// =====================================================

export interface DashboardStats {
  total_revenue: number;
  total_orders: number;
  pending_orders: number;
  total_customers: number;
  low_stock_products: number;
  revenue_change_percentage: number;
  orders_change_percentage: number;
}

export interface SalesChartData {
  date: string;
  revenue: number;
  orders: number;
}

// =====================================================
// API RESPONSE TYPES
// =====================================================

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    code?: string;
    details?: any;
  };
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

// =====================================================
// ERROR TYPES
// =====================================================

export class DomainError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 400
  ) {
    super(message);
    this.name = 'DomainError';
  }
}

export class ValidationError extends DomainError {
  constructor(message: string, public field?: string) {
    super(message, 'VALIDATION_ERROR', 400);
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends DomainError {
  constructor(resource: string) {
    super(`${resource} not found`, 'NOT_FOUND', 404);
    this.name = 'NotFoundError';
  }
}

export class UnauthorizedError extends DomainError {
  constructor(message: string = 'Unauthorized') {
    super(message, 'UNAUTHORIZED', 401);
    this.name = 'UnauthorizedError';
  }
}

export class InsufficientStockError extends DomainError {
  constructor(productName: string, available: number) {
    super(
      `Insufficient stock for ${productName}. Only ${available} available.`,
      'INSUFFICIENT_STOCK',
      400
    );
    this.name = 'InsufficientStockError';
  }
}
