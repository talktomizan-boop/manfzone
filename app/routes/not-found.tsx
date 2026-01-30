import { Link } from 'react-router';
import { Button } from '~/components/ui/button/button';
import { Home, ArrowLeft } from 'lucide-react';
import type { Route } from './+types/not-found';
import styles from './not-found.module.css';

export function meta({}: Route.MetaArgs) {
  return [
    { title: '404 - Page Not Found' },
    {
      name: 'description',
      content: 'The page you are looking for could not be found.',
    },
  ];
}

export default function NotFound() {
  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <div className={styles.content}>
          <h1 className={styles.code}>404</h1>
          <h2 className={styles.title}>Page Not Found</h2>
          <p className={styles.description}>
            The page you are looking for doesn't exist or has been moved.
          </p>
          <div className={styles.actions}>
            <Link to="/">
              <Button size="lg">
                <Home size={18} />
                Go Home
              </Button>
            </Link>
            <Button variant="outline" size="lg" onClick={() => window.history.back()}>
              <ArrowLeft size={18} />
              Go Back
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
