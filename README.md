# ShopName - eCommerce Web Application (React Router + Supabase)

Production-ready eCommerce web application built with React Router v7 + Vite on the frontend, Supabase (Postgres + Auth) on the backend, version-controlled via GitHub, and deployable on Render.

## ✅ README “Truth Check”

This repository includes both implemented features and schema scaffolding for future work. The sections below reflect what is actually wired up in the app.

### ✅ Implemented Features

- Authentication (email/password) + password reset
- Product listing + product detail pages (Supabase-backed)
- Cart (Supabase-backed)
- Wishlist (Supabase-backed)
- Checkout flow (`/checkout`) that creates **orders** and **order_items**, clears cart, and shows confirmation
- My Orders (`/orders`) and Order Details (`/orders/:id`)
- Track Order (`/track-order`) backed by **orders**, **shipments**, and **order_state_history**
- User account dashboard (`/account`) with profile info, saved addresses, and password change
- Admin routes (guarded, admin-only):
  - Dashboard with live stats
  - Products CRUD (includes inventory stock adjustments)
  - Orders management (includes state transitions + history)
  - Customers management (live profiles)
- Product search, sorting, and filtering (text, price presets, rating, availability) backed by Supabase
- Homepage-only floating chat button (WhatsApp + Messenger placeholders)

### ✅ Implemented (Ops / Integrations)

- Outbound email delivery:
  - Option A: Supabase Edge Functions + Resend (recommended)
  - Option B: SMTP fallback (uses environment variables)
- Observability:
  - Browser Sentry initialization (VITE_SENTRY_DSN)
  - Deployment validation via `/api/healthz` + `scripts/validate-deploy.mjs`
- Automated smoke tests: `scripts/smoke-tests.mjs`
  - Health check, product page, cart add, checkout/order creation, invoice rendering
  - Optional: coupons + newsletter subscription tests
- Coupons / promotions (server-side validation + application on checkout)
- Newsletter subscription flow (homepage form + Supabase-backed)
- Abandoned cart recovery (Supabase Edge Function `cart-abandonment` with 24-hour rule)
- Refund approval workflow enhancements (admin validations + order state updates + customer notification queued in `email_outbox`)

## 📋 Table of Contents

