/**
 * Category Service
 * Handles category data access
 */

import { supabase } from '~/lib/supabase.client';
import type { Category } from '~/types/database.types';

export class CategoryService {
  /**
   * Get all active top-level categories
   */
  static async getTopLevelCategories(): Promise<Category[]> {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .is('parent_id', null)
      .eq('is_active', true)
      .is('deleted_at', null)
      .order('display_order', { ascending: true });

    if (error) throw error;

    return data || [];
  }

  /**
   * Get subcategories for a parent category
   */
  static async getSubcategories(parentId: string): Promise<Category[]> {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .eq('parent_id', parentId)
      .eq('is_active', true)
      .is('deleted_at', null)
      .order('display_order', { ascending: true });

    if (error) throw error;

    return data || [];
  }

  /**
   * Get category by slug
   */
  static async getCategoryBySlug(slug: string): Promise<Category | null> {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .eq('slug', slug)
      .eq('is_active', true)
      .is('deleted_at', null)
      .single();

    if (error) return null;

    return data;
  }

  /**
   * Get all categories (for admin)
   */
  static async getAllCategories(): Promise<Category[]> {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('display_order', { ascending: true });

    if (error) throw error;

    return data || [];
  }
}
