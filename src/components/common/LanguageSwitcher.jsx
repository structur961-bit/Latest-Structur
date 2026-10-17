import React from 'react';
import { useLanguage } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { Globe } from 'lucide-react';

/** @param {{variant?: import("react").ComponentProps<typeof Button>["variant"], size?: import("react").ComponentProps<typeof Button>["size"]}} props */
export default function LanguageSwitcher({ variant = 'ghost', size = 'sm' }) {
  const { lang, setLang } = useLanguage();

  return (
    <Button
      variant={variant}
      size={size}
      onClick={() => setLang(lang === 'en' ? 'ar' : 'en')}
      className="gap-1.5 font-medium"
    >
      <Globe className="h-4 w-4" />
      {lang === 'en' ? 'عربي' : 'EN'}
    </Button>
  );
}