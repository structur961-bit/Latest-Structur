import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useLanguage } from '@/lib/i18n';

export default function PricingCard({ plan, description, features, popular = false, ctaLabel = undefined, ctaLink = '/register' }) {
  const { t } = useLanguage();

  return (
    <Card className={`p-8 relative flex flex-col ${popular ? 'border-accent shadow-lg ring-1 ring-accent/20' : ''}`}>
      {popular && (
        <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-accent text-accent-foreground text-xs px-3">
          {t('pricing.mostPopular')}
        </Badge>
      )}
      <h3 className="text-xl font-bold mb-1">{plan}</h3>
      <div className="mb-2">
        <div className="flex items-baseline gap-1">
          <span className="text-4xl font-bold text-emerald-600">{t('pricing.free')}</span>
        </div>
        {description && (
          <p className="text-sm text-muted-foreground mt-1">{description}</p>
        )}
      </div>
      <ul className="space-y-3 mb-8 flex-1 mt-4">
        {features.map((f, i) => (
          <li key={i} className="flex items-start gap-2 text-sm">
            <Check className="h-4 w-4 text-accent mt-0.5 shrink-0" />
            <span>{f}</span>
          </li>
        ))}
      </ul>
      <Link to={ctaLink}>
        <Button
          className={`w-full rounded-full ${popular ? 'bg-accent text-accent-foreground hover:bg-accent/90' : ''}`}
          variant={popular ? 'default' : 'outline'}
        >
          {ctaLabel || t('pricing.getStarted')}
        </Button>
      </Link>
    </Card>
  );
}