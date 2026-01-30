/**
 * Returns & Refunds Page
 */

import { Header } from '~/components/header/header';
import { Footer } from '~/components/footer/footer';
import type { Route } from './+types/returns';
import styles from './login.module.css';
import { RotateCcw, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

export function meta() {
  return [
    { title: 'Returns & Refunds - Manaf Zone' },
    { name: 'description', content: 'Our return policy and refund process' },
  ];
}

export default function Returns({}: Route.ComponentProps) {
  return (
    <div className={styles.page}>
      <Header />

      <main className={styles.main}>
        <div className={styles.container}>
          <div className={styles.returnsLayout}>
            <div className={styles.returnsHeader}>
              <h1 className={styles.title}>
                <RotateCcw size={32} />
                Returns & Refunds
              </h1>
              <p className={styles.subtitle}>
                We want you to be completely satisfied with your purchase
              </p>
            </div>

            <div className={styles.returnsContent}>
              {/* Return Policy */}
              <section className={styles.policySection}>
                <h2>Our Return Policy</h2>
                <p className={styles.policyHighlight}>
                  We offer a <strong>7-day return policy</strong> for most items. 
                  If you're not completely satisfied, you can return your purchase for a full refund or exchange.
                </p>
              </section>

              {/* Eligible Items */}
              <section className={styles.policySection}>
                <h2>
                  <CheckCircle size={24} />
                  Eligible for Return
                </h2>
                <ul className={styles.eligibleList}>
                  <li>Items in original, unused condition</li>
                  <li>Original packaging and tags intact</li>
                  <li>Receipt or proof of purchase</li>
                  <li>Returned within 7 days of delivery</li>
                  <li>Items not on the non-returnable list</li>
                </ul>
              </section>

              {/* Non-Returnable Items */}
              <section className={styles.policySection}>
                <h2>
                  <XCircle size={24} />
                  Non-Returnable Items
                </h2>
                <ul className={styles.nonReturnableList}>
                  <li>Personalized or custom-made items</li>
                  <li>Intimate apparel and swimwear</li>
                  <li>Health and personal care items</li>
                  <li>Software, digital downloads, or gift cards</li>
                  <li>Perishable goods</li>
                  <li>Items marked as "final sale"</li>
                </ul>
              </section>

              {/* Return Process */}
              <section className={styles.policySection}>
                <h2>How to Return an Item</h2>
                <div className={styles.processSteps}>
                  <div className={styles.step}>
                    <div className={styles.stepNumber}>1</div>
                    <div className={styles.stepContent}>
                      <h4>Log into Your Account</h4>
                      <p>Go to your order history and select the item you want to return</p>
                    </div>
                  </div>

                  <div className={styles.step}>
                    <div className={styles.stepNumber}>2</div>
                    <div className={styles.stepContent}>
                      <h4>Request Return</h4>
                      <p>Click "Return Item" and select a reason for the return</p>
                    </div>
                  </div>

                  <div className={styles.step}>
                    <div className={styles.stepNumber}>3</div>
                    <div className={styles.stepContent}>
                      <h4>Print Return Label</h4>
                      <p>We'll email you a prepaid return shipping label</p>
                    </div>
                  </div>

                  <div className={styles.step}>
                    <div className={styles.stepNumber}>4</div>
                    <div className={styles.stepContent}>
                      <h4>Ship the Item</h4>
                      <p>Pack the item securely and drop it off at any courier location</p>
                    </div>
                  </div>

                  <div className={styles.step}>
                    <div className={styles.stepNumber}>5</div>
                    <div className={styles.stepContent}>
                      <h4>Receive Refund</h4>
                      <p>Once we receive and inspect the item, your refund will be processed</p>
                    </div>
                  </div>
                </div>
              </section>

              {/* Refund Information */}
              <section className={styles.policySection}>
                <h2>
                  <AlertCircle size={24} />
                  Refund Information
                </h2>
                <div className={styles.refundInfo}>
                  <p><strong>Processing Time:</strong> 5-7 business days after we receive your return</p>
                  <p><strong>Refund Method:</strong> Original payment method</p>
                  <p><strong>Shipping Costs:</strong> Original shipping fees are non-refundable</p>
                  <p><strong>Return Shipping:</strong> Free for defective items, ৳60 for other returns</p>
                </div>
              </section>

              {/* Exchanges */}
              <section className={styles.policySection}>
                <h2>Exchanges</h2>
                <p>
                  If you need a different size or color, we recommend returning the original item for a refund 
                  and placing a new order. This ensures you get your preferred item as quickly as possible.
                </p>
              </section>

              {/* Damaged/Defective Items */}
              <section className={styles.policySection}>
                <h2>Damaged or Defective Items</h2>
                <p>
                  If you receive a damaged or defective item, please contact us within 48 hours of delivery. 
                  We'll arrange a free return and send you a replacement or provide a full refund, including shipping costs.
                </p>
                <p className={styles.contactInfo}>
                  Email: returns@shophub.com | Phone: +880 1234-567890
                </p>
              </section>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
