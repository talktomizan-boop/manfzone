/**
 * Contact Page
 * Customer support and contact information
 */

import { Header } from '~/components/header/header';
import { Footer } from '~/components/footer/footer';
import { Button } from '~/components/ui/button/button';
import { Input } from '~/components/ui/input/input';
import { Textarea } from '~/components/ui/textarea/textarea';
import type { Route } from './+types/contact';
import styles from './login.module.css';
import { Mail, Phone, MapPin, MessageSquare, Clock } from 'lucide-react';

export function meta() {
  return [
    { title: 'Contact Us - Manaf Zone' },
    { name: 'description', content: 'Get in touch with our customer support team' },
  ];
}

export default function Contact({}: Route.ComponentProps) {
  return (
    <div className={styles.page}>
      <Header />

      <main className={styles.main}>
        <div className={styles.container}>
          <div className={styles.contactLayout}>
            {/* Contact Form */}
            <div className={styles.formSection}>
              <h1 className={styles.title}>
                <MessageSquare size={32} />
                Get in Touch
              </h1>
              <p className={styles.subtitle}>
                Have a question? We'd love to hear from you. Send us a message and we'll respond as soon as possible.
              </p>

              <form className={styles.form}>
                <div className={styles.formGroup}>
                  <label htmlFor="name">Full Name</label>
                  <Input id="name" type="text" placeholder="Your name" required />
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="email">Email Address</label>
                  <Input id="email" type="email" placeholder="your@email.com" required />
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="subject">Subject</label>
                  <Input id="subject" type="text" placeholder="How can we help?" required />
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="message">Message</label>
                  <Textarea 
                    id="message" 
                    placeholder="Tell us more about your inquiry..." 
                    rows={6}
                    required 
                  />
                </div>

                <Button type="submit" size="lg" className={styles.submitButton}>
                  Send Message
                </Button>
              </form>
            </div>

            {/* Contact Information */}
            <div className={styles.infoSection}>
              <div className={styles.infoCard}>
                <h2>Contact Information</h2>
                
                <div className={styles.contactInfo}>
                  <div className={styles.contactItem}>
                    <Mail size={20} />
                    <div>
                      <h3>Email</h3>
                      <p>support@shophub.com</p>
                    </div>
                  </div>

                  <div className={styles.contactItem}>
                    <Phone size={20} />
                    <div>
                      <h3>Phone</h3>
                      <p>+880 1234-567890</p>
                    </div>
                  </div>

                  <div className={styles.contactItem}>
                    <MapPin size={20} />
                    <div>
                      <h3>Address</h3>
                      <p>123 Commerce Street<br />Dhaka 1000, Bangladesh</p>
                    </div>
                  </div>

                  <div className={styles.contactItem}>
                    <Clock size={20} />
                    <div>
                      <h3>Business Hours</h3>
                      <p>Monday - Friday: 9 AM - 6 PM<br />Saturday: 10 AM - 4 PM<br />Sunday: Closed</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className={styles.infoCard}>
                <h3>Frequently Asked Questions</h3>
                <p>Looking for quick answers? Check out our FAQ page for common questions about orders, shipping, and returns.</p>
                <Button variant="outline">Visit FAQ</Button>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
