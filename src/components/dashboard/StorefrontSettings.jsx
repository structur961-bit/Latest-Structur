import { Switch } from '@/components/ui/switch';
import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Globe, ExternalLink, Copy, Check } from 'lucide-react';
import { toast } from 'sonner';
import { useLanguage } from '@/lib/i18n';

export default function StorefrontSettings({ form, setForm }) {
  const { t } = useLanguage();
  const [copied, setCopied] = useState(false);

  const slug = form.slug || '';
  const publicUrl = `${window.location.origin}/b/${slug}`;

  const copyLink = async () => {
    try { await navigator.clipboard.writeText(publicUrl); }
    catch { toast.error('Could not copy the link.'); return; }
    setCopied(true);
    toast.success(t('common.copyLink'));
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Globe className="h-4 w-4" />
          {t('settings.publicStorefront')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-3"><Switch id="storefront-published" checked={!!form.storefront_published} onCheckedChange={value => setForm({ ...form, storefront_published: value })} /><Label htmlFor="storefront-published">Publish restaurant storefront</Label></div>

        <div>
          <Label className="text-sm">{t('settings.pageUrlSlug')}</Label>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-sm text-muted-foreground shrink-0">{window.location.origin}/b/</span>
            <Input
              value={form.slug || ''}
              onChange={e => setForm({ ...form, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') })}
              placeholder="my-business"
              className="flex-1"
            />
          </div>
          <p className="text-xs text-muted-foreground mt-1">{t('settings.slugHint')}</p>
        </div>

        {slug && (
          <div className="flex items-center gap-2 bg-muted rounded-lg px-3 py-2">
            <span className="text-sm text-muted-foreground flex-1 truncate">{publicUrl}</span>
            <button type="button" onClick={copyLink} className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer" aria-label={t('common.copyLink')}>
              {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
            </button>
            <a href={publicUrl} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground transition-colors" aria-label={t('settings.openStorefront')}>
              <ExternalLink className="h-4 w-4" />
            </a>
          </div>
        )}

        <div>
          <Label className="text-sm">{t('settings.customDomain')}</Label>
          <Input
            value={form.custom_domain || ''}
            onChange={e => setForm({ ...form, custom_domain: e.target.value })}
            placeholder="www.mybusiness.com"
            className="mt-1"
          />
          <p className="text-xs text-muted-foreground mt-1">{t('settings.customDomainHint')}</p>
        </div>

        <p className="text-xs text-muted-foreground bg-blue-50 border border-blue-100 rounded-lg px-3 py-2">
          The restaurant storefront currently uses English. Dashboard language can be changed with the language switcher.
        </p>

      </CardContent>
    </Card>
  );
}