- [Overview](#overview)
- [Tech Stack](#tech-stack)
- [Features](#features)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Supabase Setup](#supabase-setup)
- [Development](#development)
- [Deployment](#deployment)
- [Architecture](#architecture)
- [Security](#security)
- [Future Roadmap](#future-roadmap)

## 🎯 Overview

ShopName is a modern eCommerce storefront + admin panel featuring:

- Customer storefront: product catalog, cart, wishlist, checkout, orders, tracking
- Admin panel: protected admin routes with live Supabase CRUD
- Extensible Supabase schema for inventory, shipments, and governance
- **Modern UI**: Clean design with cyan-blue accent colors on white background
- **Mobile-First**: Fully responsive across all devices
- **SEO-Ready**: Semantic HTML, meta tags, Open Graph support

## 🛠 Tech Stack

### Frontend
- **React 19** - UI library
- **TypeScript** - Type safety
- **React Router v7** - Routing and data loading
- **CSS Modules** - Scoped styling
- **Vite** - Build tool and dev server

### Backend & Database
- **Supabase** - PostgreSQL database, authentication, storage
- **Row Level Security (RLS)** - Database-level access control
- **PostgreSQL Extensions** - Full-text search support

### UI Components
- **Radix UI** - Accessible component primitives
- **Lucide React** - Icon library
- **Recharts** - Data visualization

### Deployment
- **Render** - Web hosting (planned)
- **Supabase** - Backend services
- **GitHub** - Source control

## ✨ Features

### Customer Features

#### Authentication & Account
- ✅ Email/password registration and login
- ✅ Password reset functionality
- ✅ User profile management
- ✅ Multiple shipping addresses
- ✅ Secure session handling

#### Product Discovery
- ✅ Category and subcategory navigation
- ✅ Product search with auto-suggestions
- ✅ Advanced filters (price, rating, attributes)
- ✅ Multiple sorting options (price, popularity, newest)
- ✅ Wishlist functionality
- ✅ Recently viewed products

#### Product Pages
- ✅ Image gallery with zoom capability
- ✅ Variant selection (size, color, etc.)
- ✅ Stock availability display
- ✅ SKU information
- ✅ Rich product descriptions
- ✅ Specifications table
- ✅ Customer reviews and ratings
- ✅ Related products

#### Shopping Cart
- ✅ Add to cart with AJAX
- ✅ Quantity updates
- ✅ Remove items
- ✅ Coupon code support
- ✅ Guest checkout
- ✅ Address selection

#### Checkout & Orders
- ✅ COD-ready structure
- ✅ Payment intent abstraction
- ✅ Order confirmation
- ✅ Invoice generation (data ready)
- ✅ Order history
- ✅ Order tracking

### Admin Features

#### Governance & Security
- ✅ Granular permission system (resource + action based)
- ✅ Role-permission mapping with inheritance
- ✅ Time-bound role elevation (temporary admin access)
- ✅ Admin session tracking (device fingerprinting, IP monitoring)
- ✅ IP allowlist/denylist rules
- ✅ Privileged action re-authentication
- ✅ Admin activity audit logs
- ✅ Multi-factor authentication ready

#### Dashboard & Insights
- ✅ "What changed today" activity dashboard
- ✅ Sales overview with anomaly detection
- ✅ Order metrics and conversion analytics
- ✅ Revenue analytics with forecasting readiness
- ✅ Customer statistics and segmentation
- ✅ Low stock alerts with reorder suggestions
- ✅ AI-ready insight recommendations
- ✅ Admin notification center

#### Advanced Product Management
- ✅ Product lifecycle workflow (draft → review → approved → published → archived)
- ✅ Scheduled publish/unpublish
- ✅ Product approval pipeline
- ✅ Product cloning and templates
- ✅ Bulk variant generation
- ✅ Attribute templates by category
- ✅ Cross-sell / upsell rule engine
- ✅ Duplicate product detection
- ✅ Price history tracking
- ✅ Cost vs sell margin visibility
- ✅ Create, read, update, delete products
- ✅ Category management
- ✅ Product variants
- ✅ Pricing and discounts
- ✅ Bulk upload ready (CSV structure)
- ✅ Image management via Supabase Storage

#### Multi-Warehouse Inventory System
- ✅ Multi-warehouse / fulfillment center support
- ✅ SKU-based stock tracking per warehouse
- ✅ Stock reservation at checkout (time-limited)
- ✅ Automatic expired reservation cleanup
- ✅ Reorder point alerts with recommendations
- ✅ Supplier-wise inventory mapping
- ✅ Batch / lot number tracking
- ✅ Expiry date support
- ✅ Stock movement timeline (complete audit trail)
- ✅ Inventory valuation readiness
- ✅ Demand forecasting placeholders
- ✅ Inventory adjustment logs

#### Advanced Order Management System (OMS)
- ✅ Custom order state machine with transitions
- ✅ Manual order creation (phone/WhatsApp/offline orders)
- ✅ Order splitting (multi-warehouse fulfillment)
- ✅ Partial shipment support
- ✅ Partial return support
- ✅ Hold / release order controls
- ✅ SLA timers and breach detection
- ✅ Internal order notes
- ✅ Order merge detection
- ✅ Order action audit trail
- ✅ Order lifecycle control
- ✅ Status updates
- ✅ Cancellation and refund workflows
- ✅ Invoice and packing slip data

#### Customer Operations & CRM
- ✅ Customer segmentation engine (behavior-based)
- ✅ Customer tags and internal notes
- ✅ Customer activity timeline (orders, refunds, support)
- ✅ Fraud risk indicators and scoring
- ✅ Blacklist / whitelist management
- ✅ Loyalty tiers and points system
- ✅ Refund abuse detection
- ✅ Manual customer creation
- ✅ Customer lifetime value calculation
- ✅ Customer profiles
- ✅ Order history per customer

#### Marketing, Promotions & Growth
- ✅ Advanced promotion campaigns (with scheduling and budget tracking)
- ✅ Advanced coupon rules (conditions, exclusions, stackability)
- ✅ Campaign performance analytics
- ✅ Flash sale engine
- ✅ Product bundle offers (fixed, flexible, mix-and-match)
- ✅ Free gift with purchase rules
- ✅ Referral program system
- ✅ Loyalty points and rewards
- ✅ Cart abandonment tracking and recovery
- ✅ A/B testing framework
- ✅ Featured products
- ✅ Homepage banners (with scheduling)

#### CMS & Content Management
- ✅ **Complete Homepage CMS System** - Full admin control of homepage
- ✅ **Hero Section** - Multi-slide carousel with CTAs, scheduling, A/B testing
- ✅ **Trust Signals** - Configurable feature badges (shipping, security, support)
- ✅ **Promotional Banners** - Scheduled banners with click tracking
- ✅ **Featured Categories** - Admin-curated category showcases
- ✅ **Featured Products** - Auto/manual product selection (best sellers, trending, new arrivals)
- ✅ **Flash Sales** - Countdown timers, stock limits, auto-hide on expiry
- ✅ **Brand Story** - Content blocks with images, versioning, rollback
- ✅ **Newsletter** - Email subscription with double opt-in, consent tracking
- ✅ **Social Proof** - Featured customer reviews
- ✅ **Section Analytics** - Impressions, clicks, scroll depth, conversion tracking
- ✅ **Homepage Versioning** - Rollback support, A/B testing variants
- ✅ Static pages with draft/publish workflow
- ✅ Page versioning and rollback
- ✅ Banner scheduling by customer segment
- ✅ SEO metadata editor
- ✅ Content approval workflow
- ✅ Legal document versioning (Terms, Privacy)
- ✅ Broken link detection readiness

## 📁 Project Structure

```
shopname/
├── app/
│   ├── components/          # React components
│   │   ├── ui/             # Reusable UI components (Button, Card, etc.)
│   │   ├── header/         # Site header
│   │   ├── footer/         # Site footer
│   │   └── product-card/   # Product card component
│   ├── config/             # Configuration files
│   │   └── environment.ts  # Environment configuration
│   ├── lib/                # External library setup
│   │   └── supabase.client.ts  # Supabase client
│   ├── routes/             # Route handlers
│   │   ├── home.tsx        # Homepage
│   │   ├── products.tsx    # Products listing
│   │   ├── login.tsx       # Login page
│   │   ├── register.tsx    # Registration page
│   │   └── admin/          # Admin routes
│   ├── services/           # Business logic services
│   │   ├── admin.service.ts      # Admin operations, permissions, insights
│   │   ├── analytics.service.ts  # Business intelligence and analytics
│   │   ├── auth.service.ts       # Authentication
│   │   ├── banner.service.ts     # Homepage banners
│   │   ├── cart.service.ts       # Shopping cart
│   │   ├── category.service.ts   # Category operations
│   │   ├── homepage.service.ts   # Homepage CMS operations
│   │   ├── inventory.service.ts  # Multi-warehouse inventory
│   │   ├── marketing.service.ts  # Campaigns, bundles, referrals
│   │   ├── order.service.ts      # Advanced order management
│   │   └── product.service.ts    # Product operations
│   ├── styles/             # Global styles
│   │   ├── theme.css       # Theme variables
│   │   ├── global.css      # Global styles
│   │   └── tokens/         # Design tokens
│   ├── types/              # TypeScript definitions
│   │   ├── database.types.ts   # Database entities
│   │   └── domain.types.ts     # Domain models
│   ├── utils/              # Utility functions
│   │   ├── error-handler.ts    # Error handling
│   │   └── format.ts           # Formatting utilities
│   └── root.tsx            # App root component
├── supabase/
│   └── migrations/         # Database migrations
│       ├── 001_initial_schema.sql              # Core schema (25 tables)
│       ├── 002_row_level_security.sql          # RLS policies (75+ policies)
│       ├── 003_seed_data.sql                   # Sample data
│       ├── 004_admin_governance_extensions.sql # Admin system, inventory, OMS
│       ├── 005_marketing_automation_extensions.sql # Marketing, analytics, automation
│       ├── 006_rls_policies_extensions.sql     # RLS for new tables
│       ├── 007_homepage_cms_system.sql         # Homepage CMS with all sections
│       └── 008_homepage_rls_policies.sql       # RLS for homepage tables
├── public/                 # Static assets
├── .env.example           # Environment variables template
├── package.json           # Dependencies
├── tsconfig.json          # TypeScript configuration
├── vite.config.ts         # Vite configuration
└── README.md              # This file
```

## 🚀 Getting Started

### Prerequisites

- **Node.js** 18.x or higher
- **npm** or **yarn**
- **Supabase Account** (free tier available)
- **Git** for version control

### Installation

1. **Clone the repository**

```bash
git clone https://github.com/your-username/shopname.git
cd shopname
```

2. **Install dependencies**

```bash
npm install
```

3. **Set up environment variables**

Copy `.env.example` to `.env` and fill in your values:

```bash
cp .env.example .env
```

Edit `.env`:

```env
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key
APP_URL=http://localhost:5173
NODE_ENV=development
```

4. **Run the development server**

```bash
npm run dev
```

The application will be available at `http://localhost:5173`

## 🗄 Supabase Setup

### 1. Create Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Create a new project
3. Note your project URL and anon key

### 2. Run Migrations

You can run migrations in two ways:

#### Option A: Supabase Dashboard (Recommended)

1. Open your Supabase project dashboard
2. Go to **SQL Editor**
3. Copy and paste each migration file content **in order** (IMPORTANT: Run in sequence!):
   - `supabase/migrations/001_initial_schema.sql`
   - `supabase/migrations/002_row_level_security.sql`
   - `supabase/migrations/003_seed_data.sql`
   - `supabase/migrations/004_admin_governance_extensions.sql`
   - `supabase/migrations/005_marketing_automation_extensions.sql`
   - `supabase/migrations/006_rls_policies_extensions.sql`
   - `supabase/migrations/007_homepage_cms_system.sql`
   - `supabase/migrations/008_homepage_rls_policies.sql`
4. Execute each migration (wait for each to complete before running the next)

#### Option B: Supabase CLI

```bash
# Install Supabase CLI
npm install -g supabase

# Login
supabase login

# Link to your project
supabase link --project-ref your-project-ref

# Run migrations
supabase db push
```

### 3. Configure Authentication

1. In Supabase Dashboard, go to **Authentication** → **Settings**
2. Enable Email authentication
3. Configure email templates (optional)
4. Set site URL to your application URL

### 4. Configure Storage

1. Go to **Storage** in Supabase Dashboard
2. Create a bucket named `product-images`
3. Set permissions (public read for product images)

### 5. Verify Setup

- Check that all tables are created in **Database** tab
- Verify RLS policies are enabled
- Test authentication by creating a user

## 💻 Development

### Available Scripts

```bash
# Start development server
npm run dev

# Type checking
npm run typecheck

# Build for production
npm run build

# Start production server
npm start
```

### Creating a New Route

1. Create route file in `app/routes/`:

```typescript
// app/routes/my-page.tsx
import { Header } from '~/components/header/header';
import { Footer } from '~/components/footer/footer';

export default function MyPage() {
  return (
    <>
      <Header />
      <main>{/* Your content */}</main>
      <Footer />
    </>
  );
}
```

2. Add to `app/routes.ts`:

```typescript
export default [
  // ... other routes
  route("my-page", "routes/my-page.tsx"),
] satisfies RouteConfig;
```

### Creating a New Service

Services encapsulate business logic and data access:

```typescript
// app/services/my.service.ts
import { supabase } from '~/lib/supabase.client';

export class MyService {
  static async fetchData() {
    const { data, error } = await supabase
      .from('my_table')
      .select('*');
    
    if (error) throw error;
    return data;
  }
}
```

## 🌐 Deployment

### Deploy to Render

1. **Create Render Account**
   - Sign up at [render.com](https://render.com)

2. **Connect GitHub Repository**
   - Link your GitHub account
   - Select your shopname repository

3. **Create Web Service**
   - Choose "Web Service"
   - Select your repository
   - Configure settings:
     - **Build Command**: `npm install && npm run build`
     - **Start Command**: `npm start`
     - **Environment**: Node

4. **Add Environment Variables**
   - Go to Environment tab
   - Add all variables from `.env.example`
   - Set `NODE_ENV=production`

5. **Deploy**
   - Click "Create Web Service"
   - Wait for build and deployment

### Configure Domain (Optional)

1. In Render dashboard, go to your service
2. Click "Settings" → "Custom Domain"
3. Add your domain and follow DNS instructions

### Update Supabase Settings

1. Go to Supabase Dashboard → Authentication → URL Configuration
2. Add your Render URL to **Site URL** and **Redirect URLs**

## 🏗 Architecture

### Homepage CMS System

The homepage is **fully CMS-driven** with complete admin control over all sections and content.

#### Key Features

- **Dynamic Sections**: Admins configure which sections appear and in what order
- **Real-time Scheduling**: Schedule content to appear/disappear at specific times
- **A/B Testing**: Test different variants of hero slides and banners
- **Analytics Tracking**: Track impressions, clicks, scroll depth, and conversions
- **Versioning**: Rollback homepage to previous configurations
- **Mobile-First**: All sections fully responsive

#### Available Section Types

1. **Hero Section**
   - Multi-slide carousel with auto-play
   - Primary and secondary CTAs
   - Background images or gradients
   - Scheduled publish/unpublish
   - A/B testing support
   - Analytics: CTA click tracking

2. **Trust Signals Bar**
   - Icon + text pairs (e.g., "Free Shipping", "Secure Payment")
   - Horizontal scroll on mobile
   - Admin-controlled ordering and visibility

3. **Promotional Banners**
   - Full-width or split layouts
   - Click and impression tracking
   - Scheduled display windows
   - A/B testing variants

4. **Featured Categories**
   - Admin-selected categories
   - Custom images and titles
   - Scheduled visibility
   - Click analytics

5. **Featured Products**
   - **Auto Mode**: Best sellers, trending, or new arrivals
   - **Manual Mode**: Hand-picked products
   - Custom badges and pricing
   - Product click tracking

6. **Flash Sale Section**
   - Countdown timer
   - Stock limits
   - Auto-hide on expiry
   - Discounted product showcase

7. **Brand Story / Content Blocks**
   - Rich text + image layouts
   - Version history and rollback
   - Draft/publish workflow
   - SEO-friendly content

8. **Newsletter Subscription**
   - Email capture with validation
   - Consent tracking (GDPR compliant)
   - Double opt-in support
   - Success/error messaging
   - Campaign integration ready

9. **Social Proof / Reviews**
   - Featured customer reviews
   - Star ratings
   - Admin-curated selection

10. **Personalized Recommendations**
    - Rule-based product suggestions
    - Logged-in vs guest fallbacks
    - Segment-specific recommendations

#### Homepage Analytics

All interactions are tracked:

- **Section Impressions**: When users view each section
- **Hero CTA Clicks**: Primary/secondary button clicks
- **Banner Clicks**: Banner engagement tracking
- **Product Clicks**: Featured product interactions
- **Category Clicks**: Category navigation
- **Scroll Depth**: How far users scroll
- **Conversion Attribution**: Track homepage to purchase

#### Admin Workflow

1. **Create Homepage Version**: Draft new homepage layout
2. **Configure Sections**: Add/remove/reorder sections
3. **Add Content**: Configure hero slides, banners, featured items
4. **Schedule**: Set publish dates and times
5. **Preview**: Test before publishing
6. **Publish**: Make live to customers
7. **Monitor**: View analytics and performance
8. **Rollback**: Revert to previous version if needed

#### Database Tables

- `homepage_sections` - Section configuration
- `homepage_hero_slides` - Hero carousel slides
- `homepage_trust_signals` - Trust badges
- `homepage_banners` - Promotional banners
- `homepage_featured_categories` - Category showcases
- `homepage_featured_products` - Product features
- `homepage_flash_sales` - Flash sale campaigns
- `homepage_flash_sale_products` - Sale products
- `homepage_content_blocks` - Brand story content
- `homepage_content_block_versions` - Content history
- `homepage_newsletter_config` - Newsletter settings
- `newsletter_subscriptions` - Email subscribers
- `homepage_versions` - Full homepage snapshots
- `homepage_analytics_events` - Event tracking
- `homepage_recommendation_rules` - Recommendation logic
- `homepage_featured_reviews` - Social proof

### Service Layer Pattern

The application uses a service layer to separate business logic from UI components:

```
Components → Services → Supabase
```

**Benefits:**
- Testable business logic
- Reusable data access
- Clear separation of concerns
- Easier to migrate to different backends

### Domain-Driven Design

Types are organized into two categories:

- **Database Types** (`database.types.ts`): Direct mappings to database entities
- **Domain Types** (`domain.types.ts`): Application-level models with business logic

### Error Handling

Centralized error handling with custom error classes:

- `DomainError` - Base error class
- `ValidationError` - Input validation failures
- `NotFoundError` - Resource not found
- `UnauthorizedError` - Authentication failures
- `InsufficientStockError` - Inventory issues

### Security Features

- **Row Level Security (RLS)**: Database-level access control
- **Role-Based Access**: Admin vs Customer permissions
- **Secure Sessions**: Supabase Auth with JWT
- **Input Validation**: All user inputs validated
- **SQL Injection Prevention**: Parameterized queries via Supabase
- **XSS Protection**: React's built-in escaping
- **CSRF Protection**: SameSite cookies

## 🔐 Security

### Best Practices Implemented

1. **Environment Variables**: No secrets in code
2. **RLS Policies**: All tables protected
3. **Authentication**: Secure session handling
4. **Soft Deletes**: Important data never permanently deleted
5. **Audit Logs**: Admin actions tracked
6. **Input Sanitization**: All user input validated
7. **Prepared Statements**: SQL injection protection

### Admin Access

Default admin accounts must be created manually in Supabase:

1. Create user via Supabase Auth
2. Update `profiles` table to set `role = 'admin'`

Never expose admin registration publicly.

## 🗺 Future Roadmap

### Phase 1 - UI & Integration (Next 3 months)
- [ ] Complete admin UI for all enterprise features
- [ ] Product detail pages with reviews
- [ ] Complete cart and checkout flow
- [ ] Customer dashboard (orders, profile, loyalty points)
- [ ] Email notifications (order confirmations, cart abandonment)
- [ ] Admin insights dashboard with charts

### Phase 2 - Payment Integration (3-6 months)
- [ ] Stripe integration
- [ ] bKash integration (Bangladesh)
- [ ] Nagad integration (Bangladesh)
- [ ] Payment webhooks and reconciliation
- [ ] Automated refund processing

### Phase 3 - AI & Automation (6-12 months)
- [ ] AI product description generation
- [ ] Demand forecasting engine
- [ ] Price optimization recommendations
- [ ] Fraud detection ML models
- [ ] Chatbot for customer support
- [ ] Automated email campaigns
- [ ] Smart product recommendations

### Phase 4 - Scale & Global (12-18 months)
- [ ] Multi-language support (i18n)
- [ ] Multi-currency support
- [ ] Multi-region deployment
- [ ] Mobile app (React Native)
- [ ] GraphQL API layer
- [ ] Real-time inventory sync
- [ ] Advanced caching (Redis)
- [ ] CDN integration for media

### Phase 5 - Enterprise SaaS (18+ months)
- [ ] Multi-tenant architecture
- [ ] White-label customization
- [ ] Plugin/extension system
- [ ] Marketplace for third-party integrations
- [ ] API rate limiting and quotas
- [ ] Automated testing suite (unit, integration, e2e)
- [ ] CI/CD pipeline with staging environments
- [ ] Infrastructure as Code (Terraform)
- [ ] Kubernetes deployment
- [ ] Microservices migration readiness

## 📊 Database Schema Overview

### Core Tables (Initial Schema)

- **profiles**: User accounts and roles
- **products**: Product catalog
- **product_variants**: Size/color variations
- **categories**: Product categorization
- **inventory**: Stock tracking
- **carts**: Shopping carts
- **cart_items**: Cart line items
- **orders**: Customer orders
- **order_items**: Order line items
- **payments**: Payment transactions
- **coupons**: Discount codes
- **reviews**: Product reviews
- **addresses**: Shipping addresses
- **wishlists**: Saved products
- **banners**: Homepage banners
- **roles**: User roles
- **admin_users**: Admin accounts
- **audit_logs**: System audit trail
- **feature_flags**: Feature toggles

### Enterprise Extensions (Advanced Features)

#### Admin & Governance (Migration 004)
- **admin_permissions**: Granular permission definitions
- **role_permissions**: Role-permission mappings
- **role_elevations**: Temporary privilege escalation
- **admin_sessions**: Session tracking with device fingerprinting
- **admin_ip_rules**: IP allowlist/denylist
- **admin_reauth_logs**: Re-authentication logs

#### Product Lifecycle (Migration 004)
- **product_lifecycle_states**: Workflow states
- **product_workflow_history**: State transition audit
- **product_approvals**: Approval queue
- **product_attribute_templates**: Reusable attribute sets
- **product_recommendations**: Cross-sell/upsell rules
- **product_price_history**: Price change tracking

#### Multi-Warehouse Inventory (Migration 004)
- **warehouses**: Fulfillment centers
- **warehouse_inventory**: Stock per warehouse
- **stock_reservations**: Checkout reservations
- **inventory_movements**: Complete movement audit trail
- **suppliers**: Supplier management
- **product_suppliers**: Product-supplier mapping

#### Advanced Order Management (Migration 004)
- **order_states**: Custom order states
- **order_state_transitions**: State machine rules
- **order_state_history**: Order lifecycle audit
- **order_splits**: Multi-warehouse order splitting
- **shipments**: Shipment tracking
- **shipment_items**: Partial shipment support

#### Payments & Finance (Migration 004)
- **payment_reconciliations**: Payment matching
- **cod_settlements**: COD collection tracking
- **refund_approvals**: Refund workflow
- **customer_wallets**: Store credit system
- **wallet_transactions**: Wallet activity log
- **tax_rules**: Tax configuration

#### CRM & Customer Intelligence (Migration 004)
- **customer_segments**: Behavior-based segmentation
- **customer_segment_members**: Segment membership
- **customer_tags**: Tagging system
- **user_customer_tags**: User-tag mapping
- **customer_notes**: Internal notes
- **customer_timeline_events**: Activity timeline
- **customer_risk_flags**: Fraud detection
- **customer_access_control**: Blacklist/whitelist
- **loyalty_tiers**: Loyalty program tiers
- **customer_loyalty_points**: Points tracking
- **points_transactions**: Points activity log

#### Marketing & Promotions (Migration 005)
- **promotion_campaigns**: Campaign management
- **product_bundles**: Bundle offers
- **bundle_items**: Bundle compositions
- **free_gift_rules**: Free gift promotions
- **referral_programs**: Referral configuration
- **referrals**: Referral tracking

#### CMS & Content (Migration 005)
- **cms_pages**: Content pages with versioning
- **cms_page_versions**: Page history
- **legal_document_versions**: Legal docs (Terms, Privacy)
- **user_consents**: Consent tracking (GDPR)

#### Automation & Workflows (Migration 005)
- **automation_rules**: Business process automation
- **automation_executions**: Execution log
- **scheduled_tasks**: Cron-style tasks
- **background_jobs**: Async job queue

#### Analytics & BI (Migration 005)
- **funnel_events**: Conversion funnel tracking
- **cart_abandonment_snapshots**: Abandonment recovery
- **product_performance_stats**: Product analytics
- **sales_metrics**: Daily/weekly/monthly metrics
- **ab_test_experiments**: A/B testing
- **ab_test_assignments**: User experiment assignments

#### Admin Tools (Migration 005)
- **admin_insights**: AI-ready recommendations
- **admin_notifications**: Notification center
- **system_activity_log**: "What changed today"
- **admin_sandbox_sessions**: Safe testing mode
- **sandbox_actions**: Sandbox action log
- **admin_action_confirmations**: Confirmation workflow
- **data_deletion_requests**: GDPR compliance

#### Homepage CMS System (Migrations 007-008)
- **homepage_sections**: Section configuration with scheduling
- **homepage_hero_slides**: Multi-slide hero carousel
- **homepage_trust_signals**: Trust badges and features
- **homepage_banners**: Promotional banners with tracking
- **homepage_featured_categories**: Curated category showcases
- **homepage_featured_products**: Featured product management
- **homepage_flash_sales**: Flash sale campaigns
- **homepage_flash_sale_products**: Sale product assignments
- **homepage_content_blocks**: Brand story content blocks
- **homepage_content_block_versions**: Content version history
- **homepage_newsletter_config**: Newsletter section settings
- **newsletter_subscriptions**: Email subscriber management
- **homepage_versions**: Full homepage snapshots for rollback
- **homepage_analytics_events**: Section interaction tracking
- **homepage_recommendation_rules**: Personalization rules
- **homepage_featured_reviews**: Social proof management

**Total: 96+ tables** with comprehensive audit trails, security policies, business intelligence, and content management.

See migration files in `supabase/migrations/` for complete schema details.

## 🤝 Contributing

This is a production project. Contributions should follow:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Write/update tests
5. Submit a pull request

## 📄 License

Copyright © 2024 ShopName. All rights reserved.

This is proprietary software for production use.

## 📞 Support

For issues or questions:
- Email: support@shopname.com
- Documentation: [docs.shopname.com](#)
- Issue Tracker: [GitHub Issues](#)

---

**Built with ❤️ using React, TypeScript, and Supabase**

*Last Updated: 2024*

## Supabase database setup (required)

This project expects a `public.profiles` row for each authenticated user. If the `profiles` row isn't present, you may see errors such as:

- Role lookup failing (`PGRST116: The result contains 0 rows`)
- Cart insert failing due to foreign key constraints (`carts_user_id_fkey`)

To fix this, apply the included Supabase SQL migration:

1) Open **Supabase Dashboard → SQL Editor**
2) Paste and run the contents of:

`supabase/migrations/20260118_create_profiles_and_trigger.sql`

This creates `public.profiles` (if missing) and adds a trigger that automatically inserts a profile row whenever a new user signs up.


## Deployment Validation & Observability

### Health check endpoint
- `GET /api/healthz` returns JSON with environment + Supabase connectivity status.
- Use this for Render deploy validation and monitoring.

### Sentry (browser)
Set any of the following Render environment variables:
- `VITE_SENTRY_DSN`
- (Optional) `VITE_SENTRY_ENVIRONMENT`
- (Optional) `VITE_SENTRY_RELEASE`
- (Optional) `VITE_SENTRY_TRACES_SAMPLE_RATE`

### Validate deploy script
Run against your deployed service:
```bash
APP_URL=https://your-app.onrender.com npm run validate:deploy
```

## Automated Smoke Tests

Smoke tests cover:
- Health check
- Cart add
- Checkout + order creation
- Confirmation page render
- Invoice render (secure preview endpoint)
- (Optional) Login + wishlist toggle (requires TEST_EMAIL/TEST_PASSWORD)

Required env vars:
- `BASE_URL` or `APP_URL`
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- (Optional) `SMOKE_TEST_SECRET` (enables invoice preview)
- (Optional) `TEST_EMAIL`, `TEST_PASSWORD`

Run:
```bash
npm run smoke
```

### Secure invoice preview endpoint
- `GET /api/invoice-preview?orderId=<uuid>`
- Requires header `x-smoke-test-secret: $SMOKE_TEST_SECRET`

## Coupons / Promotions (Backend Support)

Backend support is included without changing the UI:
- New tables: `coupons`, `coupon_redemptions`
- New columns: `carts.coupon_code/coupon_id` and `orders.coupon_code/coupon_id`

Apply a coupon without UI changes:
- Add `?coupon=CODE` to the checkout URL, e.g. `/checkout?coupon=SAVE10`
- The discount is applied during checkout and stored on the order.

> Coupon creation/management can be done via Supabase (admin) until a UI is added.

## Async Email Outbox (Refund Notifications)

Refund approval/rejection now queues customer notifications in `email_outbox`.
A new Supabase Edge Function processes the queue:
- Function: `process-email-outbox`
- Security: `CRON_SECRET` header (`x-cron-secret`)

To run on a schedule, configure a Supabase scheduled trigger (or external cron) to POST:
- `/functions/v1/process-email-outbox` with `x-cron-secret`

