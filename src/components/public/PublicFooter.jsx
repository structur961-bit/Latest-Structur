import React from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '@/lib/i18n';

const LOGO_URL = 'https://media.base44.com/images/public/6a148b9c164971f5590a1690/d63abc3c2_StrucutrLogo.png';

export default function PublicFooter() {
  const { t } = useLanguage();

  return (
    <footer className="bg-[hsl(97,22%,12%)] text-[hsl(42,20%,88%)] relative overflow-hidden">
      {/* Top glow line */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-px bg-gradient-to-r from-transparent via-[hsl(90,22%,45%)]/40 to-transparent" />

      <div className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-10 pt-16 pb-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-14">

          {/* Brand */}
          <div className="md:col-span-1">
            <div className="flex items-center gap-3 mb-4">
              <img
                src={LOGO_URL}
                alt="Structur961"
                width={36}
                height={36}
                className="w-9 h-9 object-contain"
                loading="lazy"
              />
              <div>
                <p className="text-base font-bold tracking-widest text-white uppercase" style={{ letterSpacing: '0.08em' }}>
                  STRUCTUR<span className="text-[hsl(90,22%,55%)]">961</span>
                </p>
                <p className="text-[9px] tracking-[0.2em] text-white/40 uppercase">
                  Automate · Elevate · Scale
                </p>
              </div>
            </div>
            <p className="text-sm opacity-60 leading-relaxed max-w-xs">
              {t('footer.brandDesc')}
            </p>
          </div>

          {/* Product */}
          <div>
            <h4 className="font-semibold mb-4 text-xs uppercase tracking-widest opacity-40 text-white">
              {t('footer.product')}
            </h4>
            <div className="space-y-3">
              {[
                { to: '/features', label: t('nav.features') },
                { to: '/pricing', label: t('nav.pricing') },
                { to: '/business-types', label: t('nav.businessTypes') },
                { to: '/demo', label: t('nav.demo') },
              ].map(link => (
                <Link
                  key={link.to}
                  to={link.to}
                  className="block text-sm opacity-60 hover:opacity-100 transition-opacity duration-150"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>

          {/* Company */}
          <div>
            <h4 className="font-semibold mb-4 text-xs uppercase tracking-widest opacity-40 text-white">
              {t('footer.company')}
            </h4>
            <div className="space-y-3">
              <Link to="/contact" className="block text-sm opacity-60 hover:opacity-100 transition-opacity duration-150">
                {t('contact.title')}
              </Link>
              <span className="block text-sm opacity-30">{t('footer.about')}</span>
              <span className="block text-sm opacity-30">{t('footer.blog')}</span>
            </div>
          </div>

          {/* Legal */}
          <div>
            <h4 className="font-semibold mb-4 text-xs uppercase tracking-widest opacity-40 text-white">
              {t('footer.legal')}
            </h4>
            <div className="space-y-3">
              <span className="block text-sm opacity-30">{t('footer.privacy')}</span>
              <span className="block text-sm opacity-30">{t('footer.terms')}</span>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-white/8 pt-7 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs opacity-35">{t('footer.allRights')}</p>
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-[hsl(90,22%,50%)]" />
            <span className="text-xs opacity-35">structur961.com</span>
          </div>
        </div>
      </div>
    </footer>
  );
}