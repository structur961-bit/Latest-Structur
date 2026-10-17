import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useBusiness } from '@/lib/businessContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import MessageBubble from '@/components/chat/MessageBubble';
import {
  Sparkles, CalendarCheck, ShoppingBag, ClipboardList,
  Send, Loader2, ArrowLeft, ExternalLink, Zap
} from 'lucide-react';
import { Link } from 'react-router-dom';

const AGENTS = [
  {
    id: 'booking_assistant',
    name: 'Booking Assistant',
    description: 'Helps customers check availability, choose a service, and book appointments or classes.',
    icon: CalendarCheck,
    color: 'bg-purple-50 text-purple-600 border-purple-200',
    iconBg: 'bg-purple-50',
    iconText: 'text-purple-600',
    chatPath: '/book',
    systemSeed: (biz) => `[system context: business_id=${biz.id}, business_name=${biz.name}, vertical=${biz.vertical}] Hello, I'd like to make a booking or registration.`,
    seedFilter: (content) => content?.startsWith('[system context'),
    placeholder: 'Ask about bookings or availability…',
  },
  {
    id: 'product_advisor',
    name: 'Product Advisor',
    description: 'Recommends the best products or services to visitors based on their needs and preferences.',
    icon: ShoppingBag,
    color: 'bg-emerald-50 text-emerald-600 border-emerald-200',
    iconBg: 'bg-emerald-50',
    iconText: 'text-emerald-600',
    chatPath: '/advisor',
    systemSeed: (biz) => `[system: business_id=${biz.id}, business_name="${biz.name}", vertical=${biz.vertical}] Hi, I'm looking for something.`,
    seedFilter: (content) => content?.startsWith('[system:'),
    placeholder: "Tell me what you're looking for…",
  },
  {
    id: 'registration_helper',
    name: 'Registration Helper',
    description: 'Guides visitors through sign-ups, memberships, and programme registrations step by step.',
    icon: ClipboardList,
    color: 'bg-blue-50 text-blue-600 border-blue-200',
    iconBg: 'bg-blue-50',
    iconText: 'text-blue-600',
    chatPath: '/register-help',
    systemSeed: (biz) => `[system: business_id=${biz.id}, business_name="${biz.name}", vertical=${biz.vertical}] Hi, I need help with registration or membership.`,
    seedFilter: (content) => content?.startsWith('[system:'),
    placeholder: 'Ask about registration or membership…',
  },
];

function AgentChat({ agent, onBack }) {
  const { currentBusiness } = useBusiness();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [starting, setStarting] = useState(true);
  const convRef = useRef(null);
  const bottomRef = useRef(null);

  useEffect(() => { initConversation(); }, []);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const initConversation = async () => {
    setStarting(true);
    const conv = await base44.agents.createConversation({
      agent_name: agent.id,
      metadata: { business_id: currentBusiness?.id },
    });
    convRef.current = conv;
    setMessages(conv.messages || []);
    base44.agents.subscribeToConversation(conv.id, (data) => {
      setMessages([...data.messages]);
    });
    setStarting(false);
    if (currentBusiness) {
      await base44.agents.addMessage(conv, { role: 'user', content: agent.systemSeed(currentBusiness) });
    }
  };

  const sendMessage = async () => {
    const conv = convRef.current;
    if (!input.trim() || !conv || sending) return;
    const text = input.trim();
    setInput('');
    setSending(true);
    await base44.agents.addMessage(conv, { role: 'user', content: text });
    setSending(false);
  };

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const visible = messages.filter(m => !agent.seedFilter(m.content));

  return (
    <div className="flex flex-col h-[calc(100vh-160px)] bg-card rounded-xl border border-border overflow-hidden shadow-sm">
      {/* Chat header */}
      <div className="border-b bg-card px-4 py-3 flex items-center gap-3">
        <button onClick={onBack} className="p-1.5 rounded-lg hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className={`h-8 w-8 rounded-lg flex items-center justify-center border ${agent.color}`}>
          <agent.icon className="h-4 w-4" />
        </div>
        <div className="flex-1">
          <p className="font-semibold text-sm">{agent.name}</p>
          <p className="text-xs text-muted-foreground">AI Assistant • Live</p>
        </div>
        <Link to={agent.chatPath} target="_blank" className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
          Full screen <ExternalLink className="h-3 w-3" />
        </Link>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {starting ? (
          <div className="flex justify-center items-center h-full">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            {visible.length === 0 && (
              <div className="flex justify-center items-center h-full text-sm text-muted-foreground">
                Starting conversation…
              </div>
            )}
            {visible.map((msg, i) => <MessageBubble key={i} message={msg} />)}
            <div ref={bottomRef} />
          </>
        )}
      </div>

      {/* Input */}
      <div className="border-t bg-card px-3 py-2.5 flex gap-2">
        <Input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKey}
          placeholder={agent.placeholder}
          className="flex-1 h-8 text-sm"
          disabled={starting || sending}
        />
        <Button onClick={sendMessage} disabled={!input.trim() || starting || sending} size="sm" className="h-8 w-8 p-0">
          {sending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
        </Button>
      </div>
    </div>
  );
}

export default function AIAssistants() {
  const [activeAgent, setActiveAgent] = useState(null);

  if (activeAgent) {
    return (
      <div className="space-y-4">
        <AgentChat agent={activeAgent} onBack={() => setActiveAgent(null)} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Sparkles className="h-6 w-6 text-accent" /> AI Assistants
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Live AI agents powered by your business data — launch any assistant to test it or preview how your customers experience it.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {AGENTS.map((agent) => (
          <Card key={agent.id} className="p-5 hover:shadow-md transition-all group cursor-pointer border-border/60 hover:border-border"
            onClick={() => setActiveAgent(agent)}>
            <div className={`h-10 w-10 rounded-xl flex items-center justify-center border mb-4 ${agent.color}`}>
              <agent.icon className="h-5 w-5" />
            </div>
            <h3 className="font-semibold mb-1">{agent.name}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{agent.description}</p>
            <div className="mt-4 flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Zap className="h-3 w-3 text-accent" />
                <span>Active</span>
              </div>
              <Button size="sm" variant="outline" className="h-7 text-xs gap-1.5 group-hover:border-primary group-hover:text-primary transition-colors">
                Launch <Send className="h-3 w-3" />
              </Button>
            </div>
          </Card>
        ))}
      </div>

      <div className="rounded-xl border border-border bg-muted/30 p-4 text-sm text-muted-foreground flex gap-3">
        <Sparkles className="h-4 w-4 text-accent shrink-0 mt-0.5" />
        <div>
          <strong className="text-foreground">Tip:</strong> These agents are also accessible by your customers via the public chat pages
          (<Link to="/book" className="text-primary hover:underline">/book</Link>,{' '}
          <Link to="/advisor" className="text-primary hover:underline">/advisor</Link>,{' '}
          <Link to="/register-help" className="text-primary hover:underline">/register-help</Link>).
          They read your live product catalogue, services, and business data in real time.
        </div>
      </div>
    </div>
  );
}