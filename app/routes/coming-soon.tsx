import { Link } from 'react-router';
import { Header } from '~/components/header/header';
import { Footer } from '~/components/footer/footer';
import { Button } from '~/components/ui/button/button';
import { ArrowLeft, Construction } from 'lucide-react';
// import type { Route } from './+types/coming-soon';
import styles from './coming-soon.module.css';

export function meta() {
  return [
    { title: 'Coming Soon - Manaf Zone' },
    { name: 'description', content: 'This page is under construction' },
  ];
}

export default function ComingSoon() {
  return (
    <div className={styles.page}>
      <Header />

      <main className={styles.main}>
        <div className={styles.container}>
          <div className={styles.content}>
            <Construction size={64} className={styles.icon} />
            <h1 className={styles.title}>Coming Soon</h1>
            <p className={styles.description}>
              This page is currently under construction. We're working hard to bring you this feature soon!
            </p>
            <div className={styles.actions}>
              <Link to="/">
                <Button size="lg">
                  <ArrowLeft size={18} />
                  Back to Home
                </Button>
              </Link>
              <Link to="/products">
                <Button variant="outline" size="lg">
                  Browse Products
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
