import React from 'react';
import { MapPin, Phone, Mail, Globe } from 'lucide-react';

export default function StorefrontFooter({ business, locations, isRTL }) {
  const year = new Date().getFullYear();

  return (
    <footer className="bg-slate-900 text-white/70 border-t border-white/10">
      <div className="max-w-5xl mx-auto px-4 py-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 mb-8">
          <div>
            <div className="flex items-center gap-3 mb-3">
              {business.logo_url && (
                <img src={business.logo_url} alt={business.name} className="w-8 h-8 rounded-lg object-cover" />
              )}
              <span className="text-white font-bold text-lg">{business.name}</span>
            </div>
            {business.about && (
              <p className="text-sm leading-relaxed line-clamp-3">{business.about}</p>
            )}
          </div>

          <div>
            <p className="text-white font-semibold mb-3 text-sm">{isRTL ? 'تواصل معنا' : 'Contact Us'}</p>
            <div className="space-y-2 text-sm">
              {(locations?.[0]?.address || business.city) && (
                <div className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>{locations?.[0]?.address || `${business.city}, ${business.country}`}</span>
                </div>
              )}
              {business.phone && (
                <a href={`tel:${business.phone}`} className="flex items-center gap-2 hover:text-white transition-colors">
                  <Phone className="h-4 w-4 shrink-0" />
                  <span>{business.phone}</span>
                </a>
              )}
              {business.email && (
                <a href={`mailto:${business.email}`} className="flex items-center gap-2 hover:text-white transition-colors">
                  <Mail className="h-4 w-4 shrink-0" />
                  <span>{business.email}</span>
                </a>
              )}
            </div>
          </div>
        </div>

        <div className="border-t border-white/10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs">
          <p>© {year} {business.name}. {isRTL ? 'جميع الحقوق محفوظة.' : 'All rights reserved.'}</p>
          <p className="flex items-center gap-1">
            <Globe className="h-3 w-3" />
            {isRTL ? 'مدعوم بـ' : 'Powered by'} <span className="text-white font-medium ml-1">Our Platform</span>
          </p>
        </div>
      </div>
    </footer>
  );
}