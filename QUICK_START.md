# Quick Start Guide

## 🚀 Get Started in 5 Minutes

This guide will help you quickly set up and run the application locally.

### Prerequisites

- **Node.js**: v18 or higher
- **npm**: v9 or higher
- **Supabase Account**: Free tier is sufficient

### Step 1: Clone and Install

```bash
# Clone the repository
git clone <your-repo-url>
cd <project-directory>

# Install dependencies
npm install
```

### Step 2: Set Up Environment Variables

Create a `.env` file in the root directory:

```env
# Supabase Configuration
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

**How to get these values:**
1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Create a new project (or use existing)
3. Navigate to **Settings** → **API**
4. Copy:
   - **Project URL** → `VITE_SUPABASE_URL`
   - **anon public** key → `VITE_SUPABASE_ANON_KEY`
   - **service_role** key → `SUPABASE_SERVICE_ROLE_KEY`

### Step 3: Run Database Migrations

In your Supabase project dashboard:

1. Go to **SQL Editor**
2. Run each migration file in order:
   - `supabase/migrations/001_initial_schema.sql`
   - `supabase/migrations/002_row_level_security.sql`
   - `supabase/migrations/003_seed_data.sql`
   - `supabase/migrations/004_admin_governance_extensions.sql`
   - `supabase/migrations/005_marketing_automation_extensions.sql`
   - `supabase/migrations/006_rls_policies_extensions.sql`
   - `supabase/migrations/007_homepage_cms_system.sql`
   - `supabase/migrations/008_homepage_rls_policies.sql`

### Step 4: Start Development Server

```bash
npm run dev
```

Visit **http://localhost:5173** in your browser.

### Step 5: Explore the Application

#### Customer-Facing Pages
- **Home**: `/` - Landing page with CMS-driven sections
- **Products**: `/products` - Browse all products
- **Product Detail**: `/products/:slug` - Individual product page
- **Categories**: `/categories` - Browse by category
- **Cart**: `/cart` - Shopping cart
- **Login**: `/login` - Customer login
- **Register**: `/register` - Create account

#### Admin Panel
- **Dashboard**: `/admin/dashboard` - Admin overview
- Other admin routes are placeholders (coming soon)

### Testing the Application

1. **Browse Products**: Navigate to `/products`
2. **View Product Details**: Click any product
3. **Check Categories**: Visit `/categories`
4. **Admin Access**: Go to `/admin/dashboard`

### Common Issues

**Issue: "Cannot find module" errors**
- Solution: Run `npm install` again

**Issue: Blank homepage**
- Solution: The homepage is CMS-driven. If no content exists in database, it shows default fallback sections.

**Issue: Database errors**
- Solution: Ensure all 8 migration files are run in order

**Issue: Build errors**
- Solution: Run `npm run typecheck` to identify type issues

### Next Steps

Once running:

1. **Customize Theme**: Edit `app/styles/theme.css`
2. **Add Products**: Use Supabase dashboard or admin panel
3. **Configure Homepage**: Set up sections in database
4. **Enable Auth**: Configure Supabase Authentication

### Production Deployment

See **README.md** for full deployment instructions to:
- **Render**: Web hosting
- **Supabase**: Database backend
- **GitHub**: Source control

---

**Need Help?**
- Check the full **README.md** for detailed documentation
- Review **PROJECT_SUMMARY.md** for architecture overview
- See **ENTERPRISE_FEATURES.md** for advanced capabilities
