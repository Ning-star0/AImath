'use client';

import { HomeHero } from '@/components/home/home-hero';
import { HomeLearningOverview } from '@/components/home/home-learning-overview';

export default function HomePage() {
  return (
    <main className="home-lab-shell min-h-screen">
      <HomeHero />
      <HomeLearningOverview />
    </main>
  );
}
