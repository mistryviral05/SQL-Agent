'use client';
import { useChat } from '@ai-sdk/react';
import { useState } from 'react';

function parseMessage(text: string): { thinking: string | null; response: string } {
  const thinkMatch = text.match(/^<think>([\s\S]*?)<\/think>([\s\S]*)$/);
  if (thinkMatch) {
    return {
      thinking: thinkMatch[1].trim(),
      response: thinkMatch[2].trim(),
    };
  }
  // Partial streaming — inside <think> but not closed yet
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
        className="flex items-center gap-2 text-xs text-zinc-500 hover:text-[#bef264] transition-colors mb-1 group"
      >
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          className={`transition-transform ${open ? 'rotate-90' : ''}`}
        >
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
      {isStillThinking ? (
        <StreamingThinkingBlock />
      ) : thinking ? (
        <ThinkingBlock thinking={thinking} />
      ) : null}
      {response && <p className="text-sm text-zinc-100 leading-relaxed whitespace-pre-wrap">{response}</p>}
    </div>
  );
}

export default function Home() {
  const [input, setInput] = useState('');
  const { messages, sendMessage, status } = useChat();
  const isLoading = status === 'streaming' || status === 'submitted';

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
          <div className={`w-2 h-2 rounded-full ${isLoading ? 'bg-[#bef264]' : 'bg-zinc-600'}`}></div>
          <span className="text-xs text-zinc-500">{isLoading ? 'Thinking...' : 'Ready'}</span>
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6 max-w-2xl mx-auto w-full">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-[50vh] gap-4 text-center">
            <div className="w-16 h-16 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center">
              <div className="w-8 h-8 rounded-lg bg-[#bef264]"></div>
            </div>
            <h2 className="text-xl font-semibold text-white">How can I help?</h2>
            <p className="text-zinc-500 text-sm max-w-xs">Ask me anything. I'm here to think through problems with you.</p>
          </div>
        )}

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

        {/* Submitted but not yet streaming */}
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
      </div>

      {/* Input */}
      <div className="sticky bottom-0 bg-black border-t border-zinc-800 px-4 py-4">
        <div className="max-w-2xl mx-auto">
          <form
            onSubmit={e => {
              e.preventDefault();
              if (!input.trim()) return;
              sendMessage({ text: input });
              setInput('');
            }}
          >
            <div className="flex items-end gap-3 bg-zinc-900 border border-zinc-700 rounded-2xl px-4 py-3 focus-within:border-[#bef264]">
              <textarea
                className="flex-1 bg-transparent text-sm text-white placeholder-zinc-500 resize-none outline-none min-h-[24px] max-h-[120px] leading-6"
                value={input}
                placeholder="Message Aura..."
                rows={1}
                onChange={e => {
                  setInput(e.currentTarget.value);
                  e.currentTarget.style.height = 'auto';
                  e.currentTarget.style.height = Math.min(e.currentTarget.scrollHeight, 120) + 'px';
                }}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    if (!input.trim()) return;
                    sendMessage({ text: input });
                    setInput('');
                  }
                }}
              />
              <button
                type="submit"
                disabled={!input.trim() || isLoading}
                className="w-8 h-8 rounded-xl bg-[#bef264] flex items-center justify-center shrink-0 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-[#d4fb7a] transition-colors"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <path d="M2 21l21-9L2 3v7l15 2-15 2v7z" fill="black" />
                </svg>
              </button>
            </div>
            <p className="text-center text-xs text-zinc-600 mt-2">Press Enter to send · Shift+Enter for new line</p>
          </form>
        </div>
      </div>
    </div>
  );
}