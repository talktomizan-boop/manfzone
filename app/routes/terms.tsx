/**
 * Terms of Service Page
 */

import { Header } from '~/components/header/header';
import { Footer } from '~/components/footer/footer';
import type { Route } from './+types/terms';
import styles from './login.module.css';
import { FileText } from 'lucide-react';

export function meta() {
  return [
    { title: 'Terms of Service - Manaf Zone' },
    { name: 'description', content: 'Manaf Zone terms of service and usage agreement' },
  ];
}

export default function Terms({}: Route.ComponentProps) {
  return (
    <div className={styles.page}>
      <Header />

      <main className={styles.main}>
        <div className={styles.container}>
          <div className={styles.legalLayout}>
            <div className={styles.legalHeader}>
              <h1 className={styles.title}>
                <FileText size={32} />
                Terms of Service
              </h1>
              <p className={styles.subtitle}>Last updated: December 2024</p>
            </div>

            <div className={styles.legalContent}>
              <section>
                <h2>1. Acceptance of Terms</h2>
                <p>
                  By accessing and using Manaf Zone's website and services, you accept and agree to be bound by the terms 
                  and provision of this agreement. If you do not agree to these terms, please do not use our services.
                </p>
              </section>

              <section>
                <h2>2. User Accounts</h2>
                <p>
                  To access certain features of our service, you must register for an account. You are responsible for:
                </p>
                <ul>
                  <li>Maintaining the confidentiality of your account credentials</li>
                  <li>All activities that occur under your account</li>
                  <li>Notifying us immediately of any unauthorized use</li>
                  <li>Ensuring your account information is accurate and up-to-date</li>
                </ul>
              </section>

              <section>
                <h2>3. Orders and Payments</h2>
                <p>
                  All orders placed through our website are subject to acceptance and availability. We reserve the right to 
                  refuse or cancel any order for any reason. Prices are subject to change without notice.
                </p>
                <p>
                  Payment must be received before order fulfillment. We accept major credit cards, debit cards, and approved 
                  mobile payment methods.
                </p>
              </section>

              <section>
                <h2>4. Shipping and Delivery</h2>
                <p>
                  We aim to process and ship orders within 1-2 business days. Delivery times vary based on your location 
                  and chosen shipping method. We are not responsible for delays caused by shipping carriers or circumstances 
                  beyond our control.
                </p>
              </section>

              <section>
                <h2>5. Returns and Refunds</h2>
                <p>
                  We offer a 7-day return policy for most items. Products must be unused, in original packaging, and with 
                  all tags attached. Refunds will be processed to the original payment method within 5-7 business days after 
                  receiving and inspecting the returned item.
                </p>
              </section>

              <section>
                <h2>6. User Conduct</h2>
                <p>You agree not to:</p>
                <ul>
                  <li>Use the service for any illegal purpose</li>
                  <li>Violate any laws in your jurisdiction</li>
                  <li>Infringe on intellectual property rights</li>
                  <li>Transmit malicious code or viruses</li>
                  <li>Attempt to gain unauthorized access to our systems</li>
                  <li>Harass, abuse, or harm other users</li>
                </ul>
              </section>

              <section>
                <h2>7. Intellectual Property</h2>
                <p>
                  All content on this website, including text, graphics, logos, images, and software, is the property of 
                  Manaf Zone or its content suppliers and is protected by copyright and other intellectual property laws.
                </p>
              </section>

              <section>
                <h2>8. Limitation of Liability</h2>
                <p>
                  Manaf Zone shall not be liable for any indirect, incidental, special, consequential, or punitive damages 
                  resulting from your use or inability to use the service.
                </p>
              </section>

              <section>
                <h2>9. Modifications</h2>
                <p>
                  We reserve the right to modify these terms at any time. Changes will be effective immediately upon posting 
                  to the website. Your continued use of the service constitutes acceptance of the modified terms.
                </p>
              </section>

              <section>
                <h2>10. Contact Information</h2>
                <p>
                  For questions about these Terms of Service, please contact us at:
                  <br />
                  Email: legal@shophub.com
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
