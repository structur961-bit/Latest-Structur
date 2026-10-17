import React from 'react';
import { useLanguage } from '@/lib/i18n';
import { Card } from '@/components/ui/card';
import {
  QrCode, ShoppingCart, CalendarCheck, Package, Users, Heart,
  CreditCard, Megaphone, BarChart3, UserCog, Sparkles, MessageCircle
} from 'lucide-react';

const features = [
  { key: 'qrMenu', icon: QrCode },
  { key: 'onlineOrdering', icon: ShoppingCart },
  { key: 'bookings', icon: CalendarCheck },
  { key: 'inventory', icon: Package },
  { key: 'crm', icon: Users },
  { key: 'loyalty', icon: Heart },
  { key: 'payments', icon: CreditCard },
  { key: 'campaigns', icon: Megaphone },
  { key: 'reports', icon: BarChart3 },
  { key: 'staff', icon: UserCog },
  { key: 'ai', icon: Sparkles },
  { key: 'whatsapp', icon: MessageCircle },
];

export default function Features() {
  const { t } = useLanguage();

  return (
    <div className="py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold mb-4">{t('nav.features')}</h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            {t('sections.coreModulesDesc')}
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map(({ key, icon: Icon }) => (
            <Card key={key} className="p-6 hover:shadow-md transition-shadow">
              <div className="p-3 rounded-xl bg-secondary w-fit mb-4">
                <Icon className="h-6 w-6 text-accent" />
              </div>
              <h3 className="font-semibold text-lg mb-2">{t(`modules.${key}`)}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{t(`modules.details.${key}`)}</p>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}