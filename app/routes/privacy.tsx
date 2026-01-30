/**
 * Privacy Policy Page
 */

import { Header } from '~/components/header/header';
import { Footer } from '~/components/footer/footer';
import type { Route } from './+types/privacy';
import styles from './login.module.css';
import { Shield } from 'lucide-react';

export function meta() {
  return [
    { title: 'Privacy Policy - Manaf Zone' },
    { name: 'description', content: 'Manaf Zone privacy policy and data protection information' },
  ];
}

export default function Privacy({}: Route.ComponentProps) {
  return (
    <div className={styles.page}>
      <Header />

      <main className={styles.main}>
        <div className={styles.container}>
          <div className={styles.legalLayout}>
            <div className={styles.legalHeader}>
              <h1 className={styles.title}>
                <Shield size={32} />
                Privacy Policy
              </h1>
              <p className={styles.subtitle}>Last updated: December 2024</p>
            </div>

            <div className={styles.legalContent}>
              <section>
                <h2>1. Information We Collect</h2>
                <p>
                  We collect information you provide directly to us, such as when you create an account, make a purchase, 
                  or contact customer support. This may include your name, email address, shipping address, phone number, 
                  and payment information.
                </p>
              </section>

              <section>
                <h2>2. How We Use Your Information</h2>
                <p>We use the information we collect to:</p>
                <ul>
                  <li>Process and fulfill your orders</li>
                  <li>Communicate with you about your orders and account</li>
                  <li>Improve our products and services</li>
                  <li>Send you marketing communications (with your consent)</li>
                  <li>Protect against fraud and unauthorized transactions</li>
                </ul>
              </section>

              <section>
                <h2>3. Information Sharing</h2>
                <p>
                  We do not sell or rent your personal information to third parties. We may share your information with:
                </p>
                <ul>
                  <li>Service providers who help us operate our business</li>
                  <li>Payment processors to complete transactions</li>
                  <li>Shipping companies to deliver your orders</li>
                  <li>Law enforcement when required by law</li>
                </ul>
              </section>

              <section>
                <h2>4. Data Security</h2>
                <p>
                  We implement appropriate technical and organizational measures to protect your personal information 
                  against unauthorized access, alteration, disclosure, or destruction. However, no method of transmission 
                  over the internet is 100% secure.
                </p>
              </section>

              <section>
                <h2>5. Your Rights</h2>
                <p>You have the right to:</p>
                <ul>
                  <li>Access the personal information we hold about you</li>
                  <li>Request correction of inaccurate information</li>
                  <li>Request deletion of your information</li>
                  <li>Opt-out of marketing communications</li>
                  <li>Withdraw consent for data processing</li>
                </ul>
              </section>

              <section>
                <h2>6. Cookies</h2>
                <p>
                  We use cookies and similar tracking technologies to improve your browsing experience, analyze site traffic, 
                  and personalize content. You can control cookies through your browser settings.
                </p>
              </section>

              <section>
                <h2>7. Changes to This Policy</h2>
                <p>
                  We may update this privacy policy from time to time. We will notify you of any changes by posting the new 
                  policy on this page and updating the "Last updated" date.
                </p>
              </section>

              <section>
                <h2>8. Contact Us</h2>
                <p>
                  If you have any questions about this privacy policy or our data practices, please contact us at:
                  <br />
                  Email: privacy@shophub.com
                  <br />
                  Phone: +880 1234-567890
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
