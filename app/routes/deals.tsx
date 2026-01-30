/**
 * Deals Page
 * Shows all active deals, promotions, and discounts
 */

import { Link } from 'react-router';
import { Header } from '~/components/header/header';
import { Footer } from '~/components/footer/footer';
import { ProductCard } from '~/components/product-card/product-card';
import { Badge } from '~/components/ui/badge/badge';
import { Button } from '~/components/ui/button/button';
import { createSupabaseServerClient } from '~/lib/supabase.server';
import type { Route } from './+types/deals';
import styles from './products.module.css';
import { Tag, TrendingDown, Clock, Percent } from 'lucide-react';

export function meta() {
  return [
    { title: 'Deals & Promotions - Manaf Zone' },
    { name: 'description', content: 'Find the best deals and discounts on your favorite products' },
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
      product_images(url, is_primary),
      inventory(available_quantity)
    `
    )
    .eq('is_active', true)
    .is('deleted_at', null)
    .not('compare_at_price', 'is', null)
    .order('created_at', { ascending: false })
    .limit(48);

  if (error) {
    console.error('Deals loader error:', error);
  }

  const dealsProducts = (data || [])
    .filter((p: any) => p.compare_at_price != null)
    .map((p: any) => ({
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

  return { dealsProducts };
}

export default function Deals({ loaderData }: Route.ComponentProps) {
  const { dealsProducts } = loaderData as any;
  
  return (
    <div className={styles.page}>
      <Header />

      <main className={styles.main}>
        <div className={styles.container}>
          {/* Page Header */}
          <div className={styles.pageHeader}>
            <div>
              <h1 className={styles.pageTitle}>
                <Tag size={32} />
                Deals & Promotions
              </h1>
              <p className={styles.pageDescription}>
                Save big on your favorite products with our exclusive deals
              </p>
            </div>
          </div>

          {/* Deal Categories */}
          <div className={styles.dealCategories}>
            <button className={styles.dealCategory}>
              <TrendingDown size={20} />
              Flash Sales
            </button>
            <button className={styles.dealCategory}>
              <Percent size={20} />
              Clearance
            </button>
            <button className={styles.dealCategory}>
              <Clock size={20} />
              Limited Time
            </button>
          </div>

          {/* Flash Sale Banner */}
          <div className={styles.flashSaleBanner}>
            <div className={styles.flashSaleContent}>
              <h2>Flash Sale</h2>
              <p>Up to 50% off on selected items - Limited time only!</p>
              <div className={styles.flashSaleTimer}>
                Ends in: <strong>12h 34m 56s</strong>
              </div>
            </div>
          </div>

          {/* Products Grid */}
          <div className={styles.productsSection}>
            <div className={styles.sectionHeader}>
              <h2>All Deals</h2>
              <Badge variant="secondary">{dealsProducts.length} deals available</Badge>
            </div>
            
            <div className={styles.productGrid}>
              {dealsProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>

            {dealsProducts.length === 0 && (
              <div className={styles.emptyState}>
                <Tag size={48} />
                <h3>No active deals right now</h3>
                <p>Check back soon for amazing discounts!</p>
                <Link to="/products">
                  <Button>Browse All Products</Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
