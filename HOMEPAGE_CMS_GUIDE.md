# Homepage CMS System - Complete Guide

## Overview

The ShopName eCommerce platform features a **complete, enterprise-grade Homepage CMS System** that gives administrators full control over homepage content, layout, and behavior without touching code.

## Key Capabilities

### ✅ Full Admin Control
- Configure all homepage sections from admin panel
- No code changes required
- Drag-and-drop section ordering (ready for UI implementation)
- Enable/disable sections on the fly

### ✅ Dynamic Content
- Hero carousels with multiple slides
- Scheduled content (publish/unpublish dates)
- A/B testing variants
- Real-time updates

### ✅ Performance Tracking
- Section impression tracking
- Click-through rate monitoring
- Scroll depth analytics
- Conversion attribution

### ✅ Content Versioning
- Full homepage snapshots
- Rollback capability
- Content block version history
- Draft/publish workflow

## Section Types

### 1. Hero Section
**Purpose**: Main banner area with call-to-action buttons

**Features**:
- Multi-slide carousel with configurable duration
- Primary and secondary CTA buttons
- Background images or gradients
- Text alignment control
- Overlay opacity settings
- Auto-play toggle
- Slide indicators
- A/B testing support

**Admin Controls**:
```typescript
- Headline (200 chars)
- Subheadline (text)
- Primary CTA text & link
- Secondary CTA text & link
- Background image URL
- Foreground image URL
- Text alignment (left/center/right)
- Text color
- Overlay opacity (0-1)
- Display order
- Enable/disable
- Schedule start/end dates
- A/B test variant name
```

**Analytics Tracked**:
- Hero CTA clicks (primary/secondary)
- Slide impressions
- Click-through rate

### 2. Trust Signals Bar
**Purpose**: Build credibility with trust badges

**Features**:
- Icon + title + description
- Responsive horizontal scroll on mobile
- Custom icon selection
- Admin-controlled ordering

**Examples**:
- Free Shipping
- Secure Payment
- 24/7 Support
- Easy Returns

**Admin Controls**:
```typescript
- Icon name (from Lucide library)
- Icon URL (custom upload)
- Title (100 chars)
- Description (200 chars)
- Display order
- Enable/disable
```

### 3. Promotional Banners
**Purpose**: Highlight sales, campaigns, or special offers

**Features**:
- Full-width, half-width, quarter-width layouts
- Click and impression tracking
- Scheduled display windows
- Mobile-specific images
- A/B testing

**Admin Controls**:
```typescript
- Title
- Subtitle
- Desktop image URL
- Mobile image URL
- CTA text
- CTA link
- Banner type (full_width/half_width/quarter_width)
- Position (left/center/right)
- Schedule start/end dates
- A/B test variant
- Display order
```

**Analytics Tracked**:
- Click count
- Impression count
- Click-through rate
- Time on page after click

### 4. Featured Categories
**Purpose**: Showcase main product categories

**Features**:
- Link to category pages
- Custom images per category
- Custom titles (override category name)
- Scheduled visibility

**Admin Controls**:
```typescript
- Category selection (from catalog)
- Custom title (optional override)
- Custom image URL (optional override)
- Display order
- Schedule start/end dates
- Enable/disable
```

**Analytics Tracked**:
- Category click events
- Click-through to products

### 5. Featured Products
**Purpose**: Highlight specific products

**Features**:
- **Auto Mode**: Best sellers, trending, new arrivals
- **Manual Mode**: Hand-picked products
- Custom badges ("Sale", "New", etc.)
- Override pricing for special displays

**Selection Modes**:
1. **Manual**: Admin selects specific products
2. **Auto Best Sellers**: Based on sales volume
3. **Auto Trending**: Based on recent views/purchases
4. **Auto New Arrivals**: Based on publish date

**Admin Controls**:
```typescript
- Product selection
- Selection mode (manual/auto)
- Selection criteria (for auto mode)
  - Min sales
  - Min rating
  - Date range
  - Category filter
- Display order
- Override price (optional)
- Override badge text
- Override badge color
- Enable/disable
```

**Analytics Tracked**:
- Product click events
- Add-to-cart from homepage
- Conversion rate

### 6. Flash Sale Section
**Purpose**: Create urgency with time-limited offers

**Features**:
- Live countdown timer
- Stock limits per product
- Auto-hide when expired
- Discount display
- Stock remaining indicator

