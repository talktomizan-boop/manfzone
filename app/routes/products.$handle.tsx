import { useMemo, useState } from 'react';
import { Link, useFetcher } from 'react-router';
import { Star, Heart, ShoppingCart, Truck, Shield, RotateCcw } from 'lucide-react';
import { Header } from '~/components/header/header';
import { Footer } from '~/components/footer/footer';
import { Button } from '~/components/ui/button/button';
import { Badge } from '~/components/ui/badge/badge';
import { ProductCard } from '~/components/product-card/product-card';
import { createSupabaseServerClient } from '~/lib/supabase.server';
import { redirectToLogin } from '~/lib/redirect.server';
import type { Route } from './+types/products.$handle';
import styles from './product-detail.module.css';

export function meta({ params }: Route.MetaArgs) {
  return [
    { title: `${params.handle} - Manaf Zone` },
    { name: 'description', content: `View product details for ${params.handle} on Manaf Zone` },
  ];
}

export async function loader({ request, params }: Route.LoaderArgs) {
  const { supabase } = createSupabaseServerClient(request);

  const {
    data: { session },
  } = await supabase.auth.getSession();

  const { data: product, error } = await supabase
    .from('products')
    .select(
      `
      id,
      name,
      slug,
      description,
      short_description,
      category_id,
      base_price,
      compare_at_price,
      is_featured,
      is_active,
      product_images(url, is_primary),
      categories(id, name, slug),
      inventory(available_quantity),
      reviews(id, rating, comment, created_at, user_id, profiles(full_name))
    `
    )
    .eq('slug', params.handle)
    .eq('is_active', true)
    .is('deleted_at', null)
    .single();

  if (error || !product) {
    throw new Response('Not Found', { status: 404 });
  }

  const { data: relatedProducts } = await supabase
    .from('products')
    .select(
      `
      id,
      name,
      slug,
      base_price,
      compare_at_price,
      product_images(url, is_primary),
      inventory(available_quantity)
    `
    )
    .eq('category_id', product.category_id)
    .eq('is_active', true)
    .is('deleted_at', null)
    .neq('id', product.id)
    .limit(4);

  const isLoggedIn = !!session?.user;

  return {
    product,
    relatedProducts: relatedProducts || [],
    isLoggedIn,
  };
}

