import type { Route } from "./+types/products";
import { Header } from "~/components/header/header";
import { Footer } from "~/components/footer/footer";
import { ProductCard } from "~/components/product-card/product-card";
import { Checkbox } from "~/components/ui/checkbox/checkbox";
import { Label } from "~/components/ui/label/label";
import { createSupabaseServerClient } from "~/lib/supabase.server";
import { useNavigate, useSearchParams } from "react-router";
import styles from "./products.module.css";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "All Products - Manaf Zone" },
    {
      name: "description",
      content: "Browse our complete collection of quality products across all categories.",
    },
  ];
}

export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const categorySlug = url.searchParams.get('category') || '';
  const sort = url.searchParams.get('sort') || 'featured';
  const q = (url.searchParams.get('q') || '').toString();
  const pricePreset = (url.searchParams.get('price') || '').toString();
  const ratingPreset = (url.searchParams.get('rating') || '').toString();
  const inStock = (url.searchParams.get('stock') || '').toString();

  let minPrice: number | null = null;
  let maxPrice: number | null = null;
  if (pricePreset === 'under-25') {
    maxPrice = 25;
  } else if (pricePreset === '25-50') {
    minPrice = 25;
    maxPrice = 50;
  } else if (pricePreset === '50-100') {
    minPrice = 50;
    maxPrice = 100;
  } else if (pricePreset === 'over-100') {
    minPrice = 100;
  }

  let minRating: number | null = null;
  if (ratingPreset === '4') minRating = 4;
  if (ratingPreset === '3') minRating = 3;

  const { supabase } = createSupabaseServerClient(request);

  // Load categories for the sidebar
  const { data: categories } = await supabase
    .from('categories')
    .select('id, name, slug')
    .eq('is_active', true)
    .is('deleted_at', null)
    .order('display_order', { ascending: true });

  let categoryId: string | null = null;
  if (categorySlug && categories && categories.length > 0) {
    const match = categories.find((c: any) => c.slug === categorySlug);
    categoryId = match?.id || null;
  }

  // Prefer the RPC for real search/sort/filter logic (including ratings + stock)
  const { data: rpcProducts, error: rpcError } = await supabase.rpc('search_products', {
    q: q || null,
    category_slug: categorySlug || null,
    min_price: minPrice,
    max_price: maxPrice,
    in_stock: inStock === '1' ? true : inStock === '0' ? false : null,
    min_rating: minRating,
    sort_key: sort,
    limit_count: 60,
    offset_count: 0,
  });

  if (rpcError) {
    console.error('Products search RPC error:', rpcError);
  }

  const cardProducts = (rpcProducts || []).map((p: any) => ({
    id: p.id,
    name: p.name,
    slug: p.slug,
    price: Number(p.base_price) || 0,
    compare_at_price: p.compare_at_price,
    image_url: p.image_url || null,
    rating_average: Number(p.rating_average) || 0,
    rating_count: Number(p.rating_count) || 0,
    in_stock: !!p.in_stock,
    is_featured: !!p.is_featured,
  }));

  return {
    products: cardProducts,
    categories: categories || [],
    selected: {
      category: categorySlug,
      sort,
      q,
      price: pricePreset,
      rating: ratingPreset,
      stock: inStock,
    },
  };
}

