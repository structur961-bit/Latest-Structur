import React from 'react';
import { useLanguage } from '@/lib/i18n';
import PricingCard from '@/components/public/PricingCard';

export default function Pricing() {
  const { t } = useLanguage();

  const plans = [
    {
      plan: t('pricing.starter'),
      description: t('pricing.starterDesc'),
      features: [
        t('pricing.features.locations').replace('{n}', '1'), t('pricing.features.staff').replace('{n}', '3'), t('pricing.features.qrMenu'),
        t('pricing.features.basicOrders'), t('pricing.features.customerDb'),
        t('pricing.features.basicReports'),
      ],
    },
    {
      plan: t('pricing.growth'),
      description: t('pricing.growthDesc'),
      popular: true,
      features: [
        t('pricing.features.locations').replace('{n}', '3'), t('pricing.features.staff').replace('{n}', '10'), t('pricing.features.qrMenu'),
        t('pricing.features.inventory'), t('pricing.features.loyaltyProgram'),
        t('pricing.features.automations'), t('pricing.features.campaignsMarketing'),
        t('pricing.features.advancedReports'),
      ],
    },
    {
      plan: t('pricing.pro'),
      description: t('pricing.proDesc'),
      features: [
        t('pricing.features.multiLocation'), t('pricing.features.staff').replace('{n}', '25+'),
        t('pricing.features.aiAgents'), t('pricing.features.whatsappFlows'),
        t('pricing.features.advancedIntegrations'), t('pricing.features.prioritySupport'),
        t('pricing.growth'),
      ],
    },
    {
      plan: t('pricing.custom'),
      description: t('pricing.customDesc'),
      ctaLabel: t('pricing.contactUs'),
      ctaLink: '/contact',
      features: [
        t('pricing.customFeature1'), t('pricing.customFeature2'), t('pricing.customFeature3'),
        t('pricing.customFeature4'), t('pricing.customFeature5'), t('pricing.customFeature6'),
      ],
    },
  ];

  return (
    <div className="py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">{t('sections.pricingOverview')}</h1>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto mb-4">
            {t('sections.pricingOverviewDesc')}
          </p>
          <div className="inline-flex items-center gap-2 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full px-5 py-2 text-sm font-semibold">
            🎉 {t('pricing.allFreeNow')}
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {plans.map(p => (
            <PricingCard key={p.plan} {...p} />
          ))}
        </div>
      </div>
    </div>
  );
}