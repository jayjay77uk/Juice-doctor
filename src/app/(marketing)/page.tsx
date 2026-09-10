import * as React from 'react';
import { testimonials as testimonialsService } from '@/services';
import { HomeReference } from '@/components/sections/home-reference';

export default async function HomePage() {
  const testimonialsResult = await testimonialsService.featured(3);
  const testimonials = testimonialsResult.ok ? testimonialsResult.data : [];

  return <HomeReference testimonials={testimonials} />;
}
