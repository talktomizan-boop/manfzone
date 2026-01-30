/**
 * Shipping Information Page
 */

import { Header } from '~/components/header/header';
import { Footer } from '~/components/footer/footer';
import type { Route } from './+types/shipping';
import styles from './login.module.css';
import { Truck, MapPin, Clock, DollarSign } from 'lucide-react';

export function meta() {
  return [
    { title: 'Shipping Information - Manaf Zone' },
    { name: 'description', content: 'Learn about our shipping options and delivery times' },
  ];
}

export default function Shipping({}: Route.ComponentProps) {
  return (
    <div className={styles.page}>
      <Header />

      <main className={styles.main}>
        <div className={styles.container}>
          <div className={styles.shippingLayout}>
            <div className={styles.shippingHeader}>
              <h1 className={styles.title}>
                <Truck size={32} />
                Shipping Information
              </h1>
              <p className={styles.subtitle}>
                Everything you need to know about our shipping and delivery options
              </p>
            </div>

            <div className={styles.shippingContent}>
              {/* Shipping Options */}
              <section className={styles.shippingSection}>
                <h2>
                  <Clock size={24} />
                  Delivery Options
                </h2>
                
                <div className={styles.optionsGrid}>
                  <div className={styles.optionCard}>
                    <h3>Standard Delivery</h3>
                    <p className={styles.deliveryTime}>3-5 business days</p>
                    <p className={styles.deliveryPrice}>Free on orders over ৳2,000</p>
                    <ul>
                      <li>Available nationwide</li>
                      <li>Tracking included</li>
                      <li>Signature not required</li>
                    </ul>
                  </div>

                  <div className={styles.optionCard}>
                    <h3>Express Delivery</h3>
                    <p className={styles.deliveryTime}>1-2 business days</p>
                    <p className={styles.deliveryPrice}>৳150</p>
                    <ul>
                      <li>Major cities only</li>
                      <li>Real-time tracking</li>
                      <li>Guaranteed delivery</li>
                    </ul>
                  </div>

                  <div className={styles.optionCard}>
                    <h3>Same-Day Delivery</h3>
                    <p className={styles.deliveryTime}>Within 24 hours</p>
                    <p className={styles.deliveryPrice}>৳250</p>
                    <ul>
                      <li>Dhaka metro area only</li>
                      <li>Order before 2 PM</li>
                      <li>Premium service</li>
                    </ul>
                  </div>
                </div>
              </section>

              {/* Shipping Costs */}
              <section className={styles.shippingSection}>
                <h2>
                  <DollarSign size={24} />
                  Shipping Costs
                </h2>
                <div className={styles.priceTable}>
                  <div className={styles.priceRow}>
                    <span>Within Dhaka</span>
                    <span>৳60</span>
                  </div>
                  <div className={styles.priceRow}>
                    <span>Outside Dhaka</span>
                    <span>৳120</span>
                  </div>
                  <div className={styles.priceRow}>
                    <span>Orders over ৳2,000</span>
                    <span className={styles.free}>FREE</span>
                  </div>
                </div>
              </section>

              {/* Delivery Areas */}
              <section className={styles.shippingSection}>
                <h2>
                  <MapPin size={24} />
                  Delivery Coverage
                </h2>
                <p>We currently deliver to all 64 districts in Bangladesh.</p>
                <div className={styles.coverageInfo}>
                  <div className={styles.coverageItem}>
                    <h4>Dhaka Division</h4>
                    <p>1-3 business days</p>
                  </div>
                  <div className={styles.coverageItem}>
                    <h4>Chittagong Division</h4>
                    <p>2-4 business days</p>
                  </div>
                  <div className={styles.coverageItem}>
                    <h4>Other Divisions</h4>
                    <p>3-5 business days</p>
                  </div>
                </div>
              </section>

              {/* Important Notes */}
              <section className={styles.shippingSection}>
                <h2>Important Information</h2>
                <ul className={styles.notesList}>
                  <li>All delivery times are estimates and may vary during peak seasons or holidays</li>
                  <li>You will receive a tracking number via email once your order ships</li>
                  <li>Please ensure someone is available to receive the package</li>
                  <li>Additional charges may apply for remote or hard-to-reach areas</li>
                  <li>We are not responsible for delays caused by incorrect shipping addresses</li>
                  <li>Orders placed on weekends or holidays will be processed the next business day</li>
                </ul>
              </section>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