**Admin Controls**:
```typescript
- Title
- Subtitle
- Start date/time
- End date/time
- Discount type (percentage/fixed)
- Discount value
- Stock limit (optional)
- Auto-hide on expiry
- Product selection
- Per-product discount override
- Per-product stock limit
```

**Analytics Tracked**:
- Flash sale impressions
- Product clicks
- Conversion rate
- Revenue generated

### 7. Brand Story / Content Blocks
**Purpose**: Tell your brand story or showcase USPs

**Features**:
- Text + image layouts
- Multiple block types
- Version history
- Draft/publish workflow
- Rollback capability

**Block Types**:
- Text + Image
- Text Only
- Image Only
- Video
- Custom HTML

**Admin Controls**:
```typescript
- Block type
- Title
- Subtitle
- Content (markdown/HTML)
- Image URL
- Video URL
- Image position (left/right/top/bottom/background)
- CTA text & link
- Display order
- Version number
- Published status
- Enable/disable
```

**Versioning**:
- Auto-creates version on edit
- Complete content snapshot
- Change summary notes
- Rollback to any previous version

### 8. Newsletter Subscription
**Purpose**: Capture email addresses for marketing

**Features**:
- Email validation
- Consent checkbox (GDPR compliant)
- Double opt-in support
- Success/error messaging
- Campaign integration ready

**Admin Controls**:
```typescript
- Title
- Subtitle
- Placeholder text
- Success message
- Consent text
- Consent required (toggle)
- Double opt-in enabled
- Campaign ID (for email platform)
- Enable/disable
```

**Analytics Tracked**:
- Newsletter submit events
- Conversion rate
- Subscription source

**Subscriber Management**:
- Email address
- Subscribed from (tracking)
- Consent given + timestamp
- Verified status
- Verification token
- Active/unsubscribed
- User ID (if logged in)

### 9. Social Proof / Reviews
**Purpose**: Build trust with customer testimonials

**Features**:
- Featured review selection
- Star ratings display
- Customer name/avatar
- Admin curation

**Admin Controls**:
```typescript
- Review selection (from approved reviews)
- Display order
- Enable/disable
```

### 10. Personalized Recommendations
**Purpose**: Show relevant products based on behavior

**Rule Types**:
- Viewed Also Viewed
- Purchased Also Purchased
- Similar Categories
- Trending in Category
- Personalized for You
- Complete the Look
- Manual Selection

**Admin Controls**:
```typescript
- Rule name
- Rule type
- Target audience (all/logged_in/guest/segment)
- Audience segment
- Fallback rule type
- Max items to show
- Min rating filter
- Exclude purchased items
- Exclude out-of-stock
- Priority
- Enable/disable
```

## Homepage Analytics

### Event Types Tracked

1. **Hero CTA Click**
   - Which CTA (primary/secondary)
   - Destination link
   - Slide number
   - Timestamp

2. **Banner Click**
   - Banner ID
   - Click position
   - Destination
   - Timestamp

3. **Banner Impression**
   - Banner ID
   - Time visible
   - Scroll position when visible

4. **Section Impression**
   - Section ID
   - Section type
   - Time on section
   - Scroll depth when viewed

5. **Product Click**
   - Product ID
   - Section it was clicked from
   - Position in grid
   - Timestamp

6. **Category Click**
   - Category ID
   - Section clicked from
   - Timestamp

7. **Newsletter Submit**
   - Success/failure
   - Subscribed from
   - Timestamp

8. **Scroll Depth**
   - Percentage scrolled (0-100)
   - Timestamp

9. **Conversion Attribution**
   - From homepage to purchase
   - Section that led to conversion
   - Revenue attributed

### Analytics Dashboard (Ready for Implementation)

Admins can view:
- Section performance comparison
- CTA click-through rates
- Banner effectiveness
- Product engagement
- Conversion funnels starting from homepage
- Time-series analytics
- A/B test results

## Homepage Versioning

### Version Management

**Create Version**:
```typescript
{
  version_number: 2,
  version_name: "Holiday 2024",
  description: "Christmas campaign homepage",
  configuration_snapshot: { /* full config */ },
  is_active: false,
  is_published: false,
  ab_test_percentage: null
}
```

**Publish Version**:
- Set `is_published = true`
- Set `published_at = now()`
- Optionally set `is_active = true` to make it live

