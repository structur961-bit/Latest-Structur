import React, { useState } from 'react';
import { MapPin, Phone, Mail, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const VERTICAL_LABELS = {
  restaurant: 'Restaurant', clothing: 'Fashion & Clothing', retail: 'Retail Store',
  salon: 'Salon & Beauty', camp: 'Camp & Recreation', clinic: 'Clinic & Health',
  gym: 'Gym & Fitness', education: 'Education', homeServices: 'Home Services',
  events: 'Events', carServices: 'Car Services', distributor: 'Distributor',
};

function parseHours(json) {
  try { return JSON.parse(json); } catch { return null; }
}

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

export default function StorefrontHero({ business, locations }) {
  const [hoursOpen, setHoursOpen] = useState(false);
  const hours = parseHours(business.opening_hours_json);
  const mainLocation = locations?.[0];

  const todayKey = DAYS[new Date().getDay() === 0 ? 6 : new Date().getDay() - 1];
  const todayHours = hours?.[todayKey];
  const isOpenToday = todayHours?.open;

  return (
    <div className="relative bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
      {/* Cover gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/20 to-black/50 pointer-events-none" />

      <div className="relative max-w-5xl mx-auto px-4 py-12 sm:py-16">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
          {/* Logo */}
          <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl border-2 border-white/20 overflow-hidden bg-white/10 flex items-center justify-center shrink-0 shadow-xl">
            {business.logo_url
              ? <img src={business.logo_url} alt={business.name} className="w-full h-full object-cover" />
              : <span className="text-3xl font-bold text-white">{business.name?.[0]?.toUpperCase()}</span>
            }
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <h1 className="text-2xl sm:text-3xl font-bold">{business.name}</h1>
              <Badge variant="secondary" className="bg-white/15 text-white border-white/20 text-xs">
                {VERTICAL_LABELS[business.vertical] || business.vertical}
              </Badge>
            </div>

            {business.about && (
              <p className="text-white/80 text-sm mt-1 max-w-xl leading-relaxed line-clamp-2">{business.about}</p>
            )}

            <div className="flex flex-wrap gap-4 mt-3 text-white/70 text-sm">
              {(mainLocation?.city || business.city) && (
                <span className="flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5" />
                  {mainLocation?.city || business.city}{business.country ? `, ${business.country}` : ''}
                </span>
              )}
              {business.phone && (
                <a href={`tel:${business.phone}`} className="flex items-center gap-1.5 hover:text-white transition-colors">
                  <Phone className="h-3.5 w-3.5" />
                  {business.phone}
                </a>
              )}
              {business.email && (
                <a href={`mailto:${business.email}`} className="flex items-center gap-1.5 hover:text-white transition-colors">
                  <Mail className="h-3.5 w-3.5" />
                  {business.email}
                </a>
              )}
              {hours && (
                <button
                  onClick={() => setHoursOpen(o => !o)}
                  className="flex items-center gap-1.5 hover:text-white transition-colors"
                >
                  <Clock className="h-3.5 w-3.5" />
                  <span className={isOpenToday ? 'text-green-400' : 'text-red-400'}>
                    {isOpenToday ? `Open today: ${todayHours.from} – ${todayHours.to}` : 'Closed today'}
                  </span>
                </button>
              )}
            </div>

            {/* Opening hours dropdown */}
            {hoursOpen && hours && (
              <div className="mt-3 bg-white/10 backdrop-blur rounded-xl p-4 max-w-xs">
                {DAYS.map(day => {
                  const h = hours[day];
                  return (
                    <div key={day} className="flex justify-between text-sm py-0.5">
                      <span className={`capitalize ${day === todayKey ? 'text-white font-medium' : 'text-white/60'}`}>{day}</span>
                      <span className={day === todayKey ? 'text-white' : 'text-white/60'}>
                        {h?.open ? `${h.from} – ${h.to}` : 'Closed'}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}