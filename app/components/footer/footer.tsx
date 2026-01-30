/**
 * Footer Component
 * Site-wide footer with links and information
 */

import { Link } from 'react-router';
import { Facebook, Twitter, Instagram, Youtube, Mail, Phone, MapPin } from 'lucide-react';
import styles from './footer.module.css';
import classNames from 'classnames';

interface FooterProps {
  className?: string;
}

export function Footer({ className }: FooterProps) {
  const currentYear = new Date().getFullYear();

  return (
    <footer className={classNames(styles.footer, className)}>
      <div className={styles.container}>
        {/* Top Section */}
        <div className={styles.topSection}>
          {/* About */}
          <div className={styles.column}>
            <h3 className={styles.columnTitle}>Manaf Zone</h3>
            <p className={styles.description}>
              Your trusted online marketplace for quality products at great prices. We deliver across Bangladesh with
              fast and reliable service.
            </p>
            <div className={styles.social}>
              <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" className={styles.socialLink}>
                <Facebook size={20} />
              </a>
              <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" className={styles.socialLink}>
                <Twitter size={20} />
              </a>
              <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" className={styles.socialLink}>
                <Instagram size={20} />
              </a>
              <a href="https://youtube.com" target="_blank" rel="noopener noreferrer" className={styles.socialLink}>
                <Youtube size={20} />
              </a>
            </div>
          </div>

          {/* Shop */}
          <div className={styles.column}>
            <h3 className={styles.columnTitle}>Shop</h3>
            <nav className={styles.linkList}>
              <Link to="/products" className={styles.link}>
                All Products
              </Link>
              <Link to="/categories" className={styles.link}>
                Categories
              </Link>
              <Link to="/deals" className={styles.link}>
                Special Deals
              </Link>
              <Link to="/new-arrivals" className={styles.link}>
                New Arrivals
              </Link>
            </nav>
          </div>

          {/* Customer Service */}
          <div className={styles.column}>
            <h3 className={styles.columnTitle}>Customer Service</h3>
            <nav className={styles.linkList}>
              <Link to="/shipping" className={styles.link}>
                Shipping Policy
              </Link>
              <Link to="/returns" className={styles.link}>
                Return & Refund
              </Link>
              <Link to="/faq" className={styles.link}>
                FAQ
              </Link>
              <Link to="/track-order" className={styles.link}>
                Track Order
              </Link>
            </nav>
          </div>

          {/* Information */}
          <div className={styles.column}>
            <h3 className={styles.columnTitle}>Information</h3>
            <nav className={styles.linkList}>
              <Link to="/about" className={styles.link}>
                About Us
              </Link>
              <Link to="/privacy" className={styles.link}>
                Privacy Policy
              </Link>
              <Link to="/terms" className={styles.link}>
                Terms & Conditions
              </Link>
              <Link to="/careers" className={styles.link}>
                Careers
              </Link>
            </nav>
          </div>

          {/* Contact */}
          <div className={styles.column}>
            <h3 className={styles.columnTitle}>Contact</h3>
            <div className={styles.contactInfo}>
              <div className={styles.contactItem}>
                <MapPin size={18} />
                <span>Dhaka, Bangladesh</span>
              </div>
              <div className={styles.contactItem}>
                <Phone size={18} />
                <a href="tel:+8801700000000" className={styles.contactLink}>
                  +880 1700-000000
                </a>
              </div>
              <div className={styles.contactItem}>
                <Mail size={18} />
                <a href="mailto:support@shopname.com" className={styles.contactLink}>
                  support@shopname.com
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Section */}
        <div className={styles.bottomSection}>
          <p className={styles.copyright}>© {currentYear} Manaf Zone. All rights reserved.</p>
          <div className={styles.paymentMethods}>
            <span className={styles.paymentText}>We accept:</span>
            <span className={styles.paymentIcons}>Cash on Delivery, bKash, Nagad, Visa, Mastercard</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
