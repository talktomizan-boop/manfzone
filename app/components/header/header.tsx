/**
 * Header Component
 * Main navigation header with search, cart, and user menu
 */

import { Link, NavLink, useFetcher, useNavigate } from 'react-router';
import { useEffect, useState } from 'react';
import { Search, ShoppingCart, User, Menu, Heart } from 'lucide-react';
import { Button } from '~/components/ui/button/button';
import { BrandLogo } from '~/components/brand-logo/brand-logo';
import styles from './header.module.css';
import classNames from 'classnames';

interface HeaderProps {
  cartItemCount?: number;
  isLoggedIn?: boolean;
  userRole?: string;
  className?: string;
}

export function Header({ cartItemCount, isLoggedIn, userRole, className }: HeaderProps) {
  const navigate = useNavigate();
  const logoutFetcher = useFetcher();
  const [resolvedIsLoggedIn, setResolvedIsLoggedIn] = useState<boolean>(!!isLoggedIn);
  const [resolvedRole, setResolvedRole] = useState<string | undefined>(userRole);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Resolve auth state via the server (cookie-based) when props aren't provided.
  useEffect(() => {
    if (typeof isLoggedIn === 'boolean') {
      setResolvedIsLoggedIn(isLoggedIn);
      setResolvedRole(userRole);
      return;
    }

    let cancelled = false;
    fetch('/api/session', { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled || !data) return;
        setResolvedIsLoggedIn(!!data.isLoggedIn);
        setResolvedRole(data.role || undefined);
      })
      .catch(() => {
        // Silent fail; header will fall back to logged-out UI.
      });

    return () => {
      cancelled = true;
    };
  }, [isLoggedIn, userRole]);

  const loggedIn = typeof isLoggedIn === 'boolean' ? isLoggedIn : resolvedIsLoggedIn;
  const role = userRole || resolvedRole;
  const count = cartItemCount ?? 0;

  // Customers should land on their profile page.
  // (Wishlist has its own dedicated icon.)
  const accountHref = role && ['admin', 'super_admin'].includes(role) ? '/admin/dashboard' : '/account';

  return (
    <header className={classNames(styles.header, className)}>
      <div className={styles.container}>
        {/* Logo */}
        <BrandLogo to="/" text="Manaf Zone" />

        {/* Main Navigation */}
        <nav className={styles.nav}>
          <NavLink to="/" end className={({ isActive }) => (isActive ? styles.navLinkActive : styles.navLink)}>
            Home
          </NavLink>
          <NavLink to="/products" className={({ isActive }) => (isActive ? styles.navLinkActive : styles.navLink)}>
            Products
          </NavLink>
          <NavLink to="/categories" className={({ isActive }) => (isActive ? styles.navLinkActive : styles.navLink)}>
            Categories
          </NavLink>
          <NavLink to="/new-arrivals" className={({ isActive }) => (isActive ? styles.navLinkActive : styles.navLink)}>
            New Arrivals
          </NavLink>
        </nav>

        {/* Search Bar */}
        <div className={styles.searchContainer}>
          <Search className={styles.searchIcon} size={18} />
          <input
            type="search"
            placeholder="Search products..."
            className={styles.searchInput}
            aria-label="Search products"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                const q = searchQuery.trim();
                navigate(q ? `/products?q=${encodeURIComponent(q)}` : '/products');
              }
            }}
          />
        </div>

        {/* Actions */}
        <div className={styles.actions}>
          {/* Wishlist */}
          {loggedIn && (
            <Link to="/wishlist" className={styles.iconButton} aria-label="Wishlist">
              <Heart size={20} />
            </Link>
          )}

          {/* Cart */}
          <Link to="/cart" className={styles.iconButton} aria-label="Shopping cart">
            <ShoppingCart size={20} />
            {count > 0 && <span className={styles.badge}>{count}</span>}
          </Link>

          {/* User Menu */}
          {loggedIn ? (
            <div className={styles.userMenu}>
              <Button asChild variant="ghost" size="sm" className={styles.userButton}>
                <Link to={accountHref} aria-label="Account">
                  <User size={18} />
                  <span>Account</span>
                </Link>
              </Button>
              <logoutFetcher.Form method="post" action="/logout">
                <Button
                  type="submit"
                  variant="ghost"
                  size="sm"
                  className={styles.userButton}
                  disabled={logoutFetcher.state === 'submitting'}
                >
                  Logout
                </Button>
              </logoutFetcher.Form>
            </div>
          ) : (
            <div className={styles.authButtons}>
              <Link to="/login">
                <Button variant="default" size="sm">
                  Login
                </Button>
              </Link>
            </div>
          )}

          {/* Admin Link */}
          {loggedIn && role && ['admin', 'super_admin'].includes(role) && (
            <Link to="/admin/dashboard">
              <Button variant="outline" size="sm">
                Admin
              </Button>
            </Link>
          )}
        </div>

        {/* Mobile Menu Button */}
        <button className={styles.mobileMenuButton} aria-label="Open menu">
          <Menu size={24} />
        </button>
      </div>
    </header>
  );
}
