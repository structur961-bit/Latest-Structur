import React from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { ArrowRight, Sparkles, TrendingUp, Users, ShoppingCart } from 'lucide-react';

const LOGO_URL = 'https://media.base44.com/images/public/6a148b9c164971f5590a1690/d63abc3c2_StrucutrLogo.png';

function DashboardMockup() {
  return (
    <div className="relative w-full">
      {/* Floating card 1 – Revenue */}
      <div className="absolute -left-8 top-16 z-10 animate-float hidden lg:block">
        <div className="glass-card rounded-2xl p-3.5 shadow-xl shadow-black/8 w-44">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
              <TrendingUp className="h-3.5 w-3.5 text-primary" />
            </div>
            <span className="text-xs font-semibold text-foreground">Revenue</span>
          </div>
          <p className="text-lg font-bold text-foreground tabular-nums">$12,480</p>
          <p className="text-xs text-emerald-600 font-medium mt-0.5">↑ 18% this month</p>
        </div>
      </div>

      {/* Floating card 2 – Customers */}
      <div className="absolute -right-6 top-10 z-10 animate-float-delay hidden lg:block">
        <div className="glass-card rounded-2xl p-3.5 shadow-xl shadow-black/8 w-40">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 rounded-lg bg-accent/10 flex items-center justify-center">
              <Users className="h-3.5 w-3.5 text-accent" />
            </div>
            <span className="text-xs font-semibold text-foreground">Customers</span>
          </div>
          <p className="text-lg font-bold text-foreground tabular-nums">1,284</p>
          <p className="text-xs text-muted-foreground mt-0.5">+32 this week</p>
        </div>
      </div>

      {/* Floating card 3 – Order */}
      <div className="absolute -right-4 bottom-24 z-10 animate-float-slow hidden lg:block">
        <div className="glass-card rounded-2xl p-3.5 shadow-xl shadow-black/8 w-44">
          <div className="flex items-center gap-2 mb-2.5">
            <div className="w-7 h-7 rounded-lg bg-emerald-50 flex items-center justify-center">
              <ShoppingCart className="h-3.5 w-3.5 text-emerald-600" />
            </div>
            <span className="text-xs font-semibold text-foreground">New Order</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center shrink-0">
              <span className="text-[9px] text-white font-bold">JD</span>
            </div>
            <div>
              <p className="text-xs font-medium text-foreground">John D.</p>
              <p className="text-xs text-muted-foreground">Table #4 · $47</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main browser mockup */}
      <div className="relative mx-auto glow-olive rounded-2xl overflow-hidden shadow-2xl border border-border/40">
        <div className="flex items-center gap-2 px-4 py-3 bg-[hsl(97,15%,18%)] border-b border-white/5">
          <div className="flex gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-red-400/70" />
            <div className="w-2.5 h-2.5 rounded-full bg-amber-400/70" />
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-400/70" />
          </div>
          <div className="flex-1 mx-4">
            <div className="h-5 rounded-md bg-white/5 flex items-center justify-center">
              <span className="text-[10px] text-white/30">app.structur961.com/dashboard</span>
            </div>
          </div>
        </div>

        <div className="bg-[hsl(97,15%,10%)] p-5">
          <div className="grid grid-cols-4 gap-3 mb-4">
            {[
              { label: 'Orders', val: '284', color: 'from-primary/20 to-primary/5' },
              { label: 'Revenue', val: '$8.2k', color: 'from-accent/20 to-accent/5' },
              { label: 'Customers', val: '1.2k', color: 'from-emerald-500/20 to-emerald-500/5' },
              { label: 'Bookings', val: '47', color: 'from-amber-500/20 to-amber-500/5' },
            ].map((s, i) => (
              <div key={i} className={`h-16 rounded-xl bg-gradient-to-br ${s.color} border border-white/5 flex flex-col items-center justify-center`}>
                <p className="text-[10px] text-white/40 mb-0.5">{s.label}</p>
                <p className="text-sm font-bold text-white/80 tabular-nums">{s.val}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2 h-40 rounded-xl bg-white/3 border border-white/5 p-3 overflow-hidden">
              <p className="text-[9px] text-white/30 mb-3 uppercase tracking-wider">Revenue Overview</p>
              <div className="flex items-end gap-1.5 h-24">
                {[40, 65, 45, 80, 55, 90, 70, 85, 60, 95, 75, 88].map((h, i) => (
                  <div
                    key={i}
                    className="flex-1 rounded-sm bg-gradient-to-t from-accent/60 to-accent/20"
                    style={{ height: `${h}%` }}
                  />
                ))}
              </div>
            </div>
            <div className="h-40 rounded-xl bg-white/3 border border-white/5 p-3 flex flex-col gap-2">
              <p className="text-[9px] text-white/30 uppercase tracking-wider">Recent</p>
              {['Pizza Margherita · $18', 'Grilled Salmon · $32', 'Caesar Salad · $14'].map((item, i) => (
                <div key={i} className="flex items-center justify-between gap-2">
                  <div className="h-1.5 rounded-full bg-white/10 flex-1" />
                  <span className="text-[9px] text-accent/70 font-medium tabular-nums">{item.split('·')[1]}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function HeroSection() {
  const { t } = useLanguage();

  return (
    <section className="relative overflow-hidden grain-overlay">
      {/* Background */}
      <div className="absolute inset-0 bg-[hsl(42,28%,97%)]" />
      <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-[hsl(90,22%,45%)]/8 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-1/3 right-0 w-[400px] h-[400px] bg-[hsl(97,20%,30%)]/6 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-[hsl(42,35%,85%)]/40 rounded-full blur-[80px] pointer-events-none" />

      <div className="relative max-w-7xl mx-auto px-5 sm:px-8 lg:px-10 pt-20 pb-16 md:pt-28 md:pb-20">

        {/* Top badge */}
        <div className="flex justify-center animate-fade-up">
          <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-primary/8 text-primary text-xs font-semibold border border-primary/15 mb-10 tracking-wide">
            <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
            {t('heroSection.badge')}
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">

          {/* Left: copy */}
          <div className="text-center lg:text-start">

            {/* Logo lockup above headline */}
            <div className="flex items-center gap-3 justify-center lg:justify-start mb-7 animate-fade-up">
              <img
                src={LOGO_URL}
                alt="Structur961 logo"
                width={48}
                height={48}
                className="w-12 h-12 object-contain"
                fetchPriority="high"
              />
              <div className="text-start">
                <p className="text-lg font-bold tracking-widest text-foreground uppercase" style={{ letterSpacing: '0.1em' }}>
                  STRUCTUR<span className="text-primary">961</span>
                </p>
                <p className="text-[10px] tracking-[0.22em] text-muted-foreground uppercase">
                  Automate · Elevate · Scale
                </p>
              </div>
            </div>

            <h1 className="animate-fade-up-delay-1 text-4xl md:text-5xl lg:text-[3.4rem] xl:text-[3.8rem] font-bold tracking-tight leading-[1.1] mb-6 text-foreground text-balance">
              {t('heroSection.headline1')}<br />
              <span className="text-gradient-olive">{t('heroSection.headline2')}</span>
            </h1>

            <p className="animate-fade-up-delay-2 text-base md:text-lg text-muted-foreground leading-relaxed mb-10 max-w-lg mx-auto lg:mx-0">
              {t('heroSection.subtitle')}
            </p>

            <div className="animate-fade-up-delay-3 flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3">
              <Link to="/register">
                <Button
                  size="lg"
                  className="rounded-full px-9 gap-2 text-base h-12 font-semibold shadow-lg shadow-primary/25 hover:shadow-primary/35 hover:-translate-y-0.5 transition-transform duration-200 cursor-pointer"
                >
                  {t('heroSection.startFree')}
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link to="/demo">
                <Button
                  variant="outline"
                  size="lg"
                  className="rounded-full px-8 gap-2 text-base h-12 font-medium border-border/60 hover:border-primary/30 hover:bg-secondary/60 hover:-translate-y-0.5 transition-transform duration-200 cursor-pointer"
                >
                  <Sparkles className="h-4 w-4 text-accent" />
                  {t('heroSection.seeLive')}
                </Button>
              </Link>
            </div>

            {/* Social proof / trust */}
            <div className="animate-fade-up-delay-3 mt-8 flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4">
              <p className="text-xs text-muted-foreground/70">
                {t('heroSection.trustLine')}
              </p>
              <div className="hidden sm:block h-3.5 w-px bg-border/60" />
              <div className="flex items-center gap-1">
                {[1,2,3,4,5].map(i => (
                  <svg key={i} className="w-3.5 h-3.5 text-amber-400 fill-current" viewBox="0 0 20 20" aria-hidden="true"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
                ))}
                <span className="text-xs text-muted-foreground ms-1.5">{t('heroSection.lovedBy')}</span>
              </div>
            </div>
          </div>

          {/* Right: Dashboard mockup */}
          <div className="animate-fade-up-delay-2 relative lg:pl-4">
            <DashboardMockup />
          </div>
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-background to-transparent pointer-events-none" />
    </section>
  );
}