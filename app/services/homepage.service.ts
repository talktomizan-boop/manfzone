/**
 * Homepage Service
 * 
 * Manages homepage CMS operations including:
 * - Section configuration and retrieval
 * - Hero slides management
 * - Banner management with analytics
 * - Featured content selection
 * - Flash sales operations
 * - Newsletter subscriptions
 * - Analytics event tracking
 * 
 * All operations respect RLS policies and user permissions.
 */

// NOTE: This service is used by both client components and server loaders.
// React Router treats "*.client.*" modules as client-only and will stub them out on the server.
// Therefore: server code must pass an explicit Supabase client (from supabase.server.ts).
import { supabase as browserSupabase } from '~/lib/supabase.client';
import { handleError } from '~/utils/error-handler';

// Small helper so this module can run in both environments.
// - On the client, browserSupabase is available.
// - On the server, callers should pass the request-scoped client.
type AnySupabase = {
  from: Function;
  rpc: Function;
  auth?: any;
};

function getClient(client?: AnySupabase | null): AnySupabase {
  return (client ?? (browserSupabase as any)) as AnySupabase;
}

// =====================================================
// TYPES
// =====================================================

type HomepageSection = any;
type HeroSlide = any;
type Banner = any;
type TrustSignal = any;
type FeaturedCategory = any;
type FeaturedProduct = any;
type FlashSale = any;
type ContentBlock = any;
type NewsletterConfig = any;
type NewsletterSubscription = any;

export interface HomepageConfig {
  version: number;
  sections: HomepageSectionWithContent[];
}

export interface HomepageSectionWithContent extends HomepageSection {
  hero_slides?: HeroSlide[];
  trust_signals?: TrustSignal[];
  banners?: Banner[];
  featured_categories?: (FeaturedCategory & { category?: any })[];
  featured_products?: (FeaturedProduct & { product?: any })[];
  flash_sale?: FlashSale & { products?: any[] };
  content_blocks?: ContentBlock[];
  newsletter_config?: NewsletterConfig;
  featured_reviews?: any[];
}

export interface CreateHeroSlideInput {
  section_id: string;
  headline: string;
  subheadline?: string;
  primary_cta_text?: string;
  primary_cta_link?: string;
  secondary_cta_text?: string;
  secondary_cta_link?: string;
  background_image_url?: string;
  foreground_image_url?: string;
  text_alignment?: 'left' | 'center' | 'right';
  display_order?: number;
}

export interface CreateBannerInput {
  section_id: string;
  title?: string;
  subtitle?: string;
  image_url: string;
  mobile_image_url?: string;
  cta_text?: string;
  cta_link?: string;
  banner_type?: 'full_width' | 'half_width' | 'quarter_width';
  scheduled_start_at?: string;
  scheduled_end_at?: string;
}

export interface NewsletterSubscribeInput {
  email: string;
  consent_given: boolean;
  subscribed_from?: string;
}

export interface HomepageAnalyticsEvent {
  event_type: 'hero_cta_click' | 'banner_click' | 'banner_impression' | 'section_impression' | 'product_click' | 'category_click' | 'newsletter_submit' | 'scroll_depth' | 'conversion_attribution';
  section_id?: string;
  section_type?: string;
  item_id?: string;
  item_type?: string;
  scroll_depth_percentage?: number;
  metadata?: Record<string, any>;
}

// =====================================================
// HOMEPAGE CONFIGURATION
// =====================================================

/**
 * Get complete active homepage configuration
 */
export async function getActiveHomepageConfig(): Promise<HomepageConfig> {
  try {
    const { data, error } = await getClient()
      .rpc('get_active_homepage_config');

    if (error) throw error;

    if (!data) {
      // Return default empty config
      return {
        version: 1,
        sections: []
      };
    }

    // Fetch detailed content for each section
    const sectionsWithContent = await Promise.all(
      (data.sections || []).map(async (section: HomepageSection) => {
        return await getSectionContent(section, null);
      })
    );

    return {
      version: data.version,
      sections: sectionsWithContent
    };
  } catch (error) {
    throw handleError(error);
  }
}

