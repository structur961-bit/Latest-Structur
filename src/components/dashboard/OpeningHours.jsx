import React from 'react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useLanguage } from '@/lib/i18n';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const HOURS = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0'));
const MINUTES = ['00', '15', '30', '45'];
const PERIODS = ['AM', 'PM'];

const defaultDay = () => ({ open: false, from: '09:00 AM', to: '06:00 PM' });

function parseTime(str) {
  if (!str) return { hour: '09', minute: '00', period: 'AM' };
  const match = str.match(/^(\d{2}):(\d{2})\s?(AM|PM)$/i);
  if (!match) return { hour: '09', minute: '00', period: 'AM' };
  return { hour: match[1], minute: match[2], period: match[3].toUpperCase() };
}

function formatTime(hour, minute, period) {
  return `${hour}:${minute} ${period}`;
}

function TimeSelect({ value, onChange }) {
  const { hour, minute, period } = parseTime(value);

  const update = (field, val) => {
    const updated = { hour, minute, period, [field]: val };
    onChange(formatTime(updated.hour, updated.minute, updated.period));
  };

  return (
    <div className="flex items-center gap-1">
      <Select value={hour} onValueChange={v => update('hour', v)}>
        <SelectTrigger className="w-16 h-8 text-xs"><SelectValue /></SelectTrigger>
        <SelectContent>{HOURS.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent>
      </Select>
      <span className="text-muted-foreground text-xs">:</span>
      <Select value={minute} onValueChange={v => update('minute', v)}>
        <SelectTrigger className="w-16 h-8 text-xs"><SelectValue /></SelectTrigger>
        <SelectContent>{MINUTES.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
      </Select>
      <Select value={period} onValueChange={v => update('period', v)}>
        <SelectTrigger className="w-16 h-8 text-xs"><SelectValue /></SelectTrigger>
        <SelectContent>{PERIODS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
      </Select>
    </div>
  );
}

export default function OpeningHours({ value, onChange }) {
  const { t } = useLanguage();

  const hours = (() => {
    try { return value ? JSON.parse(value) : {}; } catch { return {}; }
  })();

  const update = (day, patch) => {
    const updated = { ...hours, [day]: { ...(hours[day] || defaultDay()), ...patch } };
    onChange(JSON.stringify(updated));
  };

  return (
    <div className="space-y-3">
      {DAYS.map(day => {
        const d = hours[day] || defaultDay();
        const dayLabel = t(`openingHours.days.${day}`, day.slice(0, 3));
        return (
          <div key={day} className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2 w-32">
              <Switch
                checked={!!d.open}
                onCheckedChange={v => update(day, { open: v })}
                id={`day-${day}`}
              />
              <Label htmlFor={`day-${day}`} className={`text-sm font-medium ${d.open ? '' : 'text-muted-foreground'}`}>
                {dayLabel}
              </Label>
            </div>
            {d.open ? (
              <div className="flex items-center gap-2 flex-wrap">
                <TimeSelect value={d.from || '09:00 AM'} onChange={v => update(day, { from: v })} />
                <span className="text-muted-foreground text-xs">{t('openingHours.to')}</span>
                <TimeSelect value={d.to || '06:00 PM'} onChange={v => update(day, { to: v })} />
              </div>
            ) : (
              <span className="text-xs text-muted-foreground italic">{t('openingHours.closed')}</span>
            )}
          </div>
        );
      })}
    </div>
  );
}