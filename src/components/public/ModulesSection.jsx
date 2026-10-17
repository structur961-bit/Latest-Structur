import React from 'react';
import { useLanguage } from '@/lib/i18n';
import {
  QrCode, ShoppingCart, CalendarCheck, Package, Users, Heart,
  CreditCard, Megaphone, BarChart3, UserCog, Sparkles, MessageCircle
} from 'lucide-react';

const moduleIcons = [
  { key: 'qrMenu', icon: QrCode, color: 'bg-amber-50 text-amber-700' },
  { key: 'onlineOrdering', icon: ShoppingCart, color: 'bg-blue-50 text-blue-700' },
  { key: 'bookings', icon: CalendarCheck, color: 'bg-purple-50 text-purple-700' },
  { key: 'inventory', icon: Package, color: 'bg-orange-50 text-orange-700' },
  { key: 'crm', icon: Users, color: 'bg-teal-50 text-teal-700' },
  { key: 'loyalty', icon: Heart, color: 'bg-rose-50 text-rose-700' },
  { key: 'payments', icon: CreditCard, color: 'bg-emerald-50 text-emerald-700' },
  { key: 'campaigns', icon: Megaphone, color: 'bg-violet-50 text-violet-700' },
  { key: 'reports', icon: BarChart3, color: 'bg-sky-50 text-sky-700' },
  { key: 'staff', icon: UserCog, color: 'bg-indigo-50 text-indigo-700' },
  { key: 'ai', icon: Sparkles, color: 'bg-primary/8 text-primary' },
  { key: 'whatsapp', icon: MessageCircle, color: 'bg-emerald-50 text-emerald-600' },
];

export default function ModulesSection() {
  const { t } = useLanguage();

  return (
    <section className="py-28 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-secondary/30 via-background to-secondary/20 pointer-events-none" />
      <div className="relative max-w-7xl mx-auto px-5 sm:px-8 lg:px-10">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary/8 text-primary text-xs font-semibold border border-primary/12 mb-5 tracking-wide">
            {t('home.modulesEverythingBadge')}
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4 tracking-tight">
            {t('sections.coreModules')}
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto text-base leading-relaxed">
            {t('sections.coreModulesDesc')}
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {moduleIcons.map(({ key, icon: Icon, color }) => (
            <div
              key={key}
              className="group relative bg-card rounded-2xl p-6 border border-border/60 hover-lift cursor-default hover:border-primary/20 transition-colors"
            >
              <div className={`w-10 h-10 rounded-xl ${color} flex items-center justify-center mb-4 transition-transform group-hover:scale-110`}>
                <Icon className="h-5 w-5" />
              </div>
              <p className="text-sm font-semibold text-foreground">{t(`modules.${key}`)}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}