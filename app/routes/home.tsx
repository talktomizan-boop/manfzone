/**
 * Home Page Route
 * CMS-driven landing page with dynamic sections
 */

import { Link } from 'react-router';
import { Header } from '~/components/header/header';
import { Footer } from '~/components/footer/footer';
import { FloatingChatButton } from '~/components/floating-chat/floating-chat';
import { ProductCard } from '~/components/product-card/product-card';
import { Button } from '~/components/ui/button/button';
import * as HomepageService from '~/services/homepage.service';
import { handleError } from '~/utils/error-handler';
import type { Route } from './+types/home';
import styles from './home.module.css';
import { ArrowRight, TruckIcon, Shield, HeadphonesIcon, CreditCard, Star } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import React from 'react';
import { createSupabaseServerClient } from '~/lib/supabase.server';

export async function loader({ request }: Route.LoaderArgs) {
  try {
    // IMPORTANT: this loader runs on the server.
    // Do NOT rely on modules named *.client.* here (React Router treats them as client-only).
    // Always use the server client so Supabase is available in SSR.
    const { supabase } = createSupabaseServerClient(request);

    const homepageConfig = await HomepageService.getActiveHomepageConfigWithClient(supabase);

    // Default/fallback content should use real product ids so cart/wishlist
    // actions work across the site.
    // Reuse the same server client instance for all home loader queries.
    const { data: featuredData, error: featuredError } = await supabase
      .from('products')
      .select(
        `
        id,
        name,
        slug,
        base_price,
        compare_at_price,
        is_featured,
        product_images(url, is_primary),
        inventory(available_quantity)
      `
      )
      .eq('is_active', true)
      .is('deleted_at', null)
      .order('is_featured', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(4);

    if (featuredError) {
      console.error('Home featured products loader error:', featuredError);
    }

    const featuredProducts = (featuredData || []).map((p: any) => ({
      id: p.id,
      name: p.name,
      slug: p.slug,
      price: Number(p.base_price) || 0,
      compare_at_price: p.compare_at_price,
      image_url:
        p.product_images?.find((img: any) => img.is_primary)?.url || p.product_images?.[0]?.url || null,
      rating_average: 0,
      rating_count: 0,
      in_stock: (p.inventory?.[0]?.available_quantity || 0) > 0,
      is_featured: !!p.is_featured,
    }));

    return {
      homepageConfig,
      featuredProducts,
    };
  } catch (error) {
    console.error('Home loader error:', error);
    return {
      homepageConfig: { version: 1, sections: [] },
      error: handleError(error).message,
      featuredProducts: [],
    };
  }
}

export default function Home({ loaderData }: Route.ComponentProps) {
  const { homepageConfig, featuredProducts } = loaderData as any;
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [newsletterConsent, setNewsletterConsent] = useState(false);
  const [newsletterStatus, setNewsletterStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const sectionsRef = useRef<Map<string, HTMLElement>>(new Map());

  // Track section impressions
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const sectionId = entry.target.getAttribute('data-section-id');
            const sectionType = entry.target.getAttribute('data-section-type');
            if (sectionId && sectionType) {
              HomepageService.trackSectionImpression(sectionId, sectionType);
            }
          }
        });
      },
      { threshold: 0.5 }
    );

    sectionsRef.current.forEach((section) => {
      observer.observe(section);
    });

    return () => observer.disconnect();
  }, [homepageConfig]);

  const handleNewsletterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setNewsletterStatus('loading');

    try {
      await HomepageService.subscribeToNewsletter({
        email: newsletterEmail,
        consent_given: newsletterConsent,
        subscribed_from: 'homepage'
      });
      setNewsletterStatus('success');
      setNewsletterEmail('');
      setNewsletterConsent(false);
    } catch (error) {
      setNewsletterStatus('error');
    }
  };

  return (
    <div className={styles.page}>
      <Header />

      <main className={styles.main}>
        {homepageConfig.sections.map((section: any) => {
          const ref = (el: HTMLElement | null) => {
            if (el) sectionsRef.current.set(section.id, el);
          };

          switch (section.section_type) {
            case 'hero':
              return (
                <HeroSection
                  key={section.id}
                  section={section}
                  slides={section.hero_slides || []}
                  ref={ref}
                />
              );

            case 'trust_signals':
              return (
                <TrustSignalsSection
                  key={section.id}
                  section={section}
                  signals={section.trust_signals || []}
                  ref={ref}
                />
              );

            case 'promotional_banner':
              return (
                <BannerSection
                  key={section.id}
                  section={section}
                  banners={section.banners || []}
                  ref={ref}
                />
              );

            case 'featured_categories':
              return (
                <FeaturedCategoriesSection
                  key={section.id}
                  section={section}
                  categories={section.featured_categories || []}
                  ref={ref}
                />
              );

            case 'best_sellers':
            case 'trending_products':
            case 'new_arrivals':
              return (
                <FeaturedProductsSection
                  key={section.id}
                  section={section}
                  products={section.featured_products || []}
                  ref={ref}
                />
              );

            case 'flash_sale':
              if (section.flash_sale) {
                return (
                  <FlashSaleSection
                    key={section.id}
                    section={section}
                    flashSale={section.flash_sale}
                    ref={ref}
                  />
                );
              }
              return null;

            case 'brand_story':
              return (
                <BrandStorySection
                  key={section.id}
                  section={section}
                  blocks={section.content_blocks || []}
                  ref={ref}
                />
              );

            case 'newsletter':
              if (section.newsletter_config) {
                return (
                  <NewsletterSection
                    key={section.id}
                    section={section}
                    config={section.newsletter_config}
                    email={newsletterEmail}
                    consent={newsletterConsent}
                    status={newsletterStatus}
                    onEmailChange={setNewsletterEmail}
                    onConsentChange={setNewsletterConsent}
                    onSubmit={handleNewsletterSubmit}
                    ref={ref}
                  />
                );
              }
              return null;

            case 'social_proof':
              return (
                <SocialProofSection
                  key={section.id}
                  section={section}
                  reviews={section.featured_reviews || []}
                  ref={ref}
                />
              );

            default:
              return null;
          }
        })}

        {/* Fallback: Show default sections if no CMS content */}
        {homepageConfig.sections.length === 0 && (
          <>
            <DefaultHeroSection />
            <DefaultTrustSignals />
            <DefaultFeaturedProducts products={featuredProducts || []} />
            <DefaultCategories />
            <DefaultCTA />
          </>
        )}
      </main>

      <Footer />

      {/* Homepage-only floating chat button */}
      <FloatingChatButton />
    </div>
  );
}