export default function ProductDetail({ loaderData }: Route.ComponentProps) {
  const { product, relatedProducts, isLoggedIn } = loaderData as any;

  const fetcher = useFetcher();
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  const images = useMemo(() => {
    const imgs = product.product_images || [];
    const primaryIndex = imgs.findIndex((img: any) => img.is_primary);
    if (primaryIndex > 0) {
      const primary = imgs[primaryIndex];
      return [primary, ...imgs.slice(0, primaryIndex), ...imgs.slice(primaryIndex + 1)];
    }
    return imgs;
  }, [product.product_images]);

  const availableQuantity = product.inventory?.[0]?.available_quantity || 0;
  const inStock = availableQuantity > 0;

  const reviews = product.reviews || [];
  const ratingAverage =
    reviews.length > 0
      ? reviews.reduce((sum: number, r: any) => sum + (r.rating || 0), 0) / reviews.length
      : 0;

  const ratingCount = reviews.length;

  const handleAddToCart = () => {
    if (!isLoggedIn) {
      return redirectToLogin(`/products/${product.slug}`);
    }
    fetcher.submit(
      { product_id: product.id, quantity: '1' },
      { method: 'post', action: '/cart' }
    );
  };

  const handleAddToWishlist = () => {
    if (!isLoggedIn) {
      return redirectToLogin(`/products/${product.slug}`);
    }
    fetcher.submit(
      { product_id: product.id },
      { method: 'post', action: '/wishlist' }
    );
  };

  return (
    <div className={styles.page}>
      <Header />

      <main className={styles.main}>
        <div className={styles.container}>
          <div className={styles.breadcrumbs}>
            <Link to="/">Home</Link>
            <span>/</span>
            <Link to="/products">Products</Link>
            {product.categories?.slug && (
              <>
                <span>/</span>
                <Link to={`/products?category=${product.categories.slug}`}>{product.categories?.name}</Link>
              </>
            )}
            <span>/</span>
            <span>{product.name}</span>
          </div>

          <div className={styles.productGrid}>
            <div className={styles.gallery}>
              <div className={styles.mainImage}>
                {images?.[selectedImageIndex]?.url ? (
                  <img src={images[selectedImageIndex].url} alt={product.name} />
                ) : (
                  <div className={styles.imagePlaceholder} />
                )}
              </div>

              {images?.length > 1 && (
                <div className={styles.thumbnails}>
                  {images.map((img: any, idx: number) => (
                    <button
                      key={idx}
                      className={`${styles.thumbnail} ${idx === selectedImageIndex ? styles.thumbnailActive : ''}`}
                      onClick={() => setSelectedImageIndex(idx)}
                      aria-label={`View image ${idx + 1}`}
                    >
                      <img src={img.url} alt={`${product.name} thumbnail ${idx + 1}`} />
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className={styles.details}>
              <h1 className={styles.title}>{product.name}</h1>

              <div className={styles.ratingRow}>
                <div className={styles.stars}>
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} size={16} fill={i < Math.round(ratingAverage) ? 'currentColor' : 'none'} />
                  ))}
                </div>
                <span className={styles.ratingText}>
                  {ratingAverage.toFixed(1)} ({ratingCount})
                </span>
              </div>

              <div className={styles.priceRow}>
                <span className={styles.price}>৳{Number(product.base_price || 0).toFixed(2)}</span>
                {product.compare_at_price && Number(product.compare_at_price) > Number(product.base_price) && (
                  <span className={styles.compareAt}>৳{Number(product.compare_at_price).toFixed(2)}</span>
                )}
              </div>

              <div className={styles.stockRow}>
                {inStock ? (
                  <Badge variant="success">In Stock</Badge>
                ) : (
                  <Badge variant="destructive">Out of Stock</Badge>
                )}
                {inStock && <span className={styles.stockQty}>{availableQuantity} available</span>}
              </div>

              {product.short_description && (
                <p className={styles.shortDescription}>{product.short_description}</p>
              )}

              <div className={styles.actions}>
                <Button
                  size="lg"
                  className={styles.addToCartButton}
                  onClick={handleAddToCart}
                  disabled={!inStock || fetcher.state !== 'idle'}
                >
                  <ShoppingCart size={18} />
                  Add to Cart
                </Button>

                <Button
                  size="lg"
                  variant="outline"
                  className={styles.wishlistButton}
                  onClick={handleAddToWishlist}
                  disabled={fetcher.state !== 'idle'}
                >
                  <Heart size={18} />
                  Wishlist
                </Button>
              </div>

              <div className={styles.features}>
                <div className={styles.feature}>
                  <Truck size={18} />
                  <span>Fast delivery</span>
                </div>
                <div className={styles.feature}>
                  <Shield size={18} />
                  <span>Secure payment</span>
                </div>
                <div className={styles.feature}>
                  <RotateCcw size={18} />
                  <span>Easy returns</span>
                </div>
              </div>

              {product.description && (
                <div className={styles.description}>
                  <h2>Description</h2>
                  <p>{product.description}</p>
                </div>
              )}
            </div>
          </div>

          {relatedProducts?.length > 0 && (
            <section className={styles.related}>
              <h2>Related Products</h2>
              <div className={styles.relatedGrid}>
                {relatedProducts.map((p: any) => (
                  <ProductCard
                    key={p.id}
                    product={{
                      id: p.id,
                      name: p.name,
                      slug: p.slug,
                      price: Number(p.base_price) || 0,
                      compare_at_price: p.compare_at_price,
                      image_url:
                        p.product_images?.find((img: any) => img.is_primary)?.url ||
                        p.product_images?.[0]?.url ||
                        null,
                      rating_average: 0,
                      rating_count: 0,
                      in_stock: (p.inventory?.[0]?.available_quantity || 0) > 0,
                      is_featured: false,
                    }}
                  />
                ))}
              </div>
            </section>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