**A/B Testing**:
- Create two versions
- Set `ab_test_percentage` (e.g., 50/50 split)
- System randomly assigns users to variants
- Track performance per variant

**Rollback**:
1. Find previous version
2. Set old version `is_active = true`
3. Set current version `is_active = false`
4. Changes take effect immediately

## Scheduling System

All major content supports scheduling:

**Schedule Fields**:
```typescript
- scheduled_start_at: TIMESTAMPTZ
- scheduled_end_at: TIMESTAMPTZ
```

**Behavior**:
- Content appears when `now() >= scheduled_start_at`
- Content hides when `now() >= scheduled_end_at`
- Null = always visible

**Use Cases**:
- Holiday campaigns
- Flash sales
- Seasonal banners
- Limited-time offers
- Timed content rotation

## A/B Testing Framework

### Test Setup

1. **Create Variants**:
   - Hero Slide A: "Buy Now" CTA
   - Hero Slide B: "Shop Now" CTA

2. **Set Variant Names**:
   ```typescript
   slide_a.ab_test_variant = "buy_now_cta"
   slide_b.ab_test_variant = "shop_now_cta"
   ```

3. **Enable Testing**:
   ```typescript
   section.ab_test_enabled = true
   ```

4. **Track Events**:
   - All events include `ab_test_variant` field
   - Analytics dashboard shows performance per variant

5. **Analyze Results**:
   - Compare click-through rates
   - Compare conversions
   - Determine winner

6. **Deploy Winner**:
   - Disable losing variant
   - Make winner default

## Security & Permissions

### Row Level Security

All homepage tables have RLS policies:

**Public Access**:
- Read active, published content
- Read scheduled content (if within time window)

**Admin Access**:
- Full CRUD on all homepage tables
- Based on role permissions
- Audit logged

**Roles with Homepage Access**:
- `super_admin`: Full control
- `admin`: Full control
- `marketing_manager`: Content management
- `content_manager`: CMS operations

### Permission System

Admins must have:
```sql
entity_type = 'homepage'
AND can_edit = true
```

## API / Service Layer

### Homepage Service Methods

```typescript
// Get full homepage configuration
getActiveHomepageConfig(): Promise<HomepageConfig>

// Hero slides
getHeroSlides(sectionId: string): Promise<HeroSlide[]>
createHeroSlide(input: CreateHeroSlideInput): Promise<HeroSlide>
updateHeroSlide(id: string, updates: Partial<CreateHeroSlideInput>): Promise<HeroSlide>
deleteHeroSlide(id: string): Promise<void>

// Banners
getBanners(sectionId: string): Promise<Banner[]>
createBanner(input: CreateBannerInput): Promise<Banner>
trackBannerClick(bannerId: string): Promise<void>
trackBannerImpression(bannerId: string): Promise<void>

// Trust signals
getTrustSignals(sectionId: string): Promise<TrustSignal[]>

// Featured categories
getFeaturedCategories(sectionId: string): Promise<any[]>

// Featured products
getFeaturedProducts(sectionId: string): Promise<any[]>

// Flash sales
getActiveFlashSale(sectionId: string): Promise<FlashSale | null>

// Content blocks
getContentBlocks(sectionId: string): Promise<ContentBlock[]>

// Newsletter
getNewsletterConfig(sectionId: string): Promise<NewsletterConfig | null>
subscribeToNewsletter(input: NewsletterSubscribeInput): Promise<NewsletterSubscription>

// Featured reviews
getFeaturedReviews(sectionId: string): Promise<any[]>

// Analytics
trackHomepageEvent(event: HomepageAnalyticsEvent): Promise<void>
trackScrollDepth(percentage: number, sectionId?: string): Promise<void>
trackSectionImpression(sectionId: string, sectionType: string): Promise<void>
trackCTAClick(sectionId: string, ctaType: 'primary' | 'secondary', link: string): Promise<void>
```

## Database Schema

### Core Tables

