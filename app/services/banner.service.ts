/**
 * Banner Service
 * Handles homepage banner data
 */

import { supabase } from '~/lib/supabase.client';
import type { Banner } from '~/types/database.types';

export class BannerService {
  /**
   * Get active banners for homepage
   */
  static async getActiveBanners(): Promise<Banner[]> {
    const now = new Date().toISOString();

    const { data, error } = await supabase
      .from('banners')
      .select('*')
      .eq('is_active', true)
      .or(`valid_from.is.null,valid_from.lte.${now}`)
      .or(`valid_until.is.null,valid_until.gte.${now}`)
      .order('position', { ascending: true });

    if (error) throw error;

    return data || [];
  }
}
