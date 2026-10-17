import React from 'react';
import { useLanguage } from '@/lib/i18n';
import VerticalCard from '@/components/public/VerticalCard';
import {
  UtensilsCrossed, Shirt, Store, Scissors, TreePine, Stethoscope,
  Dumbbell, GraduationCap, Wrench, PartyPopper, Car, Truck
} from 'lucide-react';

const verticals = [
  { key: 'restaurant', icon: UtensilsCrossed },
  { key: 'clothing', icon: Shirt },
  { key: 'retail', icon: Store },
  { key: 'salon', icon: Scissors },
  { key: 'camp', icon: TreePine },
  { key: 'clinic', icon: Stethoscope },
  { key: 'gym', icon: Dumbbell },
  { key: 'education', icon: GraduationCap },
  { key: 'homeServices', icon: Wrench },
  { key: 'events', icon: PartyPopper },
  { key: 'carServices', icon: Car },
  { key: 'distributor', icon: Truck },
];

export default function BusinessTypes() {
  const { t } = useLanguage();

  return (
    <div className="py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold mb-4">{t('sections.businessTypes')}</h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            {t('sections.businessTypesDesc')}
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {verticals.map(v => (
            <VerticalCard key={v.key} icon={v.icon} verticalKey={v.key} />
          ))}
        </div>
      </div>
    </div>
  );
}