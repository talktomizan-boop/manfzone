/**
 * Wishlist Page
 * Shows user's saved/favorite products
 */

import { Link, useFetcher } from 'react-router';
import { Header } from '~/components/header/header';
import { Footer } from '~/components/footer/footer';
import { ProductCard } from '~/components/product-card/product-card';
import { Button } from '~/components/ui/button/button';
import { createSupabaseServerClient } from '~/lib/supabase.server';
import { redirectToLogin } from '~/lib/redirect.server';
import type { Route } from './+types/wishlist';
import styles from './cart.module.css';
import { Heart, ShoppingCart } from 'lucide-react';

export function meta() {
  return [
    { title: 'My Wishlist - Manaf Zone' },
    { name: 'description', content: 'View and manage your saved products' },
  ];
}

export async function loader({ request }: Route.LoaderArgs) {
  const { supabase, headers } = createSupabaseServerClient(request);

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return redirectToLogin(request, headers);
  }

  const { data, error } = await supabase
    .from('wishlists')
    .select(
      `
      id,
      created_at,
      product:products(
        id,
        name,
        slug,
        base_price,
        compare_at_price,
        is_featured,
        product_images(url, is_primary),
        inventory(available_quantity)
      )
    `
    )
    .eq('user_id', session.user.id)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Wishlist loader error:', error);
  }

  const wishlistProducts = (data || [])
    .map((row: any) => {
      const p = row.product;
      if (!p) return null;
      return {
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
      };
    })
    .filter(Boolean);

  return { wishlistProducts };
}

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  const intent = (formData.get('intent') || '').toString();
  const productId = (formData.get('product_id') || '').toString();

  const { supabase, headers } = createSupabaseServerClient(request);
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return redirectToLogin(request, headers);
  }

  if (!productId) {
    return { error: 'Missing product' };
  }

  if (intent === 'toggle' || intent === 'remove') {
    const { data: existing } = await supabase
      .from('wishlists')
      .select('id')
      .eq('user_id', session.user.id)
      .eq('product_id', productId)
      .maybeSingle();

    if (existing?.id) {
      const { error } = await supabase.from('wishlists').delete().eq('id', existing.id);
      if (error) return { error: error.message };
      return { success: true, removed: true };
    }

    if (intent === 'toggle') {
      const { error } = await supabase.from('wishlists').insert({
        user_id: session.user.id,
        product_id: productId,
      });
      if (error) return { error: error.message };
      return { success: true, added: true };
    }

    // intent === 'remove' and item wasn't present
    return { success: true, removed: false };
  }

  return { error: 'Unsupported action' };
}

export default function Wishlist({ loaderData }: Route.ComponentProps) {
  const { wishlistProducts } = loaderData as any;
  const cartFetcher = useFetcher();
  const wishlistFetcher = useFetcher();
  
  return (
    <div className={styles.page}>
      <Header />

      <main className={styles.main}>
        <div className={styles.container}>
          <div className={styles.header}>
            <h1 className={styles.title}>
              <Heart size={32} />
              My Wishlist
            </h1>
            <p className={styles.subtitle}>
              {wishlistProducts.length} {wishlistProducts.length === 1 ? 'item' : 'items'} saved
            </p>
          </div>

          {wishlistProducts.length > 0 ? (
            <>
              <div className={styles.productGrid}>
                {wishlistProducts.map((product: any) => (
                  <div key={product.id} className={styles.wishlistCard}>
                    <ProductCard product={product} />
                    <div className={styles.wishlistActions}>
                      <Button
                        size="sm"
                        className={styles.addToCartButton}
                        disabled={cartFetcher.state === 'submitting'}
                        onClick={() => {
                          const fd = new FormData();
                          fd.set('intent', 'add');
                          fd.set('product_id', product.id);
                          fd.set('quantity', '1');
                          cartFetcher.submit(fd, { method: 'post', action: '/cart' });
                        }}
                      >
                        <ShoppingCart size={16} />
                        Add to Cart
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className={styles.removeButton}
                        disabled={wishlistFetcher.state === 'submitting'}
                        onClick={() => {
                          const fd = new FormData();
                          fd.set('intent', 'remove');
                          fd.set('product_id', product.id);
                          wishlistFetcher.submit(fd, { method: 'post' });
                        }}
                      >
                        Remove
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              <div className={styles.actions}>
                <Link to="/products">
                  <Button variant="outline">Continue Shopping</Button>
                </Link>
              </div>
            </>
          ) : (
            <div className={styles.emptyCart}>
              <Heart size={64} />
              <h2>Your wishlist is empty</h2>
              <p>Save items you love to buy them later</p>
              <Link to="/products">
                <Button size="lg">Browse Products</Button>
              </Link>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
