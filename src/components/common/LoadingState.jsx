import React from 'react';

export default function LoadingState({ text }) {
  return (
    <div className="flex flex-col items-center justify-center py-16">
      <div className="w-8 h-8 border-3 border-border border-t-primary rounded-full animate-spin mb-3" />
      {text && <p className="text-sm text-muted-foreground">{text}</p>}
    </div>
  );
}