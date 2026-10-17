import React from 'react';
import { Button } from '@/components/ui/button';

export default function DashboardDataStatus({ loading, error, onRetry }) {
  if (error) return <div role="alert" className="rounded-lg border border-destructive/30 p-4 space-y-3"><p className="text-sm text-destructive">{error}</p><Button type="button" variant="outline" onClick={onRetry}>Retry</Button></div>;
  if (loading) return <p role="status" className="text-sm text-muted-foreground">Loading restaurant data…</p>;
  return null;
}
