import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useLanguage } from '@/lib/i18n';
import LanguageSwitcher from '@/components/common/LanguageSwitcher';
import { Button } from '@/components/ui/button';
import { Menu, X } from 'lucide-react';

const LOGO_URL = 'https://media.base44.com/images/public/6a148b9c164971f5590a1690/d63abc3c2_StrucutrLogo.png';

export default function PublicNavbar() {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => { setOpen(false); }, [location.pathname]);

  const links = [
    { to: '/features', label: t('nav.features') },
    { to: '/business-types', label: t('nav.businessTypes') },
    { to: '/pricing', label: t('nav.pricing') },
    { to: '/contact', label: t('nav.contact') },
  ];

  return (
    <nav className={`sticky top-0 z-50 transition-all duration-300 ${
      scrolled
        ? 'bg-[hsl(42,28%,97%)]/95 backdrop-blur-2xl shadow-sm shadow-black/5 border-b border-border/40'
        : 'bg-transparent'
    }`}>
      <div className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-10">
        <div className="flex items-center justify-between h-[72px]">

          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 group" aria-label="Structur961 Home">
            <img
              src={LOGO_URL}
              alt="Structur961"
              width={36}
              height={36}
              className="w-9 h-9 object-contain"
            />
            <div className="flex flex-col leading-none">
              <span className="text-base font-bold tracking-wider text-foreground uppercase" style={{ letterSpacing: '0.08em' }}>
                STRUCTUR<span className="text-primary">961</span>
              </span>
              <span className="text-[9px] tracking-[0.18em] text-muted-foreground uppercase font-medium" style={{ letterSpacing: '0.2em' }}>
                Automate · Elevate · Scale
              </span>
            </div>
          </Link>

          {/* Desktop links */}
          <div className="hidden md:flex items-center gap-0.5">
            {links.map(l => (
              <Link key={l.to} to={l.to}>
                <Button
                  variant="ghost"
                  size="sm"
                  className={`text-sm font-medium transition-colors rounded-lg px-4 cursor-pointer ${
                    location.pathname === l.to
                      ? 'text-foreground bg-secondary/60'
                      : 'text-muted-foreground hover:text-foreground hover:bg-secondary/40'
                  }`}
                >
                  {l.label}
                </Button>
              </Link>
            ))}
          </div>

          {/* Desktop CTAs */}
          <div className="hidden md:flex items-center gap-2">
            <LanguageSwitcher />
            <Link to="/login">
              <Button variant="ghost" size="sm" className="text-sm font-medium text-muted-foreground hover:text-foreground cursor-pointer">
                {t('nav.login')}
              </Button>
            </Link>
            <Link to="/register">
              <Button size="sm" className="rounded-full px-5 text-sm font-semibold shadow-md shadow-primary/20 hover:shadow-primary/30 hover:-translate-y-px transition-transform duration-150 cursor-pointer">
                {t('nav.register')}
              </Button>
            </Link>
          </div>

          {/* Mobile toggle */}
          <button
            className="md:hidden p-2 rounded-lg hover:bg-secondary/60 transition-colors cursor-pointer"
            onClick={() => setOpen(!open)}
            aria-label={open ? 'Close menu' : 'Open menu'}
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {/* Mobile menu */}
        {open && (
          <div className="md:hidden pb-5 pt-1 space-y-0.5 border-t border-border/30 mt-0">
            {links.map(l => (
              <Link key={l.to} to={l.to}>
                <Button variant="ghost" className="w-full justify-start text-sm text-muted-foreground hover:text-foreground cursor-pointer">
                  {l.label}
                </Button>
              </Link>
            ))}
            <div className="flex items-center gap-2 pt-3 px-2">
              <LanguageSwitcher />
              <Link to="/login">
                <Button variant="ghost" size="sm" className="text-sm cursor-pointer">{t('nav.login')}</Button>
              </Link>
              <Link to="/register">
                <Button size="sm" className="rounded-full px-5 cursor-pointer">{t('nav.register')}</Button>
              </Link>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}