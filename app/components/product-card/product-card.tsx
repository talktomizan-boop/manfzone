import { Link, useFetcher } from "react-router";
import { Heart, ShoppingCart, Star } from "lucide-react";
import styles from "./product-card.module.css";

export interface ProductCardProps {
  product: {
    id: string;
    name: string;
    slug: string;
    price: number;
    compare_at_price: number | null;
    image_url: string | null;
    rating_average: number;
    rating_count: number;
    in_stock: boolean;
    is_featured: boolean;
  };
  className?: string;
}

export function ProductCard({ product, className }: ProductCardProps) {
  const cartFetcher = useFetcher();
  const wishlistFetcher = useFetcher();

  const discount = product.compare_at_price
    ? Math.round(((product.compare_at_price - product.price) / product.compare_at_price) * 100)
    : 0;

  return (
    <div className={`${styles.card} ${className || ""}`}>
      <Link to={`/products/${product.slug}`} className={styles.imageWrapper}>
        <img src={product.image_url || '/placeholder.jpg'} alt={product.name} className={styles.image} />
        {discount > 0 && <span className={styles.badge}>-{discount}%</span>}
      </Link>

      <button
        className={styles.wishlistButton}
        aria-label="Add to wishlist"
        disabled={wishlistFetcher.state === 'submitting'}
        onClick={(e) => {
          e.preventDefault();
          const fd = new FormData();
          fd.set('intent', 'toggle');
          fd.set('product_id', product.id);
          wishlistFetcher.submit(fd, { method: 'post', action: '/wishlist' });
        }}
      >
        <Heart />
      </button>

      <div className={styles.content}>
        <Link to={`/products/${product.slug}`}>
          <h3 className={styles.title}>{product.name}</h3>
        </Link>

        {product.rating_average > 0 && (
          <div className={styles.rating}>
            <div className={styles.stars}>
              {[...Array(5)].map((_, i) => (
                <Star key={i} fill={i < product.rating_average ? "currentColor" : "none"} />
              ))}
            </div>
            <span className={styles.reviewCount}>({product.rating_count})</span>
          </div>
        )}
      </div>

      <div className={styles.footer}>
        <div className={styles.pricing}>
          <p className={styles.price}>৳{product.price.toFixed(2)}</p>
          {product.compare_at_price && <p className={styles.comparePrice}>৳{product.compare_at_price.toFixed(2)}</p>}
        </div>
        <button
          className={styles.addButton}
          disabled={!product.in_stock || cartFetcher.state === 'submitting'}
          onClick={(e) => {
            e.preventDefault();
            const fd = new FormData();
            fd.set('intent', 'add');
            fd.set('product_id', product.id);
            fd.set('quantity', '1');
            cartFetcher.submit(fd, { method: 'post', action: '/cart' });
          }}
        >
          <ShoppingCart />
          Add
        </button>
      </div>
    </div>
  );
}
