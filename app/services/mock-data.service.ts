/**
 * Mock Data Service
 * Provides in-memory data storage for admin functionality
 * Used when Supabase is not configured
 */

import type { Product, Order, Profile, OrderItem } from "~/types/database.types";

// Initialize mock data
const MOCK_PRODUCTS: Product[] = [
  {
    id: "1",
    name: "Wireless Bluetooth Headphones",
    slug: "wireless-bluetooth-headphones",
    sku: "WBH-001",
    description: "Premium wireless headphones with noise cancellation",
    short_description: "High-quality audio experience",
    category_id: "electronics",
    base_price: 3500,
    compare_at_price: 4500,
    cost_price: 2000,
    is_active: true,
    is_featured: true,
    weight_grams: 250,
    requires_shipping: true,
    track_inventory: true,
    meta_title: null,
    meta_description: null,
    created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date().toISOString(),
    deleted_at: null,
  },
  {
    id: "2",
    name: "Smart Watch Pro",
    slug: "smart-watch-pro",
    sku: "SWP-002",
    description: "Advanced fitness tracking and health monitoring",
    short_description: "Track your fitness goals",
    category_id: "electronics",
    base_price: 8500,
    compare_at_price: 10000,
    cost_price: 5000,
    is_active: true,
    is_featured: true,
    weight_grams: 100,
    requires_shipping: true,
    track_inventory: true,
    meta_title: null,
    meta_description: null,
    created_at: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date().toISOString(),
    deleted_at: null,
  },
  {
    id: "3",
    name: "Laptop Stand Adjustable",
    slug: "laptop-stand-adjustable",
    sku: "LSA-003",
    description: "Ergonomic laptop stand with multiple angles",
    short_description: "Improve your workspace ergonomics",
    category_id: "accessories",
    base_price: 1200,
    compare_at_price: 1500,
    cost_price: 600,
    is_active: true,
    is_featured: false,
    weight_grams: 800,
    requires_shipping: true,
    track_inventory: true,
    meta_title: null,
    meta_description: null,
    created_at: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date().toISOString(),
    deleted_at: null,
  },
];

const MOCK_ORDERS: Order[] = [
  {
    id: "ord-1",
    order_number: "ORD-2024-0001",
    user_id: "user-1",
    email: "customer@example.com",
    status: "pending",
    subtotal: 3500,
    discount_amount: 0,
    shipping_cost: 100,
    tax_amount: 0,
    total: 3600,
    shipping_full_name: "John Doe",
    shipping_phone: "+880 1712 345678",
    shipping_address_line_1: "123 Main Street",
    shipping_address_line_2: "Apt 4B",
    shipping_city: "Dhaka",
    shipping_state_province: "Dhaka",
    shipping_postal_code: "1000",
    shipping_country: "Bangladesh",
    billing_full_name: null,
    billing_phone: null,
    billing_address_line_1: null,
    billing_address_line_2: null,
    billing_city: null,
    billing_state_province: null,
    billing_postal_code: null,
    billing_country: null,
    customer_notes: null,
    admin_notes: null,
    ip_address: null,
    user_agent: null,
    created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date().toISOString(),
    confirmed_at: null,
    shipped_at: null,
    delivered_at: null,
    cancelled_at: null,
    deleted_at: null,
  },
  {
    id: "ord-2",
    order_number: "ORD-2024-0002",
    user_id: "user-2",
    email: "jane.smith@example.com",
    status: "processing",
    subtotal: 8500,
    discount_amount: 500,
    shipping_cost: 150,
    tax_amount: 0,
    total: 8150,
    shipping_full_name: "Jane Smith",
    shipping_phone: "+880 1812 987654",
    shipping_address_line_1: "456 Park Avenue",
    shipping_address_line_2: null,
    shipping_city: "Chittagong",
    shipping_state_province: "Chittagong",
    shipping_postal_code: "4000",
    shipping_country: "Bangladesh",
    billing_full_name: null,
    billing_phone: null,
    billing_address_line_1: null,
    billing_address_line_2: null,
    billing_city: null,
    billing_state_province: null,
    billing_postal_code: null,
    billing_country: null,
    customer_notes: "Please call before delivery",
    admin_notes: null,
    ip_address: null,
    user_agent: null,
    created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date().toISOString(),
    confirmed_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    shipped_at: null,
    delivered_at: null,
    cancelled_at: null,
    deleted_at: null,
  },
  {
    id: "ord-3",
    order_number: "ORD-2024-0003",
    user_id: "user-3",
    email: "bob@example.com",
    status: "shipped",
    subtotal: 1200,
    discount_amount: 0,
    shipping_cost: 80,
    tax_amount: 0,
    total: 1280,
    shipping_full_name: "Bob Wilson",
    shipping_phone: "+880 1912 456789",
    shipping_address_line_1: "789 Lake Road",
    shipping_address_line_2: null,
    shipping_city: "Sylhet",
    shipping_state_province: "Sylhet",
    shipping_postal_code: "3100",
    shipping_country: "Bangladesh",
    billing_full_name: null,
    billing_phone: null,
    billing_address_line_1: null,
    billing_address_line_2: null,
    billing_city: null,
    billing_state_province: null,
    billing_postal_code: null,
    billing_country: null,
    customer_notes: null,
    admin_notes: "Shipped via Standard Courier",
    ip_address: null,
    user_agent: null,
    created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date().toISOString(),
    confirmed_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    shipped_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    delivered_at: null,
    cancelled_at: null,
    deleted_at: null,
  },
];

