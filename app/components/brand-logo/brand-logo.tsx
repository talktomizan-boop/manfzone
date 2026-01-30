import { Link } from 'react-router';
import classNames from 'classnames';
import styles from './brand-logo.module.css';

type BrandLogoProps = {
  to?: string;
  text?: string;
  variant?: 'default' | 'compact';
  className?: string;
};

/**
 * BrandLogo
 * - Uses the provided brand mark image for consistent branding across the site.
 */
export function BrandLogo({ to = '/', text = 'Manaf Zone', variant = 'default', className }: BrandLogoProps) {
  return (
    <Link
      to={to}
      className={classNames(styles.logo, variant === 'compact' && styles.compact, className)}
      aria-label={text}
    >
      <span className={styles.iconWrap} aria-hidden="true">
        <img className={styles.iconImg} src="/brand/logo-mark-128.png" alt="" />
      </span>
      <span className={styles.text}>{text}</span>
    </Link>
  );
}
