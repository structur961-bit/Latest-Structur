import React from 'react';
import { useLanguage } from '@/lib/i18n';
import HeroSection from '@/components/public/HeroSection';
import ModulesSection from '@/components/public/ModulesSection';
import VerticalCard from '@/components/public/VerticalCard';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import {
  UtensilsCrossed, Shirt, Store, Scissors, TreePine, Stethoscope,
  Dumbbell, GraduationCap, Wrench, PartyPopper, Car, Truck,
  Sparkles, MessageCircle, CreditCard, MapPin, ArrowRight,
  Globe, Zap, Shield, ChevronRight, CheckCircle2
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

function SectionBadge({ children }) {
  return (
    <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary/8 text-primary text-xs font-semibold border border-primary/12 mb-5 tracking-wide">
      {children}
    </div>
  );
}

export default function Home() {
  const { t } = useLanguage();

  const pillars = [
    { icon: Zap, title: t('home.pillar1Title'), desc: t('home.pillar1Desc') },
    { icon: Globe, title: t('home.pillar2Title'), desc: t('home.pillar2Desc') },
    { icon: Shield, title: t('home.pillar3Title'), desc: t('home.pillar3Desc') },
  ];

  const aiAgentKeys = ['setup', 'booking', 'order', 'inventory', 'support'];

  const waItems = [
    { label: t('home.wa1Label'), desc: t('home.wa1Desc') },
    { label: t('home.wa2Label'), desc: t('home.wa2Desc') },
    { label: t('home.wa3Label'), desc: t('home.wa3Desc') },
  ];

  const regionFeatures = [
    t('home.regionFeature1'),
    t('home.regionFeature2'),
    t('home.regionFeature3'),
    t('home.regionFeature4'),
  ];

  const regionStats = [
    { label: t('home.regionStat1Label'), val: t('home.regionStat1Val') },
    { label: t('home.regionStat2Label'), val: t('home.regionStat2Val') },
    { label: t('home.regionStat3Label'), val: t('home.regionStat3Val') },
    { label: t('home.regionStat4Label'), val: t('home.regionStat4Val') },
  ];

  return (
    <div className="overflow-hidden">
      <HeroSection />

      {/* ── Three Pillars ─────────────────────────────────────────── */}
      <section className="py-24 relative">
        <div className="max-w-4xl mx-auto px-5 sm:px-8 text-center">
          <SectionBadge>{t('home.platformBadge')}</SectionBadge>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-5 tracking-tight text-balance">
            {t('home.platformTitle')}
          </h2>
          <p className="text-muted-foreground text-base md:text-lg leading-relaxed max-w-2xl mx-auto">
            {t('home.platformDesc')}
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mt-14">
            {pillars.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="bg-card rounded-2xl p-7 border border-border/60 text-start hover:border-primary/20 hover:shadow-md transition-all duration-200">
                <div className="w-10 h-10 rounded-xl bg-primary/8 flex items-center justify-center mb-4">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="font-semibold text-foreground mb-2">{title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Industries ──────────────────────────────────────────────── */}
      <section className="py-24 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-secondary/40 to-background pointer-events-none" />
        <div className="relative max-w-7xl mx-auto px-5 sm:px-8 lg:px-10">
          <div className="text-center mb-16">
            <SectionBadge>{t('home.industriesBadge')}</SectionBadge>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4 tracking-tight text-balance">
              {t('home.industriesTitle')}
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto text-base leading-relaxed">
              {t('home.industriesDesc')}
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {verticals.map(v => (
              <VerticalCard key={v.key} icon={v.icon} verticalKey={v.key} />
            ))}
          </div>
        </div>
      </section>

      <ModulesSection />

      {/* ── AI Section ──────────────────────────────────────────────── */}
      <section className="py-24 relative overflow-hidden">
        <div className="absolute top-1/2 left-0 w-[500px] h-[500px] bg-accent/5 rounded-full blur-[100px] -translate-y-1/2 pointer-events-none" />
        <div className="relative max-w-7xl mx-auto px-5 sm:px-8 lg:px-10">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div>
              <SectionBadge>
                <Sparkles className="h-3.5 w-3.5" />
                {t('home.aiPoweredBadge')}
              </SectionBadge>
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-5 tracking-tight text-balance">
                {t('home.aiTitle')}
              </h2>
              <p className="text-muted-foreground leading-relaxed mb-8 text-base">
                {t('home.aiDesc')}
              </p>
              <div className="space-y-2.5">
                {aiAgentKeys.map(key => (
                  <div
                    key={key}
                    className="flex items-center gap-3 p-3.5 rounded-xl bg-secondary/60 border border-border/40 hover:border-primary/20 transition-colors duration-150 group cursor-default"
                  >
                    <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <Sparkles className="h-3.5 w-3.5 text-primary" />
                    </div>
                    <span className="text-sm font-medium">{t(`home.aiAgents.${key}`)}</span>
                    <ChevronRight className="h-4 w-4 text-muted-foreground/40 ms-auto group-hover:text-primary/50 transition-colors" />
                  </div>
                ))}
              </div>
            </div>

            {/* Chat mockup */}
            <div className="rounded-3xl bg-gradient-to-br from-secondary/60 to-secondary/20 p-7 border border-border/40 shadow-xl shadow-black/4">
              <div className="space-y-4">
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center shrink-0 shadow-md shadow-primary/20">
                    <Sparkles className="h-4 w-4 text-primary-foreground" />
                  </div>
                  <div className="p-3.5 rounded-2xl rounded-tl-sm bg-card border border-border/50 text-sm text-foreground shadow-sm max-w-xs">
                    {t('home.aiChatMsg1')}
                  </div>
                </div>
                <div className="flex gap-3 justify-end">
                  <div className="p-3.5 rounded-2xl rounded-tr-sm bg-primary text-primary-foreground text-sm max-w-xs shadow-md shadow-primary/20">
                    {t('home.aiChatMsg2')}
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center shrink-0 shadow-md shadow-primary/20">
                    <Sparkles className="h-4 w-4 text-primary-foreground" />
                  </div>
                  <div className="p-3.5 rounded-2xl rounded-tl-sm bg-card border border-border/50 text-sm text-foreground shadow-sm max-w-xs">
                    {t('home.aiChatMsg3')}
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-xl bg-primary/20 flex items-center justify-center shrink-0">
                    <Sparkles className="h-4 w-4 text-primary/60" />
                  </div>
                  <div className="p-3.5 rounded-2xl rounded-tl-sm bg-card border border-border/50 flex items-center gap-1.5 h-11">
                    {[0, 0.2, 0.4].map(d => (
                      <span
                        key={d}
                        className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40 animate-bounce"
                        style={{ animationDelay: `${d}s` }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── WhatsApp ────────────────────────────────────────────────── */}
      <section className="py-24 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-secondary/50 via-secondary/30 to-secondary/50 pointer-events-none" />
        <div className="relative max-w-7xl mx-auto px-5 sm:px-8 lg:px-10 text-center">
          <SectionBadge>
            <MessageCircle className="h-3.5 w-3.5" />
            {t('home.whatsappBadge')}
          </SectionBadge>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4 tracking-tight text-balance">
            {t('home.whatsappTitle')}
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto mb-12 text-base leading-relaxed">
            {t('home.whatsappDesc')}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 max-w-3xl mx-auto">
            {waItems.map(item => (
              <div
                key={item.label}
                className="bg-card rounded-2xl p-6 border border-border/60 text-start hover:border-emerald-200 hover:shadow-md transition-all duration-200 group"
              >
                <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center mb-4 group-hover:bg-emerald-100 transition-colors">
                  <MessageCircle className="h-5 w-5 text-emerald-600" />
                </div>
                <p className="font-semibold text-sm text-foreground mb-1.5">{item.label}</p>
                <p className="text-xs text-muted-foreground leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Payments ────────────────────────────────────────────────── */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-10 text-center">
          <SectionBadge>
            <CreditCard className="h-3.5 w-3.5" />
            {t('home.paymentsBadge')}
          </SectionBadge>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4 tracking-tight text-balance">
            {t('home.paymentsTitle')}
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto mb-12 text-base leading-relaxed">
            {t('home.paymentsDesc')}
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            {['Stripe', 'PayTabs', 'Tap Payments', 'MyFatoorah', 'Cash', 'Bank Transfer'].map(gw => (
              <div
                key={gw}
                className="px-5 py-2.5 rounded-full border border-border/70 bg-card text-sm font-medium hover:border-primary/30 hover:bg-secondary/60 hover:-translate-y-0.5 transition-all duration-150 shadow-sm cursor-default"
              >
                {gw}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Built for the Region ────────────────────────────────────── */}
      <section className="py-24 relative overflow-hidden grain-overlay">
        <div className="absolute inset-0 bg-[hsl(97,22%,14%)]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-[hsl(90,22%,45%)]/12 rounded-full blur-[120px] pointer-events-none" />

        <div className="relative max-w-7xl mx-auto px-5 sm:px-8 lg:px-10">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/8 text-[hsl(42,20%,88%)] text-xs font-semibold border border-white/12 mb-6">
                <MapPin className="h-3.5 w-3.5 text-[hsl(90,22%,55%)]" />
                {t('home.regionBadge')}
              </div>
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-5 tracking-tight text-balance">
                {t('home.regionTitle')}
              </h2>
              <p className="text-white/55 mb-10 text-base leading-relaxed">
                {t('home.regionDesc')}
              </p>
              <div className="space-y-3">
                {regionFeatures.map(item => (
                  <div key={item} className="flex items-center gap-3">
                    <CheckCircle2 className="h-4 w-4 text-[hsl(90,22%,55%)] shrink-0" />
                    <span className="text-white/70 text-sm">{item}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {regionStats.map(item => (
                <div key={item.label} className="p-5 rounded-2xl bg-white/5 border border-white/8 hover:bg-white/8 transition-colors">
                  <p className="text-xs text-white/40 mb-2 uppercase tracking-wider">{item.label}</p>
                  <p className="font-semibold text-white text-sm">{item.val}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Final CTA ───────────────────────────────────────────────── */}
      <section className="py-32 relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-accent/8 rounded-full blur-[80px] pointer-events-none" />
        <div className="relative max-w-2xl mx-auto px-5 sm:px-8 text-center">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary/8 text-primary text-xs font-semibold border border-primary/12 mb-6">
            {t('home.ctaBadge')}
          </div>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-5 tracking-tight leading-tight text-balance">
            {t('home.ctaTitle')}
          </h2>
          <p className="text-muted-foreground mb-10 text-base leading-relaxed">
            {t('home.ctaDesc')}
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link to="/register">
              <Button
                size="lg"
                className="rounded-full px-9 gap-2 text-base h-12 font-semibold shadow-lg shadow-primary/25 hover:shadow-primary/35 hover:-translate-y-0.5 transition-transform duration-200 cursor-pointer"
              >
                {t('home.startFree')}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link to="/demo">
              <Button
                variant="outline"
                size="lg"
                className="rounded-full px-8 gap-2 text-base h-12 border-border/60 hover:border-primary/30 hover:bg-secondary/60 hover:-translate-y-0.5 transition-transform duration-200 cursor-pointer"
              >
                {t('home.requestDemo')}
              </Button>
            </Link>
          </div>
          <p className="mt-6 text-xs text-muted-foreground/60">
            {t('home.ctaFootnote')}
          </p>
        </div>
      </section>
    </div>
  );
}