/**
 * Server-safe variant of getActiveHomepageConfig.
 * Pass the Supabase client created via createSupabaseServerClient(request).
 */
export async function getActiveHomepageConfigWithClient(
  serverSupabase: AnySupabase
): Promise<HomepageConfig> {
  try {
    const { data, error } = await getClient(serverSupabase).rpc('get_active_homepage_config');

    if (error) throw error;

    if (!data) {
      return { version: 1, sections: [] };
    }

    const sectionsWithContent = await Promise.all(
      (data.sections || []).map(async (section: HomepageSection) => {
        return await getSectionContent(section, serverSupabase);
      })
    );

    return { version: data.version, sections: sectionsWithContent };
  } catch (error) {
    throw handleError(error);
  }
}

/**
 * Get section content based on section type
 */
async function getSectionContent(section: HomepageSection, client: AnySupabase | null): Promise<HomepageSectionWithContent> {
  const sectionWithContent: HomepageSectionWithContent = { ...section };

  try {
    switch (section.section_type) {
      case 'hero':
        sectionWithContent.hero_slides = await getHeroSlides(section.id, client);
        break;

      case 'trust_signals':
        sectionWithContent.trust_signals = await getTrustSignals(section.id, client);
        break;

      case 'promotional_banner':
        sectionWithContent.banners = await getBanners(section.id, client);
        break;

      case 'featured_categories':
        sectionWithContent.featured_categories = await getFeaturedCategories(section.id, client);
        break;

      case 'best_sellers':
      case 'trending_products':
      case 'new_arrivals':
        sectionWithContent.featured_products = await getFeaturedProducts(section.id, client);
        break;

      case 'flash_sale':
        sectionWithContent.flash_sale = await getActiveFlashSale(section.id, client);
        break;

      case 'brand_story':
        sectionWithContent.content_blocks = await getContentBlocks(section.id, client);
        break;

      case 'newsletter':
        sectionWithContent.newsletter_config = await getNewsletterConfig(section.id, client);
        break;

      case 'social_proof':
        sectionWithContent.featured_reviews = await getFeaturedReviews(section.id, client);
        break;
    }
  } catch (error) {
    console.error(`Failed to load content for section ${section.id}:`, error);
    // Continue with empty content rather than failing entire page
  }

  return sectionWithContent;
}

// =====================================================
// HERO SLIDES
// =====================================================

