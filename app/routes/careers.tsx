/**
 * Careers Page
 * Join our team
 */

import { Header } from '~/components/header/header';
import { Footer } from '~/components/footer/footer';
import { Button } from '~/components/ui/button/button';
import type { Route } from './+types/careers';
import styles from './login.module.css';
import { Briefcase, MapPin, Clock, Users, Heart, TrendingUp, Award, Coffee } from 'lucide-react';

export function meta() {
  return [
    { title: 'Careers - Manaf Zone' },
    { name: 'description', content: 'Join our team and help shape the future of e-commerce in Bangladesh' },
  ];
}

const openPositions = [
  {
    title: 'Senior Full Stack Developer',
    department: 'Engineering',
    location: 'Dhaka, Bangladesh',
    type: 'Full-time',
    description: 'Build scalable web applications using React, Node.js, and modern technologies.',
  },
  {
    title: 'Product Manager',
    department: 'Product',
    location: 'Dhaka, Bangladesh',
    type: 'Full-time',
    description: 'Lead product strategy and work with cross-functional teams to deliver exceptional user experiences.',
  },
  {
    title: 'Customer Success Specialist',
    department: 'Customer Support',
    location: 'Dhaka, Bangladesh',
    type: 'Full-time',
    description: 'Help customers have the best experience with our platform through excellent support and guidance.',
  },
  {
    title: 'Digital Marketing Manager',
    department: 'Marketing',
    location: 'Dhaka, Bangladesh',
    type: 'Full-time',
    description: 'Drive growth through strategic marketing campaigns and customer acquisition initiatives.',
  },
];

const benefits = [
  {
    icon: <Heart size={24} />,
    title: 'Health Insurance',
    description: 'Comprehensive medical coverage for you and your family',
  },
  {
    icon: <TrendingUp size={24} />,
    title: 'Career Growth',
    description: 'Learning opportunities and clear paths for advancement',
  },
  {
    icon: <Clock size={24} />,
    title: 'Flexible Hours',
    description: 'Work-life balance with flexible working arrangements',
  },
  {
    icon: <Coffee size={24} />,
    title: 'Great Environment',
    description: 'Modern office with amenities and collaborative culture',
  },
];

export default function Careers({}: Route.ComponentProps) {
  return (
    <div className={styles.page}>
      <Header />

      <main className={styles.main}>
        <div className={styles.container}>
          <div className={styles.careersLayout}>
            {/* Hero Section */}
            <div className={styles.careersHeader}>
              <h1 className={styles.title}>
                <Briefcase size={32} />
                Join Our Team
              </h1>
              <p className={styles.subtitle}>
                Help us revolutionize online shopping in Bangladesh
              </p>
            </div>

            {/* Mission */}
            <section className={styles.missionSection}>
              <h2>Why Work With Us?</h2>
              <p>
                At Manaf Zone, we're building more than just an e-commerce platform – we're creating the future 
                of online shopping in Bangladesh. Join a passionate team of innovators who are making a real 
                impact on how people shop and connect with products they love.
              </p>
            </section>

            {/* Benefits */}
            <section className={styles.benefitsSection}>
              <h2>
                <Award size={24} />
                What We Offer
              </h2>
              <div className={styles.benefitsGrid}>
                {benefits.map((benefit, index) => (
                  <div key={index} className={styles.benefitCard}>
                    <div className={styles.benefitIcon}>{benefit.icon}</div>
                    <h3>{benefit.title}</h3>
                    <p>{benefit.description}</p>
                  </div>
                ))}
              </div>
            </section>

            {/* Open Positions */}
            <section className={styles.positionsSection}>
              <h2>
                <Users size={24} />
                Open Positions
              </h2>
              <div className={styles.positionsList}>
                {openPositions.map((position, index) => (
                  <div key={index} className={styles.positionCard}>
                    <div className={styles.positionHeader}>
                      <h3>{position.title}</h3>
                      <span className={styles.department}>{position.department}</span>
                    </div>
                    <p className={styles.positionDescription}>{position.description}</p>
                    <div className={styles.positionMeta}>
                      <div className={styles.metaItem}>
                        <MapPin size={16} />
                        <span>{position.location}</span>
                      </div>
                      <div className={styles.metaItem}>
                        <Clock size={16} />
                        <span>{position.type}</span>
                      </div>
                    </div>
                    <Button variant="outline" className={styles.applyButton}>
                      Apply Now
                    </Button>
                  </div>
                ))}
              </div>
            </section>

            {/* CTA */}
            <section className={styles.careersCTA}>
              <h2>Don't See Your Role?</h2>
              <p>
                We're always looking for talented individuals. Send us your resume and let us know how you 
                can contribute to our mission.
              </p>
              <Button size="lg">Send Your Resume</Button>
            </section>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
