/**
 * FAQ Page
 * Frequently Asked Questions
 */

import { Header } from '~/components/header/header';
import { Footer } from '~/components/footer/footer';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '~/components/ui/accordion/accordion';
import type { Route } from './+types/faq';
import styles from './login.module.css';
import { HelpCircle } from 'lucide-react';

export function meta() {
  return [
    { title: 'FAQ - Manaf Zone' },
    { name: 'description', content: 'Frequently asked questions about orders, shipping, and returns' },
  ];
}

const faqs = [
  {
    category: 'Orders & Payment',
    questions: [
      {
        q: 'How do I place an order?',
        a: 'Browse our products, add items to your cart, and proceed to checkout. You\'ll need to create an account or sign in to complete your purchase.',
      },
      {
        q: 'What payment methods do you accept?',
        a: 'We accept major credit cards, debit cards, and mobile payment methods including bKash, Nagad, and Rocket.',
      },
      {
        q: 'Is my payment information secure?',
        a: 'Yes, we use industry-standard encryption to protect your payment information. All transactions are processed securely.',
      },
    ],
  },
  {
    category: 'Shipping & Delivery',
    questions: [
      {
        q: 'How long does shipping take?',
        a: 'Standard shipping takes 3-5 business days within Dhaka and 5-7 business days for other areas. Express shipping is available for faster delivery.',
      },
      {
        q: 'How much does shipping cost?',
        a: 'Shipping is free on orders over ৳2,000. For orders below that, standard shipping costs ৳60 within Dhaka and ৳120 for other areas.',
      },
      {
        q: 'Can I track my order?',
        a: 'Yes! Once your order ships, you\'ll receive a tracking number via email. You can also track your order from your account dashboard.',
      },
    ],
  },
  {
    category: 'Returns & Refunds',
    questions: [
      {
        q: 'What is your return policy?',
        a: 'We offer a 7-day return policy for most items. Products must be unused and in their original packaging with tags attached.',
      },
      {
        q: 'How do I initiate a return?',
        a: 'Log into your account, go to your orders, and select the item you wish to return. Follow the instructions to request a return.',
      },
      {
        q: 'When will I receive my refund?',
        a: 'Refunds are processed within 5-7 business days after we receive and inspect your returned item.',
      },
    ],
  },
  {
    category: 'Account & Security',
    questions: [
      {
        q: 'Do I need an account to shop?',
        a: 'While you can browse without an account, you\'ll need to create one to complete a purchase and track your orders.',
      },
      {
        q: 'How do I reset my password?',
        a: 'Click on "Forgot Password" on the login page and enter your email. We\'ll send you instructions to reset your password.',
      },
      {
        q: 'Is my personal information safe?',
        a: 'We take your privacy seriously. Your information is encrypted and stored securely. We never share your data with third parties without your consent.',
      },
    ],
  },
];

export default function FAQ({}: Route.ComponentProps) {
  return (
    <div className={styles.page}>
      <Header />

      <main className={styles.main}>
        <div className={styles.container}>
          <div className={styles.faqLayout}>
            <div className={styles.faqHeader}>
              <h1 className={styles.title}>
                <HelpCircle size={32} />
                Frequently Asked Questions
              </h1>
              <p className={styles.subtitle}>
                Find answers to common questions about shopping with us
              </p>
            </div>

            <div className={styles.faqContent}>
              {faqs.map((category, index) => (
                <div key={index} className={styles.faqCategory}>
                  <h2 className={styles.categoryTitle}>{category.category}</h2>
                  <Accordion type="single" collapsible>
                    {category.questions.map((faq, qIndex) => (
                      <AccordionItem key={qIndex} value={`item-${index}-${qIndex}`}>
                        <AccordionTrigger>{faq.q}</AccordionTrigger>
                        <AccordionContent>{faq.a}</AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </div>
              ))}
            </div>

            <div className={styles.faqFooter}>
              <h3>Still have questions?</h3>
              <p>Can't find what you're looking for? Contact our support team.</p>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
