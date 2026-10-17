import React from 'react';
import { Badge } from '@/components/ui/badge';

const statusStyles = {
  active: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  completed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  paid: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  confirmed: 'bg-blue-50 text-blue-700 border-blue-200',
  pending: 'bg-amber-50 text-amber-700 border-amber-200',
  draft: 'bg-slate-50 text-slate-600 border-slate-200',
  preparing: 'bg-violet-50 text-violet-700 border-violet-200',
  ready: 'bg-cyan-50 text-cyan-700 border-cyan-200',
  cancelled: 'bg-red-50 text-red-700 border-red-200',
  refunded: 'bg-red-50 text-red-600 border-red-200',
  failed: 'bg-red-50 text-red-700 border-red-200',
  no_show: 'bg-orange-50 text-orange-700 border-orange-200',
  suspended: 'bg-red-50 text-red-700 border-red-200',
  trial: 'bg-blue-50 text-blue-700 border-blue-200',
  inactive: 'bg-slate-50 text-slate-500 border-slate-200',
  unpaid: 'bg-amber-50 text-amber-700 border-amber-200',
  partial: 'bg-orange-50 text-orange-700 border-orange-200',
};

export default function StatusBadge({ status }) {
  const style = statusStyles[status] || 'bg-slate-50 text-slate-600 border-slate-200';
  return (
    <Badge variant="outline" className={`${style} capitalize font-medium text-xs px-2 py-0.5`}>
      {status?.replace(/_/g, ' ')}
    </Badge>
  );
}