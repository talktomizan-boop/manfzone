/**
 * Product Service
 * Handles all product-related data access and business logic
 */

import { supabase } from '~/lib/supabase.client';
import type { Product, ProductImage } from '~/types/database.types';
import type { ProductWithDetails, ProductCardData, ProductFilterOptions } from '~/types/domain.types';
import { NotFoundError } from '~/types/domain.types';

export class ProductService {
  /**
   * Get featured products for homepage
   */
  static async getFeaturedProducts(limit: number = 8): Promise<ProductCardData[]> {
    const { data, error } = await supabase
      .from('products')
      .select(
        `
        id,
        name,
        slug,
        base_price,
        compare_at_price,
        is_featured,
        product_images!inner(url, is_primary),
        inventory(available_quantity)
      `
      )
      .eq('is_active', true)
      .eq('is_featured', true)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;

    return (data || []).map((product: any) => ({
      id: product.id,
      name: product.name,
      slug: product.slug,
      price: product.base_price,
      compare_at_price: product.compare_at_price,
      image_url: product.product_images?.find((img: any) => img.is_primary)?.url || null,
      rating_average: 0, // TODO: Calculate from reviews
      rating_count: 0, // TODO: Count reviews
      in_stock: (product.inventory?.[0]?.available_quantity || 0) > 0,
      is_featured: product.is_featured,
    }));
  }

  /**
   * Get products with filtering and pagination
   */
  static async getProducts(options: ProductFilterOptions = {}): Promise<ProductCardData[]> {
    const {
      category_id,
      min_price,
      max_price,
      is_featured,
      search,
      sort_by = 'newest',
      limit = 20,
      offset = 0,
    } = options;

    let query = supabase
      .from('products')
      .select(
        `
        id,
        name,
        slug,
        base_price,
        compare_at_price,
        is_featured,
        created_at,
        product_images!inner(url, is_primary),
        inventory(available_quantity)
      `
      )
      .eq('is_active', true)
      .is('deleted_at', null);

    // Apply filters
    if (category_id) {
      query = query.eq('category_id', category_id);
    }

    if (min_price !== undefined) {
      query = query.gte('base_price', min_price);
    }

    if (max_price !== undefined) {
      query = query.lte('base_price', max_price);
    }

    if (is_featured !== undefined) {
      query = query.eq('is_featured', is_featured);
    }

    if (search) {
      query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`);
    }

    // Apply sorting
    switch (sort_by) {
      case 'price_asc':
        query = query.order('base_price', { ascending: true });
        break;
      case 'price_desc':
        query = query.order('base_price', { ascending: false });
        break;
      case 'newest':
        query = query.order('created_at', { ascending: false });
        break;
      case 'popular':
        // TODO: Implement popularity sorting based on sales
        query = query.order('created_at', { ascending: false });
        break;
      case 'rating':
        // TODO: Implement rating sorting
        query = query.order('created_at', { ascending: false });
        break;
    }

    query = query.range(offset, offset + limit - 1);

    const { data, error } = await query;

    if (error) throw error;

    return (data || []).map((product: any) => ({
      id: product.id,
      name: product.name,
      slug: product.slug,
      price: product.base_price,
      compare_at_price: product.compare_at_price,
      image_url: product.product_images?.find((img: any) => img.is_primary)?.url || null,
      rating_average: 0,
      rating_count: 0,
      in_stock: (product.inventory?.[0]?.available_quantity || 0) > 0,
      is_featured: product.is_featured,
    }));
  }

  /**
   * Get product by slug with full details
   */
  static async getProductBySlug(slug: string): Promise<ProductWithDetails> {
    const { data, error } = await supabase
      .from('products')
      .select(
        `
        *,
        category:categories(*),
        images:product_images(*),
        variants:product_variants(*),
        inventory(*)
      `
      )
      .eq('slug', slug)
      .eq('is_active', true)
      .is('deleted_at', null)
      .single();

    if (error || !data) {
      throw new NotFoundError('Product');
    }

    const primaryImage = data.images?.find((img: ProductImage) => img.is_primary);

    return {
      ...data,
      primary_image: primaryImage,
      in_stock: (data.inventory?.[0]?.available_quantity || 0) > 0,
      rating_average: 0, // TODO: Calculate from reviews
      rating_count: 0, // TODO: Count from reviews
    };
  }

  /**
   * Get product by ID
   */
  static async getProductById(id: string): Promise<Product | null> {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('id', id)
      .eq('is_active', true)
      .is('deleted_at', null)
      .single();

    if (error) return null;

    return data;
  }

  /**
   * Search products
   */
  static async searchProducts(query: string, limit: number = 10): Promise<ProductCardData[]> {
    return this.getProducts({ search: query, limit });
  }

  /**
   * Get related products
   */
  static async getRelatedProducts(productId: string, categoryId: string, limit: number = 4): Promise<ProductCardData[]> {
    const { data, error } = await supabase
      .from('products')
      .select(
        `
        id,
        name,
        slug,
        base_price,
        compare_at_price,
        is_featured,
        product_images!inner(url, is_primary),
        inventory(available_quantity)
      `
      )
      .eq('category_id', categoryId)
      .eq('is_active', true)
      .is('deleted_at', null)
      .neq('id', productId)
      .limit(limit);

    if (error) throw error;

    return (data || []).map((product: any) => ({
      id: product.id,
      name: product.name,
      slug: product.slug,
      price: product.base_price,
      compare_at_price: product.compare_at_price,
      image_url: product.product_images?.find((img: any) => img.is_primary)?.url || null,
      rating_average: 0,
      rating_count: 0,
      in_stock: (product.inventory?.[0]?.available_quantity || 0) > 0,
      is_featured: product.is_featured,
    }));
  }
}
