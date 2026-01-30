/**
 * New Arrivals Page
 * Shows recently added products
 */

import { Link } from 'react-router';
import { Header } from '~/components/header/header';
import { Footer } from '~/components/footer/footer';
import { ProductCard } from '~/components/product-card/product-card';
import { Badge } from '~/components/ui/badge/badge';
import { Button } from '~/components/ui/button/button';
import { createSupabaseServerClient } from '~/lib/supabase.server';
import type { Route } from './+types/new-arrivals';
import styles from './products.module.css';
import { Sparkles } from 'lucide-react';

export function meta() {
  return [
    { title: 'New Arrivals - Manaf Zone' },
    { name: 'description', content: 'Check out our latest products and newest additions' },
  ];
}

export async function loader({ request }: Route.LoaderArgs) {
  const { supabase } = createSupabaseServerClient(request);

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
      created_at,
      product_images(url, is_primary),
      inventory(available_quantity)
    `
    )
    .eq('is_active', true)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(24);

  if (error) {
    console.error('New arrivals loader error:', error);
  }

  const newProducts = (data || []).map((p: any) => ({
    id: p.id,
    name: p.name,
    slug: p.slug,
    price: Number(p.base_price) || 0,
    compare_at_price: p.compare_at_price,
    image_url: p.product_images?.find((img: any) => img.is_primary)?.url || p.product_images?.[0]?.url || null,
    rating_average: 0,
    rating_count: 0,
    in_stock: (p.inventory?.[0]?.available_quantity || 0) > 0,
    is_featured: !!p.is_featured,
  }));

  return { newProducts };
}

export default function NewArrivals({ loaderData }: Route.ComponentProps) {
  const { newProducts } = loaderData as any;
  
  return (
    <div className={styles.page}>
      <Header />

      <main className={styles.main}>
        <div className={styles.container}>
          {/* Page Header */}
          <div className={styles.pageHeader}>
            <div>
              <h1 className={styles.pageTitle}>
                <Sparkles size={32} />
                New Arrivals
              </h1>
              <p className={styles.pageDescription}>
                Discover our latest products and newest additions to the store
              </p>
            </div>
          </div>

          {/* New This Week Banner */}
          <div className={styles.newArrivalsBanner}>
            <div className={styles.bannerContent}>
              <Badge variant="default">Just Landed</Badge>
              <h2>Fresh Picks This Week</h2>
              <p>Be the first to shop our newest collection</p>
            </div>
          </div>

          {/* Products Grid */}
          <div className={styles.productsSection}>
            <div className={styles.sectionHeader}>
              <h2>Latest Products</h2>
              <Badge variant="secondary">{newProducts.length} new items</Badge>
            </div>
            
            <div className={styles.productGrid}>
              {newProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </div>

          {/* See All Products */}
          <div className={styles.ctaSection}>
            <h3>Looking for more?</h3>
            <p>Browse our complete product catalog</p>
            <Link to="/products">
              <Button size="lg">View All Products</Button>
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
