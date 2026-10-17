import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { cn } from '@/lib/utils';
import { CheckCircle2, AlertCircle, Loader2, ChevronRight, Clock } from 'lucide-react';

const ToolCallDisplay = ({ toolCall }) => {
  const [expanded, setExpanded] = useState(false);
  const name = toolCall?.name || 'Function';
  const status = toolCall?.status || 'pending';

  const statusConfig = {
    pending:     { icon: Clock,        color: 'text-slate-400', text: 'Pending' },
    running:     { icon: Loader2,      color: 'text-slate-500', text: 'Running...', spin: true },
    in_progress: { icon: Loader2,      color: 'text-slate-500', text: 'Running...', spin: true },
    completed:   { icon: CheckCircle2, color: 'text-green-600', text: 'Done' },
    success:     { icon: CheckCircle2, color: 'text-green-600', text: 'Done' },
    failed:      { icon: AlertCircle,  color: 'text-red-500',   text: 'Failed' },
    error:       { icon: AlertCircle,  color: 'text-red-500',   text: 'Failed' },
  }[status] || { icon: Clock, color: 'text-slate-400', text: '' };

  const Icon = statusConfig.icon;
  const formattedName = name.replace(/([A-Z])/g, ' $1').trim();

  return (
    <div className="mt-1 text-xs">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 transition-colors"
      >
        <Icon className={cn('h-3 w-3', statusConfig.color, statusConfig.spin && 'animate-spin')} />
        <span className="text-slate-700">{formattedName}</span>
        {statusConfig.text && <span className="text-slate-400">• {statusConfig.text}</span>}
        {!statusConfig.spin && toolCall?.results && (
          <ChevronRight className={cn('h-3 w-3 text-slate-400 ml-auto transition-transform', expanded && 'rotate-90')} />
        )}
      </button>
      {expanded && toolCall?.results && (
        <div className="mt-1 ml-3 pl-3 border-l-2 border-slate-200">
          <pre className="bg-slate-50 rounded p-2 text-xs text-slate-600 whitespace-pre-wrap max-h-40 overflow-auto">
            {(() => { try { return JSON.stringify(JSON.parse(toolCall.results), null, 2); } catch { return toolCall.results; } })()}
          </pre>
        </div>
      )}
    </div>
  );
};

export default function MessageBubble({ message }) {
  const isUser = message.role === 'user';

  return (
    <div className={cn('flex gap-3', isUser ? 'justify-end' : 'justify-start')}>
      {!isUser && (
        <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center mt-0.5 shrink-0">
          <div className="h-2 w-2 rounded-full bg-primary" />
        </div>
      )}
      <div className={cn('max-w-[80%]', isUser && 'flex flex-col items-end')}>
        {message.content && (
          <div className={cn(
            'rounded-2xl px-4 py-2.5 text-sm',
            isUser
              ? 'bg-primary text-primary-foreground'
              : 'bg-card border border-border text-foreground'
          )}>
            {isUser ? (
              <p className="leading-relaxed">{message.content}</p>
            ) : (
              <ReactMarkdown
                className="prose prose-sm max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0"
                components={{
                  p: ({ children }) => <p className="my-1 leading-relaxed">{children}</p>,
                  ul: ({ children }) => <ul className="my-1 ml-4 list-disc">{children}</ul>,
                  ol: ({ children }) => <ol className="my-1 ml-4 list-decimal">{children}</ol>,
                  li: ({ children }) => <li className="my-0.5">{children}</li>,
                  strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                }}
              >
                {message.content}
              </ReactMarkdown>
            )}
          </div>
        )}
        {message.tool_calls?.length > 0 && (
          <div className="space-y-1 mt-1">
            {message.tool_calls.map((tc, i) => <ToolCallDisplay key={i} toolCall={tc} />)}
          </div>
        )}
      </div>
    </div>
  );
}