// =====================================================
// SECTION COMPONENTS
// =====================================================

interface HeroSectionProps {
  section: any;
  slides: any[];
}

const HeroSection = React.forwardRef<HTMLElement, HeroSectionProps>(({ section, slides }, ref) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const activeSlides = slides.filter(s => s.is_enabled);

  useEffect(() => {
    if (activeSlides.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % activeSlides.length);
    }, activeSlides[currentSlide]?.duration_seconds * 1000 || 5000);

    return () => clearInterval(interval);
  }, [currentSlide, activeSlides]);

  if (activeSlides.length === 0) return null;

  const slide = activeSlides[currentSlide];

  return (
    <section
      ref={ref}
      data-section-id={section.id}
      data-section-type={section.section_type}
      className={styles.hero}
      style={{
        background: section.background_gradient || section.background_color,
      }}
    >
      <div className={styles.heroContent}>
        <div className={styles.heroText}>
          <h1 className={styles.heroTitle}>{slide.headline}</h1>
          {slide.subheadline && <p className={styles.heroSubtitle}>{slide.subheadline}</p>}
          <div className={styles.heroButtons}>
            {slide.primary_cta_text && slide.primary_cta_link && (
              <Link
                to={slide.primary_cta_link}
                onClick={() => HomepageService.trackCTAClick(section.id, 'primary', slide.primary_cta_link)}
              >
                <Button size="lg" className={styles.heroButton}>
                  {slide.primary_cta_text}
                  <ArrowRight size={20} />
                </Button>
              </Link>
            )}
            {slide.secondary_cta_text && slide.secondary_cta_link && (
              <Link
                to={slide.secondary_cta_link}
                onClick={() => HomepageService.trackCTAClick(section.id, 'secondary', slide.secondary_cta_link)}
              >
                <Button size="lg" variant="outline">
                  {slide.secondary_cta_text}
                </Button>
              </Link>
            )}
          </div>
        </div>
        {slide.foreground_image_url && (
          <div className={styles.heroImageWrapper}>
            <img src={slide.foreground_image_url} alt={slide.headline} />
          </div>
        )}
      </div>
      {activeSlides.length > 1 && (
        <div className={styles.heroIndicators}>
          {activeSlides.map((_, index) => (
            <button
              key={index}
              className={`${styles.heroIndicator} ${index === currentSlide ? styles.heroIndicatorActive : ''}`}
              onClick={() => setCurrentSlide(index)}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      )}
    </section>
  );
});

interface TrustSignalsSectionProps {
  section: any;
  signals: any[];
}

const TrustSignalsSection = React.forwardRef<HTMLElement, TrustSignalsSectionProps>(
  ({ section, signals }, ref) => {
    if (signals.length === 0) return null;

    return (
      <section
        ref={ref}
        data-section-id={section.id}
        data-section-type={section.section_type}
        className={styles.features}
      >
        <div className={styles.container}>
          <div className={styles.featureGrid}>
            {signals.map((signal) => {
              const Icon = getIconByName(signal.icon_name);
              return (
                <div key={signal.id} className={styles.feature}>
                  <div className={styles.featureIcon}>
                    {Icon && <Icon size={24} />}
                  </div>
                  <h3 className={styles.featureTitle}>{signal.title}</h3>
                  {signal.description && <p className={styles.featureText}>{signal.description}</p>}
                </div>
              );
            })}
          </div>
        </div>
      </section>
    );
  }
);

interface BannerSectionProps {
  section: any;
  banners: any[];
}

const BannerSection = React.forwardRef<HTMLElement, BannerSectionProps>(({ section, banners }, ref) => {
  if (banners.length === 0) return null;

  return (
    <section
      ref={ref}
      data-section-id={section.id}
      data-section-type={section.section_type}
      className={styles.banners}
    >
      <div className={styles.container}>
        {banners.map((banner) => (
          <div key={banner.id} className={styles.banner}>
            <Link
              to={banner.cta_link || '#'}
              onClick={() => {
                HomepageService.trackBannerClick(banner.id);
                HomepageService.trackHomepageEvent({
                  event_type: 'banner_click',
                  item_id: banner.id,
                  item_type: 'banner',
                });
              }}
              onLoad={() => HomepageService.trackBannerImpression(banner.id)}
            >
              <img
                src={banner.image_url}
                alt={banner.title || 'Banner'}
                className={styles.bannerImage}
              />
            </Link>
          </div>
        ))}
      </div>
    </section>
  );
});

interface FeaturedCategoriesSectionProps {
  section: any;
  categories: any[];
}

const FeaturedCategoriesSection = React.forwardRef<HTMLElement, FeaturedCategoriesSectionProps>(
  ({ section, categories }, ref) => {
    if (categories.length === 0) return null;

    return (
      <section
        ref={ref}
        data-section-id={section.id}
        data-section-type={section.section_type}
        className={styles.section}
      >
        <div className={styles.container}>
          {section.title && (
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>{section.title}</h2>
            </div>
          )}

          <div className={styles.categoryGrid}>
            {categories.map((item) => {
              const category = item.category;
              const imageUrl = item.custom_image_url || category?.image_url;
              const title = item.custom_title || category?.name;

              return (
                <Link
                  key={item.id}
                  to={`/products?category=${category?.slug}`}
                  className={styles.categoryCard}
                  onClick={() =>
                    HomepageService.trackHomepageEvent({
                      event_type: 'category_click',
                      item_id: category?.id,
                      item_type: 'category',
                    })
                  }
                >
                  {imageUrl && (
                    <div className={styles.categoryImage}>
                      <img src={imageUrl} alt={title} />
                    </div>
                  )}
                  <h3 className={styles.categoryName}>{title}</h3>
                </Link>
              );
            })}
          </div>
        </div>
      </section>
    );
  }
);

interface FeaturedProductsSectionProps {
  section: any;
  products: any[];
}

const FeaturedProductsSection = React.forwardRef<HTMLElement, FeaturedProductsSectionProps>(
  ({ section, products }, ref) => {
    if (products.length === 0) return null;

    return (
      <section
        ref={ref}
        data-section-id={section.id}
        data-section-type={section.section_type}
        className={styles.section}
      >
        <div className={styles.container}>
          {section.title && (
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>{section.title}</h2>
              <Link to="/products">
                <Button variant="ghost">
                  View All
                  <ArrowRight size={18} />
                </Button>
              </Link>
            </div>
          )}

          <div className={styles.productGrid}>
            {products.map((item) => (
              <div
                key={item.id}
                onClick={() =>
                  HomepageService.trackHomepageEvent({
                    event_type: 'product_click',
                    item_id: item.product?.id,
                    item_type: 'product',
                  })
                }
              >
                <ProductCard product={item.product} />
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }
);

interface FlashSaleSectionProps {
  section: any;
  flashSale: any;
}

const FlashSaleSection = React.forwardRef<HTMLElement, FlashSaleSectionProps>(
  ({ section, flashSale }, ref) => {
    const [timeLeft, setTimeLeft] = useState('');

    useEffect(() => {
      const calculateTimeLeft = () => {
        const end = new Date(flashSale.end_at).getTime();
        const now = new Date().getTime();
        const diff = end - now;

        if (diff <= 0) {
          return 'Sale ended';
        }

        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);

        return `${hours}h ${minutes}m ${seconds}s`;
      };

      const interval = setInterval(() => {
        setTimeLeft(calculateTimeLeft());
      }, 1000);

      setTimeLeft(calculateTimeLeft());

      return () => clearInterval(interval);
    }, [flashSale.end_at]);

    return (
      <section
        ref={ref}
        data-section-id={section.id}
        data-section-type={section.section_type}
        className={styles.flashSale}
      >
        <div className={styles.container}>
          <div className={styles.flashSaleHeader}>
            <h2 className={styles.sectionTitle}>{flashSale.title}</h2>
            <div className={styles.flashSaleTimer}>{timeLeft}</div>
          </div>

          <div className={styles.productGrid}>
            {flashSale.products?.map((item: any) => (
              <ProductCard key={item.id} product={item.product} />
            ))}
          </div>
        </div>
      </section>
    );
  }
);

interface BrandStorySectionProps {
  section: any;
  blocks: any[];
}

const BrandStorySection = React.forwardRef<HTMLElement, BrandStorySectionProps>(
  ({ section, blocks }, ref) => {
    if (blocks.length === 0) return null;

    return (
      <section
        ref={ref}
        data-section-id={section.id}
        data-section-type={section.section_type}
        className={styles.brandStory}
      >
        <div className={styles.container}>
          {blocks.map((block) => (
            <div key={block.id} className={styles.contentBlock}>
              <div className={styles.contentBlockText}>
                {block.title && <h2 className={styles.contentBlockTitle}>{block.title}</h2>}
                {block.subtitle && <h3 className={styles.contentBlockSubtitle}>{block.subtitle}</h3>}
                {block.content && <p className={styles.contentBlockContent}>{block.content}</p>}
                {block.cta_text && block.cta_link && (
                  <Link to={block.cta_link}>
                    <Button>{block.cta_text}</Button>
                  </Link>
                )}
              </div>
              {block.image_url && (
                <div className={styles.contentBlockImage}>
                  <img src={block.image_url} alt={block.title} />
                </div>
              )}
            </div>
          ))}
        </div>
      </section>
    );
  }
);

interface NewsletterSectionProps {
  section: any;
  config: any;
  email: string;
  consent: boolean;
  status: 'idle' | 'loading' | 'success' | 'error';
  onEmailChange: (email: string) => void;
  onConsentChange: (consent: boolean) => void;
  onSubmit: (e: React.FormEvent) => void;
}

const NewsletterSection = React.forwardRef<HTMLElement, NewsletterSectionProps>(
  ({ section, config, email, consent, status, onEmailChange, onConsentChange, onSubmit }, ref) => {
    return (
      <section
        ref={ref}
        data-section-id={section.id}
        data-section-type={section.section_type}
        className={styles.newsletter}
      >
        <div className={styles.container}>
          <div className={styles.newsletterContent}>
            <h2 className={styles.newsletterTitle}>{config.title}</h2>
            {config.subtitle && <p className={styles.newsletterSubtitle}>{config.subtitle}</p>}

            <form onSubmit={onSubmit} className={styles.newsletterForm}>
              <input
                type="email"
                value={email}
                onChange={(e) => onEmailChange(e.target.value)}
                placeholder={config.placeholder_text}
                required
                className={styles.newsletterInput}
                disabled={status === 'loading' || status === 'success'}
              />
              <Button type="submit" disabled={status === 'loading' || status === 'success'}>
                {status === 'loading' ? 'Subscribing...' : 'Subscribe'}
              </Button>
            </form>

            {config.consent_required && (
              <label className={styles.newsletterConsent}>
                <input
                  type="checkbox"
                  checked={consent}
                  onChange={(e) => onConsentChange(e.target.checked)}
                  required
                />
                <span>{config.consent_text || 'I agree to receive marketing emails'}</span>
              </label>
            )}

            {status === 'success' && (
              <p className={styles.newsletterSuccess}>{config.success_message}</p>
            )}
            {status === 'error' && (
              <p className={styles.newsletterError}>Failed to subscribe. Please try again.</p>
            )}
          </div>
        </div>
      </section>
    );
  }
);

interface SocialProofSectionProps {
  section: any;
  reviews: any[];
}

const SocialProofSection = React.forwardRef<HTMLElement, SocialProofSectionProps>(
  ({ section, reviews }, ref) => {
    if (reviews.length === 0) return null;

    return (
      <section
        ref={ref}
        data-section-id={section.id}
        data-section-type={section.section_type}
        className={styles.socialProof}
      >
        <div className={styles.container}>
          {section.title && <h2 className={styles.sectionTitle}>{section.title}</h2>}

          <div className={styles.reviewsGrid}>
            {reviews.map((item) => {
              const review = item.review;
              return (
                <div key={item.id} className={styles.reviewCard}>
                  <div className={styles.reviewRating}>
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        size={16}
                        fill={i < review.rating ? 'currentColor' : 'none'}
                      />
                    ))}
                  </div>
                  <p className={styles.reviewComment}>{review.comment}</p>
                  <p className={styles.reviewAuthor}>{review.user?.full_name || 'Anonymous'}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    );
  }
);

// =====================================================
// DEFAULT SECTIONS (FALLBACK)
// =====================================================

function DefaultHeroSection() {
  return (
    <section className={styles.hero}>
      <div className={styles.heroContent}>
        <div className={styles.heroText}>
          <h1 className={styles.heroTitle}>Ready to Start Shopping?</h1>
          <p className={styles.heroSubtitle}>
            Discover thousands of products from trusted sellers. Browse our collection today!
          </p>
          <div className={styles.heroButtons}>
            <Link to="/products">
              <Button size="lg" className={styles.heroButton}>
                Browse Products
                <ArrowRight size={20} />
              </Button>
            </Link>
            <Link to="/categories">
              <Button size="lg" variant="outline" className={styles.viewCategoriesButton}>
                View Categories
              </Button>
            </Link>
          </div>
        </div>
      </div>
      
      {/* Info Boxes - Directly under hero text */}
      <div className={styles.heroInfoBoxes}>
        <div className={styles.heroInfoBox}>
          <div className={styles.heroInfoIcon}>
            <TruckIcon size={24} />
          </div>
          <h3 className={styles.heroInfoTitle}>Free Shipping</h3>
          <p className={styles.heroInfoText}>On orders over ৳2,000</p>
        </div>
        <div className={styles.heroInfoBox}>
          <div className={styles.heroInfoIcon}>
            <Shield size={24} />
          </div>
          <h3 className={styles.heroInfoTitle}>Secure Payment</h3>
          <p className={styles.heroInfoText}>100% secure transactions</p>
        </div>
        <div className={styles.heroInfoBox}>
          <div className={styles.heroInfoIcon}>
            <HeadphonesIcon size={24} />
          </div>
          <h3 className={styles.heroInfoTitle}>24/7 Support</h3>
          <p className={styles.heroInfoText}>Dedicated customer service</p>
        </div>
        <div className={styles.heroInfoBox}>
          <div className={styles.heroInfoIcon}>
            <CreditCard size={24} />
          </div>
          <h3 className={styles.heroInfoTitle}>Easy Returns</h3>
          <p className={styles.heroInfoText}>7-day return policy</p>
        </div>
      </div>
    </section>
  );
}

function DefaultTrustSignals() {
  // Info boxes are now integrated into the hero section
  return null;
}

function DefaultFeaturedProducts({ products }: { products: any[] }) {
  const featuredProducts = products || [];

  return (
    <section className={styles.section}>
      <div className={styles.container}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Featured Products</h2>
          <Link to="/products">
            <Button variant="ghost">
              View All
              <ArrowRight size={18} />
            </Button>
          </Link>
        </div>
        <div className={styles.productGrid}>
          {featuredProducts.map((product: any) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </div>
    </section>
  );
}

function DefaultCategories() {
  const categories = [
    { name: 'Electronics', slug: 'electronics', image: 'https://images.unsplash.com/photo-1498049794561-7780e7231661?w=400' },
    { name: 'Fashion', slug: 'fashion', image: 'https://images.unsplash.com/photo-1445205170230-053b83016050?w=400' },
    { name: 'Home & Living', slug: 'home-living', image: 'https://images.unsplash.com/photo-1556911220-bff31c812dba?w=400' },
    { name: 'Sports', slug: 'sports', image: 'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=400' },
  ];

  return (
    <section className={styles.section}>
      <div className={styles.container}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Shop by Category</h2>
        </div>
        <div className={styles.categoryGrid}>
          {categories.map((category) => (
            <Link
              key={category.slug}
              to={`/products?category=${category.slug}`}
              className={styles.categoryCard}
            >
              <div className={styles.categoryImage}>
                <img src={category.image} alt={category.name} />
              </div>
              <h3 className={styles.categoryName}>{category.name}</h3>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

function DefaultCTA() {
  // CTA section has been consolidated into the hero section
  return null;
}

// =====================================================
// UTILITIES
// =====================================================

function getIconByName(name: string) {
  const icons: Record<string, any> = {
    Truck: TruckIcon,
    Shield,
    Headphones: HeadphonesIcon,
    CreditCard,
    Star,
  };
  return icons[name] || null;
}
