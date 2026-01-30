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
import type { Route } from './+types/product-detail';
import styles from './product-detail.module.css';

export function meta({ params }: Route.MetaArgs) {
  return [
    { title: `${params.slug} - Manaf Zone` },
    { name: 'description', content: `View product details for ${params.slug} on Manaf Zone` },
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
      product_images(url, is_primary),
      inventory(available_quantity)
    `
    )
    .eq('slug', params.slug)
    .eq('is_active', true)
    .is('deleted_at', null)
    .single();

  if (error || !product) {
    throw new Response('Product Not Found', { status: 404 });
  }

  const image_url =
    (product as any).product_images?.find((img: any) => img.is_primary)?.url ||
    (product as any).product_images?.[0]?.url ||
    null;

  const in_stock = (((product as any).inventory?.[0]?.available_quantity || 0) as number) > 0;

  const mappedProduct = {
    id: product.id,
    name: product.name,
    slug: product.slug,
    shortDescription: product.short_description || undefined,
    description: product.description || undefined,
    price: Number(product.base_price) || 0,
    compare_at_price: product.compare_at_price,
    image_url,
    rating_average: 0,
    rating_count: 0,
    in_stock,
    is_featured: !!product.is_featured,
    _images: (product as any).product_images || [],
    _category_id: product.category_id,
  };

  // Reviews (approved only in public view)
  const { data: approvedReviews } = await supabase
    .from('reviews')
    .select('id, rating, title, comment, is_verified_purchase, created_at, profiles(full_name)')
    .eq('product_id', product.id)
    .eq('is_approved', true)
    .order('created_at', { ascending: false })
    .limit(20);

  const reviewCount = (approvedReviews || []).length;
  const avgRating = reviewCount
    ? (approvedReviews || []).reduce((sum: number, r: any) => sum + Number(r.rating || 0), 0) / reviewCount
    : 0;

  mappedProduct.rating_average = Math.round(avgRating * 10) / 10;
  mappedProduct.rating_count = reviewCount;

  // Determine whether the current user is eligible to submit a review.
  let canSubmitReview = false;
  let alreadyReviewed = false;
  let verifiedOrderId: string | null = null;

  if (session?.user?.id) {
    const { data: existing } = await supabase
      .from('reviews')
      .select('id')
      .eq('product_id', product.id)
      .eq('user_id', session.user.id)
      .limit(1);

    alreadyReviewed = !!(existing && existing.length > 0);

    if (!alreadyReviewed) {
      const { data: orderHit } = await supabase
        .from('order_items')
        .select('order_id, orders!inner(user_id, status)')
        .eq('product_id', product.id)
        .eq('orders.user_id', session.user.id)
        .neq('orders.status', 'cancelled')
        .order('created_at', { ascending: false })
        .limit(1);

      verifiedOrderId = (orderHit && orderHit[0] ? (orderHit[0] as any).order_id : null) as any;
      canSubmitReview = !!verifiedOrderId;
    }
  }

  // Related products: same category when possible
  let related: any[] = [];
  if (product.category_id) {
    const { data: relatedProducts } = await supabase
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
      .eq('category_id', product.category_id)
      .neq('id', product.id)
      .limit(4);

    related = (relatedProducts || []).map((p: any) => ({
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
  }

  return {
    product: mappedProduct,
    relatedProducts: related,
    reviews: approvedReviews || [],
    reviewEligibility: {
      isLoggedIn: !!session,
      canSubmit: canSubmitReview,
      alreadyReviewed,
      verifiedOrderId,
    },
  };
}

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  const intent = (formData.get('intent') || '').toString();

  if (intent !== 'submit_review') {
    return { ok: false, error: 'Unknown action' };
  }

  const product_id = (formData.get('product_id') || '').toString();
  const rating = parseInt((formData.get('rating') || '').toString(), 10);
  const title = (formData.get('title') || '').toString().trim();
  const comment = (formData.get('comment') || '').toString().trim();

  if (!product_id) return { ok: false, error: 'Missing product.' };
  if (!Number.isFinite(rating) || rating < 1 || rating > 5) return { ok: false, error: 'Rating must be 1–5.' };
  if (!comment) return { ok: false, error: 'Please write a short review.' };

  const { supabase, headers } = createSupabaseServerClient(request);
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) return redirectToLogin(request, headers);

  // Ensure the user purchased this product.
  const { data: orderHit } = await supabase
    .from('order_items')
    .select('order_id, orders!inner(user_id, status)')
    .eq('product_id', product_id)
    .eq('orders.user_id', session.user.id)
    .neq('orders.status', 'cancelled')
    .order('created_at', { ascending: false })
    .limit(1);

  const verifiedOrderId = (orderHit && orderHit[0] ? (orderHit[0] as any).order_id : null) as string | null;
  if (!verifiedOrderId) return { ok: false, error: 'Only verified buyers can submit reviews.' };

  // Prevent duplicates (unique constraint is per order_id; we enforce per product/user in app).
  const { data: existing } = await supabase
    .from('reviews')
    .select('id')
    .eq('product_id', product_id)
    .eq('user_id', session.user.id)
    .limit(1);

  if (existing && existing.length > 0) return { ok: false, error: 'You already submitted a review for this product.' };

  const { error } = await supabase.from('reviews').insert({
    product_id,
    user_id: session.user.id,
    order_id: verifiedOrderId,
    rating,
    title: title || null,
    comment,
    is_verified_purchase: true,
    is_approved: false,
  });

  if (error) {
    return { ok: false, error: error.message || 'Failed to submit review.' };
  }

  return { ok: true };
}

export default function ProductDetail({ loaderData }: Route.ComponentProps) {
  const { product, relatedProducts, reviews, reviewEligibility } = loaderData as any;
  const [quantity, setQuantity] = useState(1);
  const [selectedImage, setSelectedImage] = useState(0);
  const cartFetcher = useFetcher();
  const wishlistFetcher = useFetcher();
  const reviewFetcher = useFetcher();
  const [reviewRating, setReviewRating] = useState<number>(5);
  const [reviewTitle, setReviewTitle] = useState<string>('');
  const [reviewComment, setReviewComment] = useState<string>('');

  const discount = product.compare_at_price
    ? Math.round(((product.compare_at_price - product.price) / product.compare_at_price) * 100)
    : 0;

  const images = useMemo(() => {
    const fromDb = (product as any)._images as Array<{ url: string }>;
    const urls = (fromDb || []).map((i) => i.url).filter(Boolean);
    if (urls.length > 0) return urls;
    return [product.image_url || '/placeholder.jpg'];
  }, [product]);

  return (
    <div className={styles.page}>
      <Header />

      <main className={styles.main}>
        <div className={styles.container}>
          {/* Breadcrumb */}
          <nav className={styles.breadcrumb}>
            <Link to="/">Home</Link>
            <span>/</span>
            <Link to="/products">Products</Link>
            <span>/</span>
            <span>{product.name}</span>
          </nav>

          {/* Product Details */}
          <div className={styles.productLayout}>
            {/* Images */}
            <div className={styles.imageSection}>
              <div className={styles.mainImage}>
                <img src={images[selectedImage]} alt={product.name} />
                {discount > 0 && <Badge className={styles.discountBadge}>-{discount}%</Badge>}
              </div>
              <div className={styles.thumbnails}>
                {images.map((img, idx) => (
                  <button
                    key={idx}
                    className={`${styles.thumbnail} ${selectedImage === idx ? styles.thumbnailActive : ''}`}
                    onClick={() => setSelectedImage(idx)}
                  >
                    <img src={img} alt={`${product.name} ${idx + 1}`} />
                  </button>
                ))}
              </div>
            </div>

            {/* Details */}
            <div className={styles.detailsSection}>
              <h1 className={styles.productName}>{product.name}</h1>

              {/* Rating */}
              <div className={styles.rating}>
                <div className={styles.stars}>
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} size={18} fill={i < product.rating_average ? 'currentColor' : 'none'} />
                  ))}
                </div>
                <span className={styles.ratingText}>
                  {product.rating_average} ({product.rating_count} reviews)
                </span>
              </div>

              {/* Price */}
              <div className={styles.pricing}>
                <p className={styles.price}>৳{product.price.toFixed(2)}</p>
                {product.compare_at_price && (
                  <p className={styles.comparePrice}>৳{product.compare_at_price.toFixed(2)}</p>
                )}
              </div>

              {/* Stock Status */}
              <div className={styles.stock}>
                {product.in_stock ? (
                  <Badge>In Stock</Badge>
                ) : (
                  <Badge variant="destructive">Out of Stock</Badge>
                )}
              </div>

              {/* Description */}
              <div className={styles.description}>
                <p>{product.shortDescription || 'High-quality product with excellent features and durability. Perfect for your needs.'}</p>
              </div>

              {/* Quantity */}
              <div className={styles.quantitySection}>
                <label className={styles.quantityLabel}>Quantity:</label>
                <div className={styles.quantityControl}>
                  <button
                    className={styles.quantityButton}
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    disabled={!product.in_stock}
                  >
                    -
                  </button>
                  <span className={styles.quantityValue}>{quantity}</span>
                  <button
                    className={styles.quantityButton}
                    onClick={() => setQuantity((q) => q + 1)}
                    disabled={!product.in_stock}
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Actions */}
              <div className={styles.actions}>
                <Button
                  size="lg"
                  className={styles.addToCartButton}
                  disabled={!product.in_stock || cartFetcher.state === 'submitting'}
                  onClick={() => {
                    const fd = new FormData();
                    fd.set('intent', 'add');
                    fd.set('product_id', product.id);
                    fd.set('quantity', String(quantity));
                    cartFetcher.submit(fd, { method: 'post', action: '/cart' });
                  }}
                >
                  <ShoppingCart size={20} />
                  Add to Cart
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className={styles.wishlistButton}
                  disabled={wishlistFetcher.state === 'submitting'}
                  onClick={() => {
                    const fd = new FormData();
                    fd.set('intent', 'toggle');
                    fd.set('product_id', product.id);
                    wishlistFetcher.submit(fd, { method: 'post', action: '/wishlist' });
                  }}
                >
                  <Heart size={20} />
                  Wishlist
                </Button>
              </div>

              {/* Features */}
              <div className={styles.features}>
                <div className={styles.feature}>
                  <Truck size={20} />
                  <span>Free shipping on orders over ৳2,000</span>
                </div>
                <div className={styles.feature}>
                  <Shield size={20} />
                  <span>Secure payment & data protection</span>
                </div>
                <div className={styles.feature}>
                  <RotateCcw size={20} />
                  <span>7-day easy return policy</span>
                </div>
              </div>
            </div>
          </div>

          {/* Reviews */}
          <div className={styles.reviewSection} id="reviews">
            <div className={styles.reviewHeader}>
              <h2 className={styles.reviewTitle}>Customer Reviews</h2>
              <p className={styles.reviewSubtitle}>Real feedback from verified buyers. New reviews require admin approval before they appear.</p>
            </div>

            <div className={styles.reviewGrid}>
              <div className={styles.reviewSummary}>
                <div className={styles.reviewAvg}>{Number(product.rating_average || 0).toFixed(1)}</div>
                <div>
                  <div className={styles.starsBig} aria-label={`Average rating ${product.rating_average} out of 5`}>
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} size={18} fill={i < Math.round(product.rating_average) ? 'currentColor' : 'none'} />
                    ))}
                  </div>
                  <div className={styles.reviewCount}>{product.rating_count} review{product.rating_count === 1 ? '' : 's'}</div>
                </div>
              </div>

              <div className={styles.reviewFormCard}>
                {!reviewEligibility?.isLoggedIn ? (
                  <div className={styles.reviewCallout}>
                    <p className={styles.reviewCalloutText}>Please log in to submit a review.</p>
                    <Link className={styles.reviewLink} to={`/login?redirectTo=${encodeURIComponent(`/product/${product.slug}#reviews`)}`}>Login</Link>
                  </div>
                ) : reviewEligibility?.alreadyReviewed ? (
                  <div className={styles.reviewCallout}>
                    <p className={styles.reviewCalloutText}>Thanks! You already submitted a review for this product.</p>
                  </div>
                ) : !reviewEligibility?.canSubmit ? (
                  <div className={styles.reviewCallout}>
                    <p className={styles.reviewCalloutText}>Only verified buyers can submit reviews.</p>
                  </div>
                ) : (
                  <reviewFetcher.Form method="post" className={styles.reviewForm}>
                    <input type="hidden" name="intent" value="submit_review" />
                    <input type="hidden" name="product_id" value={product.id} />

                    <div className={styles.reviewFormRow}>
                      <label className={styles.reviewLabel}>Your rating</label>
                      <div className={styles.starPicker}>
                        {[1, 2, 3, 4, 5].map((v) => (
                          <button
                            key={v}
                            type="button"
                            className={`${styles.starButton} ${reviewRating >= v ? styles.starOn : ''}`}
                            onClick={() => setReviewRating(v)}
                            aria-label={`${v} star${v === 1 ? '' : 's'}`}
                          >
                            <Star size={18} />
                          </button>
                        ))}
                      </div>
                      <input type="hidden" name="rating" value={String(reviewRating)} />
                    </div>

                    <div className={styles.reviewFormRow}>
                      <label className={styles.reviewLabel} htmlFor="review-title">Title (optional)</label>
                      <input
                        id="review-title"
                        name="title"
                        value={reviewTitle}
                        onChange={(e) => setReviewTitle(e.target.value)}
                        className={styles.reviewInput}
                        placeholder="Great quality, fast delivery"
                      />
                    </div>

                    <div className={styles.reviewFormRow}>
                      <label className={styles.reviewLabel} htmlFor="review-comment">Review</label>
                      <textarea
                        id="review-comment"
                        name="comment"
                        value={reviewComment}
                        onChange={(e) => setReviewComment(e.target.value)}
                        className={styles.reviewTextarea}
                        rows={4}
                        placeholder="Share your experience..."
                        required
                      />
                    </div>

                    {reviewFetcher.data && (reviewFetcher.data as any).error && (
                      <div className={styles.reviewError}>{(reviewFetcher.data as any).error}</div>
                    )}
                    {reviewFetcher.data && (reviewFetcher.data as any).ok && (
                      <div className={styles.reviewSuccess}>Submitted! Your review will appear after approval.</div>
                    )}

                    <Button type="submit" disabled={reviewFetcher.state === 'submitting'}>
                      {reviewFetcher.state === 'submitting' ? 'Submitting...' : 'Submit Review'}
                    </Button>
                  </reviewFetcher.Form>
                )}
              </div>
            </div>

            <div className={styles.reviewList}>
              {(!reviews || reviews.length === 0) ? (
                <div className={styles.reviewEmpty}>No reviews yet. Be the first to review this product after purchase.</div>
              ) : (
                <div className={styles.reviewCards}>
                  {reviews.map((r: any) => (
                    <div key={r.id} className={styles.reviewCard}>
                      <div className={styles.reviewCardHeader}>
                        <div>
                          <div className={styles.reviewStars}>
                            {[...Array(5)].map((_, i) => (
                              <Star key={i} size={16} fill={i < Number(r.rating) ? 'currentColor' : 'none'} />
                            ))}
                          </div>
                          <div className={styles.reviewAuthor}>
                            {(r as any).profiles?.full_name || 'Customer'}
                            {r.is_verified_purchase ? <span className={styles.verifiedPill}>Verified</span> : null}
                          </div>
                        </div>
                        <div className={styles.reviewDate}>{new Date(r.created_at).toLocaleDateString('en-US', { timeZone: 'Asia/Dhaka' })}</div>
                      </div>
                      {r.title ? <div className={styles.reviewCardTitle}>{r.title}</div> : null}
                      {r.comment ? <div className={styles.reviewCardBody}>{r.comment}</div> : null}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Related Products */}
          {relatedProducts.length > 0 && (
            <div className={styles.relatedSection}>
              <h2 className={styles.relatedTitle}>You May Also Like</h2>
              <div className={styles.relatedGrid}>
                {relatedProducts.map((p: any) => (
                  <ProductCard key={p.id} product={p} />
                ))}
              </div>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
