'use client';
import { useChat } from '@ai-sdk/react';
import { useState, useRef, useEffect } from 'react';

function parseMessage(text: string): { thinking: string | null; response: string } {
  const thinkMatch = text.match(/^<think>([\s\S]*?)<\/think>([\s\S]*)$/);
  if (thinkMatch) {
    return { thinking: thinkMatch[1].trim(), response: thinkMatch[2].trim() };
  }
  const partialThink = text.match(/^<think>([\s\S]*)$/);
  if (partialThink) {
    return { thinking: partialThink[1].trim(), response: '' };
  }
  return { thinking: null, response: text };
}

function ThinkingBlock({ thinking }: { thinking: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mb-3">
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-2 text-xs text-zinc-500 hover:text-[#bef264] transition-colors mb-1"
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" className={`transition-transform ${open ? 'rotate-90' : ''}`}>
          <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span className="font-medium tracking-widest uppercase text-[10px]">Thinking</span>
        <span className="text-zinc-700 text-[10px]">· {thinking.split(' ').length} words</span>
      </button>
      {open && (
        <div className="border-l-2 border-zinc-700 pl-3 mt-1">
          <p className="text-xs text-zinc-500 leading-relaxed max-h-40 overflow-y-auto">{thinking}</p>
        </div>
      )}
    </div>
  );
}

function StreamingThinkingBlock() {
  return (
    <div className="flex items-center gap-2 text-xs text-zinc-500 mb-2">
      <div className="flex items-center gap-1">
        <div className="w-1.5 h-1.5 rounded-full bg-[#bef264] opacity-40"></div>
        <div className="w-1.5 h-1.5 rounded-full bg-[#bef264] opacity-70"></div>
        <div className="w-1.5 h-1.5 rounded-full bg-[#bef264]"></div>
      </div>
      <span className="uppercase tracking-widest font-medium text-[10px]">Thinking...</span>
    </div>
  );
}

function AssistantMessage({ text }: { text: string }) {
  const { thinking, response } = parseMessage(text);
  const isStillThinking = thinking !== null && response === '';
  return (
    <div>
      {isStillThinking ? <StreamingThinkingBlock /> : thinking ? <ThinkingBlock thinking={thinking} /> : null}
      {response && <p className="text-sm text-zinc-100 leading-relaxed whitespace-pre-wrap">{response}</p>}
    </div>
  );
}

const SUGGESTIONS = [
  'Explain quantum computing simply',
  'Write a Python web scraper',
  'Debug my React component',
  'Plan a 7-day Japan trip',
];

function PromptInput({
  input,
  setInput,
  onSubmit,
  isLoading,
  centered,
}: {
  input: string;
  setInput: (v: string) => void;
  onSubmit: () => void;
  isLoading: boolean;
  centered: boolean;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!input.trim() || isLoading) return;
      onSubmit();
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = Math.min(e.target.scrollHeight, 160) + 'px';
  };

  if (centered) {
    return (
      <div className="w-full max-w-2xl mx-auto px-4">
        {/* Greeting */}
        <div className="mb-8 text-center">
          <div className="flex items-center justify-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-xl bg-[#bef264] flex items-center justify-center">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="4" fill="black" />
              </svg>
            </div>
          </div>
          <h1 className="text-2xl font-semibold text-white tracking-tight mb-1">Good day.</h1>
          <p className="text-zinc-500 text-sm">What's on your mind?</p>
        </div>

        {/* Input card */}
        <div className="bg-zinc-900 border-2 border-zinc-700 rounded-2xl overflow-hidden focus-within:border-[#bef264] transition-colors">
          <textarea
            ref={textareaRef}
            className="w-full bg-transparent text-sm text-white placeholder-zinc-500 resize-none outline-none px-5 pt-4 pb-2 min-h-[56px] max-h-[160px] leading-6"
            value={input}
            placeholder="Ask anything..."
            rows={2}
            onChange={handleChange}
            onKeyDown={handleKey}
          />
          <div className="flex items-center justify-between px-4 pb-3 pt-1">
            <div className="flex items-center gap-1">
              <div className="w-1.5 h-1.5 rounded-full bg-zinc-700"></div>
              <span className="text-[10px] text-zinc-600 tracking-wider uppercase">Shift+Enter for new line</span>
            </div>
            <button
              onClick={onSubmit}
              disabled={!input.trim() || isLoading}
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-[#bef264] text-black text-xs font-semibold disabled:opacity-30 disabled:cursor-not-allowed hover:bg-[#d4fb7a] transition-colors cursor-pointer"
            >
              Send
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                <path d="M2 21l21-9L2 3v7l15 2-15 2v7z" fill="black" />
              </svg>
            </button>
          </div>
        </div>

        {/* Suggestions */}
        <div className="mt-4 flex flex-wrap gap-2 justify-center">
          {SUGGESTIONS.map(s => (
            <button
              key={s}
              onClick={() => setInput(s)}
              className="text-xs text-zinc-500 border-2 border-zinc-800 hover:border-zinc-600 hover:text-zinc-300 rounded-lg px-3 py-1.5 transition-colors bg-zinc-900 cursor-pointer"
            >
              {s}
            </button>
          ))}
        </div>
      </div>
    );
  }

  // Bottom bar mode
  return (
    <div className="sticky bottom-0 bg-black border-t border-zinc-800 px-4 py-3">
      <div className="max-w-2xl mx-auto">
        <div className="bg-zinc-900 border border-zinc-700 rounded-2xl overflow-hidden focus-within:border-[#bef264] transition-colors">
          <textarea
            ref={textareaRef}
            className="w-full bg-transparent text-sm text-white placeholder-zinc-500 resize-none outline-none px-5 pt-3.5 pb-2 min-h-[48px] max-h-[160px] leading-6"
            value={input}
            placeholder="Message Aura..."
            rows={1}
            onChange={handleChange}
            onKeyDown={handleKey}
          />
          <div className="flex items-center justify-between px-4 pb-2.5 pt-1">
            <span className="text-[10px] text-zinc-700 tracking-wider uppercase">Shift+Enter for new line</span>
            <button
              onClick={onSubmit}
              disabled={!input.trim() || isLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#bef264] text-black text-xs font-semibold disabled:opacity-30 disabled:cursor-not-allowed hover:bg-[#d4fb7a] transition-colors"
            >
              Send
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
                <path d="M2 21l21-9L2 3v7l15 2-15 2v7z" fill="black" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  const [input, setInput] = useState('');
  const { messages, sendMessage, status } = useChat();
  const isLoading = status === 'streaming' || status === 'submitted';
  const hasMessages = messages.length > 0;
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (hasMessages) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, hasMessages]);

  const handleSubmit = () => {
    if (!input.trim() || isLoading) return;
    sendMessage({ text: input });
    setInput('');
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      {/* Header */}
      <header className="border-b border-zinc-800 px-6 py-4 flex items-center justify-between sticky top-0 bg-black z-10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#bef264] flex items-center justify-center">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="4" fill="black" />
            </svg>
          </div>
          <span className="font-semibold tracking-tight text-white text-sm">AURA</span>
        </div>
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full transition-colors ${isLoading ? 'bg-[#bef264]' : 'bg-zinc-700'}`}></div>
          <span className="text-xs text-zinc-500">{isLoading ? 'Thinking...' : 'Ready'}</span>
        </div>
      </header>

      {/* Body */}
      {!hasMessages ? (
        /* ── Centered landing with gradient ── */
        <div className="relative flex-1 flex flex-col items-center justify-center py-12 overflow-hidden">
          {/* Gradient blob — top */}
          <div aria-hidden="true" className="absolute inset-x-0 -top-40 -z-10 transform-gpu overflow-hidden blur-3xl sm:-top-80">
            <div
              style={{
                clipPath:
                  'polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)',
              }}
              className="relative left-[calc(50%-11rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 rotate-[30deg] bg-gradient-to-tr from-[#ff80b5] to-[#9089fc] opacity-20 sm:left-[calc(50%-30rem)] sm:w-[72.1875rem]"
            />
          </div>

          {/* Gradient blob — bottom mirror */}
          <div aria-hidden="true" className="absolute inset-x-0 bottom-0 -z-10 transform-gpu overflow-hidden blur-3xl">
            <div
              style={{
                clipPath:
                  'polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)',
              }}
              className="relative left-[calc(50%+3rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 rotate-[210deg] bg-gradient-to-tr from-[#9089fc] to-[#ff80b5] opacity-10 sm:left-[calc(50%+36rem)] sm:w-[72.1875rem]"
            />
          </div>

          <PromptInput
            input={input}
            setInput={setInput}
            onSubmit={handleSubmit}
            isLoading={isLoading}
            centered={true}
          />
        </div>
      ) : (
        /* ── Chat view ── */
        <>
          <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6 max-w-2xl mx-auto w-full">
            {messages.map(message => (
              <div key={message.id} className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {message.role === 'assistant' && (
                  <div className="w-7 h-7 rounded-lg bg-[#bef264] flex items-center justify-center shrink-0 mt-1">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="4" fill="black" />
                    </svg>
                  </div>
                )}
                <div className="max-w-[75%]">
                  {message.role === 'assistant' && (
                    <p className="text-xs text-zinc-500 mb-1 ml-1">Aura</p>
                  )}
                  <div
                    className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                      message.role === 'user'
                        ? 'bg-[#bef264] text-black rounded-tr-sm font-medium'
                        : 'bg-zinc-900 border border-zinc-800 text-zinc-100 rounded-tl-sm'
                    }`}
                  >
                    {message.role === 'assistant' ? (
                      <AssistantMessage
                        text={message.parts.map(p => (p.type === 'text' ? p.text : '')).join('')}
                      />
                    ) : (
                      message.parts.map((part, i) => {
                        if (part.type === 'text') return <span key={i}>{part.text}</span>;
                      })
                    )}
                  </div>
                </div>
                {message.role === 'user' && (
                  <div className="w-7 h-7 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center shrink-0 mt-1">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                      <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z" fill="#bef264" />
                    </svg>
                  </div>
                )}
              </div>
            ))}

            {status === 'submitted' && (
              <div className="flex gap-3 justify-start">
                <div className="w-7 h-7 rounded-lg bg-[#bef264] flex items-center justify-center shrink-0 mt-1">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="4" fill="black" />
                  </svg>
                </div>
                <div className="max-w-[75%]">
                  <p className="text-xs text-zinc-500 mb-1 ml-1">Aura</p>
                  <div className="bg-zinc-900 border border-zinc-800 rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-2">
                    <div className="flex items-center gap-1">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#bef264] opacity-40"></div>
                      <div className="w-1.5 h-1.5 rounded-full bg-[#bef264] opacity-70"></div>
                      <div className="w-1.5 h-1.5 rounded-full bg-[#bef264]"></div>
                    </div>
                    <span className="text-xs text-zinc-500">Thinking</span>
                  </div>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          <PromptInput
            input={input}
            setInput={setInput}
            onSubmit={handleSubmit}
            isLoading={isLoading}
            centered={false}
          />
        </>
      )}
    </div>
  );
}