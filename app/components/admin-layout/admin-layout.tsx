import { Link, useLocation } from "react-router";
import { BrandLogo } from "~/components/brand-logo/brand-logo";
import {
  LayoutDashboard,
  Package,
  Tags,
  ShoppingCart,
  Undo2,
  Users,
  Settings,
  BarChart3,
  Bell,
} from "lucide-react";
import styles from "./admin-layout.module.css";

interface AdminLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
}

export function AdminLayout({ children, title, subtitle }: AdminLayoutProps) {
  const location = useLocation();
  
  const isActive = (path: string) => location.pathname === path || location.pathname.startsWith(path + '/');

  return (
    <div className={styles.page}>
      <div className={styles.layout}>
        <aside className={styles.sidebar}>
          <BrandLogo to="/" text="Manaf Zone Admin" className={styles.logo} />
          <nav>
            <ul className={styles.nav}>
              <li className={styles.navItem}>
                <Link 
                  to="/admin/dashboard" 
                  className={`${styles.navLink} ${isActive('/admin/dashboard') ? styles.active : ''}`}
                >
                  <LayoutDashboard />
                  Dashboard
                </Link>
              </li>
              <li className={styles.navItem}>
                <Link
                  to="/admin/insights"
                  className={`${styles.navLink} ${isActive('/admin/insights') ? styles.active : ''}`}
                >
                  <BarChart3 />
                  Insights
                </Link>
              </li>
              <li className={styles.navItem}>
                <Link
                  to="/admin/notifications"
                  className={`${styles.navLink} ${isActive('/admin/notifications') ? styles.active : ''}`}
                >
                  <Bell />
                  Notifications
                </Link>
              </li>
              <li className={styles.navItem}>
                <Link 
                  to="/admin/products" 
                  className={`${styles.navLink} ${isActive('/admin/products') ? styles.active : ''}`}
                >
                  <Package />
                  Products
                </Link>
              </li>
              <li className={styles.navItem}>
                <Link 
                  to="/admin/categories" 
                  className={`${styles.navLink} ${isActive('/admin/categories') ? styles.active : ''}`}
                >
                  <Tags />
                  Categories
                </Link>
              </li>
              <li className={styles.navItem}>
                <Link 
                  to="/admin/orders" 
                  className={`${styles.navLink} ${isActive('/admin/orders') ? styles.active : ''}`}
                >
                  <ShoppingCart />
                  Orders
                </Link>
              </li>
              <li className={styles.navItem}>
                <Link 
                  to="/admin/refunds" 
                  className={`${styles.navLink} ${isActive('/admin/refunds') ? styles.active : ''}`}
                >
                  <Undo2 />
                  Refunds
                </Link>
              </li>
              <li className={styles.navItem}>
                <Link 
                  to="/admin/customers" 
                  className={`${styles.navLink} ${isActive('/admin/customers') ? styles.active : ''}`}
                >
                  <Users />
                  Customers
                </Link>
              </li>
              <li className={styles.navItem}>
                <Link 
                  to="/admin/settings" 
                  className={`${styles.navLink} ${isActive('/admin/settings') ? styles.active : ''}`}
                >
                  <Settings />
                  Settings
                </Link>
              </li>
            </ul>
          </nav>
        </aside>

        <main className={styles.main}>
          <div className={styles.header}>
            <h2 className={styles.title}>{title}</h2>
            {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
          </div>
          
          <div className={styles.content}>
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
