import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useBusiness } from '@/lib/businessContext';
import MessageBubble from '@/components/chat/MessageBubble';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send, Sparkles, Loader2 } from 'lucide-react';

export default function ProductAdvisorChat() {
  const { currentBusiness } = useBusiness();
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [starting, setStarting] = useState(true);
  const bottomRef = useRef(null);
  const convRef = useRef(null);

  useEffect(() => {
    initConversation();
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const initConversation = async () => {
    setStarting(true);
    const conv = await base44.agents.createConversation({
      agent_name: 'product_advisor',
      metadata: { business_id: currentBusiness?.id },
    });
    convRef.current = conv;
    setConversation(conv);
    setMessages(conv.messages || []);

    base44.agents.subscribeToConversation(conv.id, (data) => {
      setMessages([...data.messages]);
    });

    setStarting(false);

    // Seed context silently
    if (currentBusiness) {
      await base44.agents.addMessage(conv, {
        role: 'user',
        content: `[system: business_id=${currentBusiness.id}, business_name="${currentBusiness.name}", vertical=${currentBusiness.vertical}] Hi, I'm looking for something.`,
      });
    }
  };

  const sendMessage = async () => {
    const conv = convRef.current || conversation;
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

  const visibleMessages = messages.filter(m => !m.content?.startsWith('[system:'));

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card px-4 py-3 flex items-center gap-3 shadow-sm">
        <div className="h-9 w-9 rounded-full bg-accent/15 flex items-center justify-center">
          <Sparkles className="h-5 w-5 text-accent" />
        </div>
        <div>
          <p className="font-semibold text-sm">{currentBusiness?.name || 'Product Advisor'}</p>
          <p className="text-xs text-muted-foreground">AI Product &amp; Service Advisor</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
        {starting ? (
          <div className="flex justify-center items-center h-full">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            {visibleMessages.map((msg, i) => (
              <MessageBubble key={i} message={msg} />
            ))}
            <div ref={bottomRef} />
          </>
        )}
      </div>

      {/* Input */}
      <div className="border-t bg-card px-4 py-3 flex gap-2">
        <Input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKey}
          placeholder="Tell me what you're looking for..."
          className="flex-1"
          disabled={starting || sending}
        />
        <Button onClick={sendMessage} disabled={!input.trim() || starting || sending} size="icon">
          {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  );
}