```sql
-- Section configuration
homepage_sections (
  id, section_type, title, subtitle, display_order,
  is_enabled, layout_type, background_color, background_gradient,
  visibility_rules, ab_test_variant, ab_test_enabled,
  scheduled_start_at, scheduled_end_at, metadata,
  created_at, updated_at, created_by, updated_by,
  deleted_at, deleted_by
)

-- Hero slides
homepage_hero_slides (
  id, section_id, headline, subheadline,
  primary_cta_text, primary_cta_link,
  secondary_cta_text, secondary_cta_link,
  background_image_url, background_video_url, foreground_image_url,
  text_alignment, text_color, overlay_opacity,
  display_order, is_enabled, auto_play, duration_seconds,
  ab_test_variant, scheduled_start_at, scheduled_end_at,
  created_at, updated_at, created_by, updated_by,
  deleted_at, deleted_by
)

-- ... (see migration files for complete schema)
```

### Indexes

All tables have indexes on:
- Foreign keys
- `deleted_at` (for soft deletes)
- `is_enabled` (for active filtering)
- `display_order` (for sorting)
- `scheduled_start_at`, `scheduled_end_at` (for scheduling)

## Implementation Status

### ✅ Completed
- [x] Complete database schema (16 tables)
- [x] Row Level Security policies
- [x] Service layer with all CRUD operations
- [x] Frontend section components
- [x] Analytics tracking
- [x] Scheduling system
- [x] A/B testing framework
- [x] Versioning system
- [x] Newsletter subscription
- [x] Mobile responsive design

### 🔄 Ready for Admin UI
- [ ] Admin panel for section management
- [ ] Drag-and-drop section ordering
- [ ] Visual preview before publish
- [ ] Analytics dashboard with charts
- [ ] A/B test result comparison
- [ ] Bulk content operations
- [ ] Media library integration

### 🚀 Future Enhancements
- [ ] AI-powered content suggestions
- [ ] Auto-optimization based on analytics
- [ ] Multi-language support
- [ ] Personalization engine
- [ ] Real-time preview updates
- [ ] Template library
- [ ] Export/import configurations

## Best Practices

### Content Strategy
1. **Hero Section**: Keep headlines under 10 words
2. **Banners**: Use high-quality images (min 1920px wide)
3. **Flash Sales**: Run for 24-72 hours maximum
4. **Newsletter**: Always include consent checkbox
5. **Reviews**: Rotate featured reviews monthly

### Performance
1. Lazy-load images below the fold
2. Compress banner images
3. Limit featured products to 8-12 items
4. Use CDN for static assets
5. Enable browser caching

### SEO
1. Use semantic HTML in content blocks
2. Add alt text to all images
3. Include keywords in headlines
4. Create unique meta descriptions
5. Structure content with proper headings

### Analytics
1. Track all user interactions
2. Review metrics weekly
3. A/B test CTAs regularly
4. Monitor scroll depth
5. Analyze conversion funnels

### Security
1. Validate all admin inputs
2. Sanitize HTML in content blocks
3. Check image URLs before rendering
4. Rate-limit newsletter subscriptions
5. Audit admin actions

## Troubleshooting

### Content Not Appearing
- Check `is_enabled = true`
- Verify `scheduled_start_at` is in past
- Verify `scheduled_end_at` is in future
- Check RLS policies
- Verify section is in active homepage version

### Analytics Not Tracking
- Verify Supabase connection
- Check browser console for errors
- Verify event type is valid
- Check user permissions
- Verify `track_homepage_event` function exists

### Newsletter Not Working
- Verify email regex validation
- Check consent checkbox is checked
- Verify newsletter_config exists
- Check RLS policies on newsletter_subscriptions
- Verify Supabase email is configured

## Migration Guide

### From Static Homepage

1. **Run Migrations**: 007, 008
2. **Create Default Sections**:
   ```sql
   INSERT INTO homepage_sections (section_type, title, display_order, is_enabled)
   VALUES 
     ('hero', 'Welcome', 1, true),
     ('trust_signals', null, 2, true),
     ('featured_categories', 'Shop by Category', 3, true),
     ('best_sellers', 'Best Sellers', 4, true);
   ```
3. **Migrate Existing Content**: Copy banners, products, etc.
4. **Create Homepage Version**: Snapshot current state
5. **Publish**: Set version active
6. **Test**: Verify all sections render
7. **Monitor**: Check analytics flowing

## Support

For questions or issues:
- Documentation: This guide
- Database Schema: `supabase/migrations/007_*.sql` and `008_*.sql`
- Service Layer: `app/services/homepage.service.ts`
- Frontend: `app/routes/home.tsx`

---

**Last Updated**: 2024
**Version**: 1.0.0
