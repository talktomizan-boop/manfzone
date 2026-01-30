/**
 * About Page
 * Company information and mission
 */

import { Header } from '~/components/header/header';
import { Footer } from '~/components/footer/footer';
import type { Route } from './+types/about';
import styles from './login.module.css';
import { Store, Users, Award, Heart } from 'lucide-react';

export function meta() {
  return [
    { title: 'About Us - Manaf Zone' },
    { name: 'description', content: 'Learn more about Manaf Zone and our mission' },
  ];
}

export default function About({}: Route.ComponentProps) {
  return (
    <div className={styles.page}>
      <Header />

      <main className={styles.main}>
        <div className={styles.container}>
          <div className={styles.aboutLayout}>
            {/* Hero Section */}
            <div className={styles.aboutHeader}>
              <h1 className={styles.title}>About Manaf Zone</h1>
              <p className={styles.subtitle}>
                Your trusted destination for quality products and exceptional service
              </p>
            </div>

            {/* Mission Statement */}
            <div className={styles.missionSection}>
              <h2>Our Mission</h2>
              <p>
                At Manaf Zone, we're committed to providing our customers with an exceptional online shopping experience. 
                We curate a diverse selection of high-quality products, from the latest electronics to fashion essentials, 
                all at competitive prices.
              </p>
              <p>
                Founded with the vision of making online shopping accessible, reliable, and enjoyable for everyone, 
                we've grown into a trusted marketplace serving thousands of satisfied customers across Bangladesh.
              </p>
            </div>

            {/* Values Grid */}
            <div className={styles.valuesGrid}>
              <div className={styles.valueCard}>
                <div className={styles.valueIcon}>
                  <Store size={32} />
                </div>
                <h3>Quality Products</h3>
                <p>We carefully select and verify every product to ensure you receive only the best quality items.</p>
              </div>

              <div className={styles.valueCard}>
                <div className={styles.valueIcon}>
                  <Users size={32} />
                </div>
                <h3>Customer First</h3>
                <p>Your satisfaction is our priority. We provide dedicated support and hassle-free returns.</p>
              </div>

              <div className={styles.valueCard}>
                <div className={styles.valueIcon}>
                  <Award size={32} />
                </div>
                <h3>Trust & Security</h3>
                <p>Shop with confidence knowing your data and payments are protected with industry-leading security.</p>
              </div>

              <div className={styles.valueCard}>
                <div className={styles.valueIcon}>
                  <Heart size={32} />
                </div>
                <h3>Community</h3>
                <p>We're building more than a marketplace – we're creating a community of happy shoppers.</p>
              </div>
            </div>

            {/* Stats */}
            <div className={styles.statsSection}>
              <div className={styles.statCard}>
                <h3>10,000+</h3>
                <p>Happy Customers</p>
              </div>
              <div className={styles.statCard}>
                <h3>5,000+</h3>
                <p>Products</p>
              </div>
              <div className={styles.statCard}>
                <h3>50+</h3>
                <p>Brands</p>
              </div>
              <div className={styles.statCard}>
                <h3>99%</h3>
                <p>Satisfaction Rate</p>
              </div>
            </div>

            {/* Contact CTA */}
            <div className={styles.contactCTA}>
              <h2>Get in Touch</h2>
              <p>Have questions or feedback? We'd love to hear from you!</p>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