const MOCK_ORDER_ITEMS: OrderItem[] = [
  {
    id: "item-1",
    order_id: "ord-1",
    product_id: "1",
    variant_id: null,
    product_name: "Wireless Bluetooth Headphones",
    variant_name: null,
    sku: "WBH-001",
    quantity: 1,
    unit_price: 3500,
    total_price: 3500,
    created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "item-2",
    order_id: "ord-2",
    product_id: "2",
    variant_id: null,
    product_name: "Smart Watch Pro",
    variant_name: null,
    sku: "SWP-002",
    quantity: 1,
    unit_price: 8500,
    total_price: 8500,
    created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "item-3",
    order_id: "ord-3",
    product_id: "3",
    variant_id: null,
    product_name: "Laptop Stand Adjustable",
    variant_name: null,
    sku: "LSA-003",
    quantity: 1,
    unit_price: 1200,
    total_price: 1200,
    created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

const MOCK_CUSTOMERS: Profile[] = [
  {
    id: "user-1",
    email: "customer@example.com",
    full_name: "John Doe",
    phone: "+880 1712 345678",
    avatar_url: null,
    role: "customer",
    is_active: true,
    email_verified: true,
    created_at: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date().toISOString(),
    deleted_at: null,
  },
  {
    id: "user-2",
    email: "jane.smith@example.com",
    full_name: "Jane Smith",
    phone: "+880 1812 987654",
    avatar_url: null,
    role: "customer",
    is_active: true,
    email_verified: true,
    created_at: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date().toISOString(),
    deleted_at: null,
  },
  {
    id: "user-3",
    email: "bob@example.com",
    full_name: "Bob Wilson",
    phone: "+880 1912 456789",
    avatar_url: null,
    role: "customer",
    is_active: true,
    email_verified: true,
    created_at: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date().toISOString(),
    deleted_at: null,
  },
  {
    id: "user-4",
    email: "admin@shophub.com",
    full_name: "Admin User",
    phone: "+880 1700 000000",
    avatar_url: null,
    role: "admin",
    is_active: true,
    email_verified: true,
    created_at: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date().toISOString(),
    deleted_at: null,
  },
];

// In-memory storage
class MockDataStore {
  private products: Product[] = [...MOCK_PRODUCTS];
  private orders: Order[] = [...MOCK_ORDERS];
  private orderItems: OrderItem[] = [...MOCK_ORDER_ITEMS];
  private customers: Profile[] = [...MOCK_CUSTOMERS];

  // Products
  async getProducts() {
    await this.delay();
    return this.products.filter((p) => !p.deleted_at);
  }

  async getProduct(id: string) {
    await this.delay();
    return this.products.find((p) => p.id === id && !p.deleted_at);
  }

  async createProduct(product: Omit<Product, "id" | "created_at" | "updated_at">) {
    await this.delay();
    const newProduct: Product = {
      ...product,
      id: `prod-${Date.now()}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    this.products.push(newProduct);
    return newProduct;
  }

  async updateProduct(id: string, updates: Partial<Product>) {
    await this.delay();
    const index = this.products.findIndex((p) => p.id === id);
    if (index !== -1) {
      this.products[index] = {
        ...this.products[index],
        ...updates,
        updated_at: new Date().toISOString(),
      };
      return this.products[index];
    }
    return null;
  }

  async deleteProduct(id: string) {
    await this.delay();
    const index = this.products.findIndex((p) => p.id === id);
    if (index !== -1) {
      this.products[index].deleted_at = new Date().toISOString();
      return true;
    }
    return false;
  }

  // Orders
  async getOrders() {
    await this.delay();
    return this.orders
      .filter((o) => !o.deleted_at)
      .map((order) => ({
        ...order,
        items: this.orderItems.filter((item) => item.order_id === order.id),
      }));
  }

  async getOrder(id: string) {
    await this.delay();
    const order = this.orders.find((o) => o.id === id && !o.deleted_at);
    if (order) {
      return {
        ...order,
        items: this.orderItems.filter((item) => item.order_id === order.id),
      };
    }
    return null;
  }

  async updateOrder(id: string, updates: Partial<Order>) {
    await this.delay();
    const index = this.orders.findIndex((o) => o.id === id);
    if (index !== -1) {
      this.orders[index] = {
        ...this.orders[index],
        ...updates,
        updated_at: new Date().toISOString(),
      };
      return this.orders[index];
    }
    return null;
  }

  // Customers
  async getCustomers() {
    await this.delay();
    return this.customers.filter((c) => !c.deleted_at);
  }

  async getCustomer(id: string) {
    await this.delay();
    return this.customers.find((c) => c.id === id && !c.deleted_at);
  }

  async updateCustomer(id: string, updates: Partial<Profile>) {
    await this.delay();
    const index = this.customers.findIndex((c) => c.id === id);
    if (index !== -1) {
      this.customers[index] = {
        ...this.customers[index],
        ...updates,
        updated_at: new Date().toISOString(),
      };
      return this.customers[index];
    }
    return null;
  }

  // Helper to simulate network delay
  private delay(ms: number = 300) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

export const mockDataStore = new MockDataStore();
