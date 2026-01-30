import { Link } from 'react-router';
import { Header } from '~/components/header/header';
import { Footer } from '~/components/footer/footer';
import type { Route } from './+types/categories';
import { createSupabaseServerClient } from '~/lib/supabase.server';
import styles from './categories.module.css';

export function meta({}: Route.MetaArgs) {
  return [
    { title: 'Categories - Manaf Zone' },
    { name: 'description', content: 'Browse products by category' },
  ];
}

export async function loader({ request }: Route.LoaderArgs) {
  const { supabase } = createSupabaseServerClient(request);

  const { data, error } = await supabase
    .from('categories')
    .select('id, name, slug, image_url')
    .eq('is_active', true)
    .is('deleted_at', null)
    .order('display_order', { ascending: true });

  if (error) {
    console.error('Categories loader error:', error);
  }

  return { categories: data || [] };
}

export default function Categories({ loaderData }: Route.ComponentProps) {
  const { categories } = loaderData as any;
  return (
    <div className={styles.page}>
      <Header />

      <main className={styles.main}>
        <div className={styles.container}>
          <div className={styles.header}>
            <h1 className={styles.title}>Shop by Category</h1>
            <p className={styles.subtitle}>Find exactly what you're looking for</p>
          </div>

          <div className={styles.grid}>
            {categories.map((category: any) => (
              <Link key={category.id} to={`/products?category=${category.slug}`} className={styles.card}>
                <div className={styles.imageWrapper}>
                  <img
                    src={category.image_url || 'https://images.unsplash.com/photo-1498049794561-7780e7231661?w=400'}
                    alt={category.name}
                    className={styles.image}
                  />
                </div>
                <h3 className={styles.categoryName}>{category.name}</h3>
              </Link>
            ))}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
