import React from 'react';
import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useLanguage } from '@/lib/i18n';

export default function VerticalCard({ icon: Icon, verticalKey }) {
  const { t } = useLanguage();
  const name = t(`verticals.${verticalKey}.name`);
  const desc = t(`verticals.${verticalKey}.desc`);

  return (
    <div className="group relative bg-card rounded-2xl p-6 border border-border/60 hover-lift hover:border-primary/20 transition-colors cursor-default">
      <div className="w-11 h-11 rounded-xl bg-secondary flex items-center justify-center mb-4 group-hover:bg-primary/10 transition-colors">
        <Icon className="h-5 w-5 text-primary group-hover:text-primary transition-colors" />
      </div>
      <h3 className="font-semibold text-base text-foreground mb-2">{name}</h3>
      <p className="text-sm text-muted-foreground leading-relaxed mb-4">{desc}</p>
      <Link to="/register" className="inline-flex items-center gap-1 text-xs font-semibold text-accent hover:gap-2 transition-all">
        {t('pricing.getStarted')} <ArrowRight className="h-3.5 w-3.5" />
      </Link>
    </div>
  );
}