export default function Products({ loaderData }: Route.ComponentProps) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { products, categories, selected } = loaderData;

  const setParam = (key: string, value: string | null) => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value);
    else next.delete(key);
    navigate(`/products${next.toString() ? `?${next.toString()}` : ''}`);
  };

  return (
    <div className={styles.page}>
      <Header />

      <div className={styles.container}>
        <div className={styles.header}>
          <h1 className={styles.title}>All Products</h1>
          <p className={styles.subtitle}>Discover our complete collection</p>
        </div>

        <div className={styles.layout}>
          <aside className={styles.sidebar}>
            <div className={styles.filterSection}>
              <h3 className={styles.filterTitle}>Categories</h3>
              <ul className={styles.filterList}>
                {(categories || []).map((cat: any) => {
                  const id = `cat-${cat.slug}`;
                  const checked = selected?.category === cat.slug;
                  return (
                    <li key={cat.id} className={styles.filterItem}>
                      <Checkbox
                        id={id}
                        checked={checked}
                        onCheckedChange={(v) => setParam('category', v ? cat.slug : null)}
                      />
                      <Label htmlFor={id}>{cat.name}</Label>
                    </li>
                  );
                })}
              </ul>
            </div>

            <div className={styles.filterSection}>
              <h3 className={styles.filterTitle}>Price Range</h3>
              <ul className={styles.filterList}>
                <li className={styles.filterItem}>
                  <Checkbox
                    id="price-1"
                    checked={selected?.price === 'under-25'}
                    onCheckedChange={(v) => setParam('price', v ? 'under-25' : null)}
                  />
                  <Label htmlFor="price-1">Under $25</Label>
                </li>
                <li className={styles.filterItem}>
                  <Checkbox
                    id="price-2"
                    checked={selected?.price === '25-50'}
                    onCheckedChange={(v) => setParam('price', v ? '25-50' : null)}
                  />
                  <Label htmlFor="price-2">$25 - $50</Label>
                </li>
                <li className={styles.filterItem}>
                  <Checkbox
                    id="price-3"
                    checked={selected?.price === '50-100'}
                    onCheckedChange={(v) => setParam('price', v ? '50-100' : null)}
                  />
                  <Label htmlFor="price-3">$50 - $100</Label>
                </li>
                <li className={styles.filterItem}>
                  <Checkbox
                    id="price-4"
                    checked={selected?.price === 'over-100'}
                    onCheckedChange={(v) => setParam('price', v ? 'over-100' : null)}
                  />
                  <Label htmlFor="price-4">Over $100</Label>
                </li>
              </ul>
            </div>

            <div className={styles.filterSection}>
              <h3 className={styles.filterTitle}>Rating</h3>
              <ul className={styles.filterList}>
                <li className={styles.filterItem}>
                  <Checkbox
                    id="rating-4"
                    checked={selected?.rating === '4'}
                    onCheckedChange={(v) => setParam('rating', v ? '4' : null)}
                  />
                  <Label htmlFor="rating-4">4★ & above</Label>
                </li>
                <li className={styles.filterItem}>
                  <Checkbox
                    id="rating-3"
                    checked={selected?.rating === '3'}
                    onCheckedChange={(v) => setParam('rating', v ? '3' : null)}
                  />
                  <Label htmlFor="rating-3">3★ & above</Label>
                </li>
              </ul>
            </div>

            <div className={styles.filterSection}>
              <h3 className={styles.filterTitle}>Availability</h3>
              <ul className={styles.filterList}>
                <li className={styles.filterItem}>
                  <Checkbox
                    id="stock-1"
                    checked={selected?.stock === '1'}
                    onCheckedChange={(v) => setParam('stock', v ? '1' : null)}
                  />
                  <Label htmlFor="stock-1">In stock</Label>
                </li>
              </ul>
            </div>
          </aside>

          <main className={styles.main}>
            <div className={styles.toolbar}>
              <span className={styles.resultCount}>{(products || []).length} products found</span>
              <div className={styles.searchBox}>
                <input
                  className={styles.searchInput}
                  type="search"
                  placeholder="Search products"
                  value={selected?.q || ''}
                  onChange={(e) => setParam('q', e.target.value || null)}
                  aria-label="Search products"
                />
              </div>
              <select
                className={styles.sortSelect}
                value={selected?.sort || 'featured'}
                onChange={(e) => setParam('sort', e.target.value)}
              >
                <option value="featured">Featured</option>
                <option value="price-low">Price: Low to High</option>
                <option value="price-high">Price: High to Low</option>
                <option value="newest">Newest</option>
                <option value="popularity">Most Popular</option>
                <option value="rating">Top Rated</option>
              </select>
            </div>

            <div className={styles.grid}>
              {(products || []).map((product: any) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </main>
        </div>
      </div>

      <Footer />
    </div>
  );
}