export async function getHeroSlides(sectionId: string, client?: AnySupabase | null): Promise<HeroSlide[]> {
  try {
    const { data, error } = await getClient(client)
      .from('homepage_hero_slides')
      .select('*')
      .eq('section_id', sectionId)
      .is('deleted_at', null)
      .eq('is_enabled', true)
      .order('display_order', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (error) {
    throw handleError(error);
  }
}

export async function createHeroSlide(input: CreateHeroSlideInput): Promise<HeroSlide> {
  try {
    const client = getClient();
    const { data, error } = await client
      .from('homepage_hero_slides')
      .insert({
        ...input,
        created_by: (await client.auth.getUser()).data.user?.id
      })
      .select()
      .single();

    if (error) throw error;
    if (!data) throw new Error('Failed to create hero slide');

    return data;
  } catch (error) {
    throw handleError(error);
  }
}

export async function updateHeroSlide(id: string, updates: Partial<CreateHeroSlideInput>): Promise<HeroSlide> {
  try {
    const client = getClient();
    const { data, error } = await client
      .from('homepage_hero_slides')
      .update({
        ...updates,
        updated_by: (await client.auth.getUser()).data.user?.id
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    if (!data) throw new Error('Hero slide not found');

    return data;
  } catch (error) {
    throw handleError(error);
  }
}

export async function deleteHeroSlide(id: string): Promise<void> {
  try {
    const client = getClient();
    const { error } = await client
      .from('homepage_hero_slides')
      .update({
        deleted_at: new Date().toISOString(),
        deleted_by: (await client.auth.getUser()).data.user?.id
      })
      .eq('id', id);

    if (error) throw error;
  } catch (error) {
    throw handleError(error);
  }
}

// =====================================================
// BANNERS
// =====================================================

export async function getBanners(sectionId: string, client?: AnySupabase | null): Promise<Banner[]> {
  try {
    const now = new Date().toISOString();
    
    const { data, error } = await getClient(client)
      .from('homepage_banners')
      .select('*')
      .eq('section_id', sectionId)
      .is('deleted_at', null)
      .eq('is_enabled', true)
      .or(`scheduled_start_at.is.null,scheduled_start_at.lte.${now}`)
      .or(`scheduled_end_at.is.null,scheduled_end_at.gte.${now}`)
      .order('display_order', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (error) {
    throw handleError(error);
  }
}

export async function createBanner(input: CreateBannerInput): Promise<Banner> {
  try {
    const client = getClient();
    const { data, error } = await client
      .from('homepage_banners')
      .insert({
        ...input,
        created_by: (await client.auth.getUser()).data.user?.id
      })
      .select()
      .single();

    if (error) throw error;
    if (!data) throw new Error('Failed to create banner');

    return data;
  } catch (error) {
    throw handleError(error);
  }
}

export async function trackBannerClick(bannerId: string): Promise<void> {
  try {
    const { error } = await getClient()
      .rpc('increment_banner_click', { p_banner_id: bannerId });

    if (error) throw error;
  } catch (error) {
    console.error('Failed to track banner click:', error);
    // Don't throw - analytics tracking shouldn't break user experience
  }
}

export async function trackBannerImpression(bannerId: string): Promise<void> {
  try {
    const { error } = await getClient()
      .rpc('increment_banner_impression', { p_banner_id: bannerId });

    if (error) throw error;
  } catch (error) {
    console.error('Failed to track banner impression:', error);
  }
}

// =====================================================
// TRUST SIGNALS
// =====================================================

export async function getTrustSignals(sectionId: string, client?: AnySupabase | null): Promise<TrustSignal[]> {
  try {
    const { data, error } = await getClient(client)
      .from('homepage_trust_signals')
      .select('*')
      .eq('section_id', sectionId)
      .is('deleted_at', null)
      .eq('is_enabled', true)
      .order('display_order', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (error) {
    throw handleError(error);
  }
}

// =====================================================
// FEATURED CATEGORIES
// =====================================================

export async function getFeaturedCategories(sectionId: string, client?: AnySupabase | null): Promise<any[]> {
  try {
    const now = new Date().toISOString();
    
    const { data, error } = await getClient(client)
      .from('homepage_featured_categories')
      .select(`
        *,
        category:categories(*)
      `)
      .eq('section_id', sectionId)
      .is('deleted_at', null)
      .eq('is_enabled', true)
      .or(`scheduled_start_at.is.null,scheduled_start_at.lte.${now}`)
      .or(`scheduled_end_at.is.null,scheduled_end_at.gte.${now}`)
      .order('display_order', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (error) {
    throw handleError(error);
  }
}

// =====================================================
// FEATURED PRODUCTS
// =====================================================

export async function getFeaturedProducts(sectionId: string, client?: AnySupabase | null): Promise<any[]> {
  try {
    const { data, error } = await getClient(client)
      .from('homepage_featured_products')
      .select(`
        *,
        product:products(
          *,
          images:product_images(*)
        )
      `)
      .eq('section_id', sectionId)
      .is('deleted_at', null)
      .eq('is_enabled', true)
      .order('display_order', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (error) {
    throw handleError(error);
  }
}

// =====================================================
// FLASH SALES
// =====================================================

export async function getActiveFlashSale(sectionId: string, client?: AnySupabase | null): Promise<any | null> {
  try {
    const now = new Date().toISOString();
    
    const { data, error } = await getClient(client)
      .from('homepage_flash_sales')
      .select(`
        *,
        products:homepage_flash_sale_products(
          *,
          product:products(
            *,
            images:product_images(*)
          )
        )
      `)
      .eq('section_id', sectionId)
      .is('deleted_at', null)
      .eq('is_enabled', true)
      .lte('start_at', now)
      .gte('end_at', now)
      .order('start_at', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows
    return data || null;
  } catch (error) {
    throw handleError(error);
  }
}

// =====================================================
// CONTENT BLOCKS
// =====================================================

export async function getContentBlocks(sectionId: string, client?: AnySupabase | null): Promise<ContentBlock[]> {
  try {
    const { data, error } = await getClient(client)
      .from('homepage_content_blocks')
      .select('*')
      .eq('section_id', sectionId)
      .is('deleted_at', null)
      .eq('is_enabled', true)
      .eq('is_published', true)
      .order('display_order', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (error) {
    throw handleError(error);
  }
}

// =====================================================
// NEWSLETTER
// =====================================================

export async function getNewsletterConfig(sectionId: string, client?: AnySupabase | null): Promise<NewsletterConfig | null> {
  try {
    const { data, error } = await getClient(client)
      .from('homepage_newsletter_config')
      .select('*')
      .eq('section_id', sectionId)
      .is('deleted_at', null)
      .eq('is_enabled', true)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data || null;
  } catch (error) {
    throw handleError(error);
  }
}

export async function subscribeToNewsletter(input: NewsletterSubscribeInput): Promise<NewsletterSubscription> {
  try {
    // Validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(input.email)) {
      throw new Error('Invalid email address');
    }

    if (!input.consent_given) {
      throw new Error('Consent is required to subscribe');
    }

    const client = getClient();
    const { data: user } = await client.auth.getUser();

    const { data, error } = await client
      .from('newsletter_subscriptions')
      .insert({
        email: input.email.toLowerCase(),
        consent_given: input.consent_given,
        consent_timestamp: new Date().toISOString(),
        subscribed_from: input.subscribed_from || 'homepage',
        user_id: user?.user?.id || null
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') { // Unique violation
        throw new Error('This email is already subscribed');
      }
      throw error;
    }

    if (!data) throw new Error('Failed to create subscription');

    // Track analytics event
    await trackHomepageEvent({
      event_type: 'newsletter_submit',
      metadata: { subscribed_from: input.subscribed_from }
    });

    return data;
  } catch (error) {
    throw handleError(error);
  }
}

// =====================================================
// FEATURED REVIEWS
// =====================================================

export async function getFeaturedReviews(sectionId: string, client?: AnySupabase | null): Promise<any[]> {
  try {
    const { data, error } = await getClient(client)
      .from('homepage_featured_reviews')
      .select(`
        *,
        review:reviews(
          *,
          user:profiles(*)
        )
      `)
      .eq('section_id', sectionId)
      .is('deleted_at', null)
      .eq('is_enabled', true)
      .order('display_order', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (error) {
    throw handleError(error);
  }
}

// =====================================================
// ANALYTICS
// =====================================================

export async function trackHomepageEvent(event: HomepageAnalyticsEvent): Promise<void> {
  try {
    const { error } = await getClient()
      .rpc('track_homepage_event', {
        p_event_type: event.event_type,
        p_section_id: event.section_id || null,
        p_item_id: event.item_id || null,
        p_item_type: event.item_type || null,
        p_metadata: event.metadata || {}
      });

    if (error) throw error;
  } catch (error) {
    console.error('Failed to track homepage event:', error);
    // Don't throw - analytics shouldn't break user experience
  }
}

/**
 * Track scroll depth on homepage
 */
export async function trackScrollDepth(percentage: number, sectionId?: string): Promise<void> {
  await trackHomepageEvent({
    event_type: 'scroll_depth',
    section_id: sectionId,
    scroll_depth_percentage: percentage
  });
}

/**
 * Track section impression
 */
export async function trackSectionImpression(sectionId: string, sectionType: string): Promise<void> {
  await trackHomepageEvent({
    event_type: 'section_impression',
    section_id: sectionId,
    section_type: sectionType
  });
}

/**
 * Track CTA click
 */
export async function trackCTAClick(sectionId: string, ctaType: 'primary' | 'secondary', link: string): Promise<void> {
  await trackHomepageEvent({
    event_type: 'hero_cta_click',
    section_id: sectionId,
    metadata: { cta_type: ctaType, link }
  });
}
