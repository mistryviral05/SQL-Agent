'use client';
import { useChat } from '@ai-sdk/react';
import { useState, useRef, useEffect, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

function parseMessage(text: string): { thinking: string | null; response: string } {
  const thinkMatch = text.match(/^<think>([\s\S]*?)<\/think>([\s\S]*)$/);
  if (thinkMatch) return { thinking: thinkMatch[1].trim(), response: thinkMatch[2].trim() };
  const partialThink = text.match(/^<think>([\s\S]*)$/);
  if (partialThink) return { thinking: partialThink[1].trim(), response: '' };
  return { thinking: null, response: text };
}

function useStreamingText(fullText: string, isStreaming: boolean) {
  const [displayed, setDisplayed] = useState('');

  const queueRef = useRef('');
  const displayedRef = useRef('');
  const rafRef = useRef<number | null>(null);
  const prevFullRef = useRef('');
  const isRunningRef = useRef(false);

  const drain = useCallback(() => {
    if (queueRef.current.length === 0) {
      isRunningRef.current = false;
      rafRef.current = null;
      return;
    }

    const BATCH = 1;
    const chunk = queueRef.current.slice(0, BATCH);
    queueRef.current = queueRef.current.slice(BATCH);

    displayedRef.current += chunk;
    setDisplayed(displayedRef.current);

    rafRef.current = requestAnimationFrame(drain);
  }, []);

  useEffect(() => {
    if (!isStreaming) {
      // Streaming ended — flush everything instantly
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      queueRef.current = '';
      displayedRef.current = fullText;
      setDisplayed(fullText);
      prevFullRef.current = fullText;
      isRunningRef.current = false;
      return;
    }

    // New message started
    if (fullText.length < prevFullRef.current.length) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      queueRef.current = fullText;
      displayedRef.current = '';
      setDisplayed('');
      prevFullRef.current = fullText;
      isRunningRef.current = false;
    }

    // Append only new tail
    if (fullText.length > prevFullRef.current.length) {
      const newChars = fullText.slice(prevFullRef.current.length);
      queueRef.current += newChars;
      prevFullRef.current = fullText;
    }

    // Kick off drain loop if not already running
    if (!isRunningRef.current && queueRef.current.length > 0) {
      isRunningRef.current = true;
      rafRef.current = requestAnimationFrame(drain);
    }
  }, [fullText, isStreaming, drain]);

  useEffect(() => {
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, []);

  return displayed;
}

function ThinkingBlock({ thinking }: { thinking: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mb-3">
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-2 text-xs text-zinc-500 hover:text-[#bef264] transition-colors mb-1"
      >
        <svg
          width="12" height="12" viewBox="0 0 24 24" fill="none"
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
        <div className="w-1.5 h-1.5 rounded-full bg-[#bef264] opacity-40 animate-pulse" />
        <div className="w-1.5 h-1.5 rounded-full bg-[#bef264] opacity-70 animate-pulse [animation-delay:150ms]" />
        <div className="w-1.5 h-1.5 rounded-full bg-[#bef264] animate-pulse [animation-delay:300ms]" />
      </div>
      <span className="uppercase tracking-widest font-medium text-[10px]">Thinking...</span>
    </div>
  );
}

type ToolInvocationState = 'call' | 'partial-call' | 'result';
interface ToolInvocationPart {
  type: 'tool-invocation';
  toolInvocation: {
    toolName: string;
    toolCallId: string;
    state: ToolInvocationState;
    args?: Record<string, unknown>;
    result?: unknown;
  };
}

function ToolIcon({ name }: { name: string }) {
  const lower = name.toLowerCase();
  if (lower.includes('db') || lower.includes('database') || lower.includes('sql') || lower.includes('query'))
    return (
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
        <ellipse cx="12" cy="5" rx="9" ry="3" stroke="currentColor" strokeWidth="1.8" />
        <path d="M3 5v14c0 1.66 4.03 3 9 3s9-1.34 9-3V5" stroke="currentColor" strokeWidth="1.8" />
        <path d="M3 12c0 1.66 4.03 3 9 3s9-1.34 9-3" stroke="currentColor" strokeWidth="1.8" />
      </svg>
    );
  if (lower.includes('search') || lower.includes('web') || lower.includes('fetch'))
    return (
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
        <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="1.8" />
        <path d="M21 21l-4.35-4.35" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    );
  if (lower.includes('file') || lower.includes('read') || lower.includes('write'))
    return (
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="currentColor" strokeWidth="1.8" />
        <polyline points="14 2 14 8 20 8" stroke="currentColor" strokeWidth="1.8" />
      </svg>
    );
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
      <path
        d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"
        stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"
      />
    </svg>
  );
}

function ToolInvocationBlock({ part }: { part: ToolInvocationPart }) {
  const [open, setOpen] = useState(false);
  const { toolName, state, args, result } = part.toolInvocation;
  const isPending = state === 'call' || state === 'partial-call';
  const isDone = state === 'result';
  const displayName = toolName.replace(/^tool[_-]?/i, '').replace(/[_-]/g, ' ').trim() || toolName;

  return (
    <div className="mb-2">
      <button onClick={() => setOpen(v => !v)} className="flex items-center gap-2 w-full text-left group">
        <div className={`flex items-center justify-center w-5 h-5 rounded-md shrink-0 transition-colors ${isPending ? 'bg-zinc-800 border border-zinc-700' : 'bg-[#bef264]/10 border border-[#bef264]/20'}`}>
          {isPending
            ? <span className="w-2 h-2 rounded-full border border-zinc-500 border-t-[#bef264] animate-spin block" />
            : (
              <svg width="9" height="9" viewBox="0 0 12 12" fill="none">
                <path d="M2 6l3 3 5-5" stroke="#bef264" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
        </div>
        <div className="flex items-center gap-1.5 text-zinc-400 group-hover:text-zinc-200 transition-colors">
          <span className={isPending ? 'text-zinc-500' : 'text-zinc-400'}><ToolIcon name={toolName} /></span>
          <span className="text-[11px] font-medium font-mono tracking-wide capitalize">{displayName}</span>
        </div>
        <span className={`ml-auto text-[9px] uppercase tracking-widest px-2 py-0.5 rounded-full font-medium ${isPending ? 'bg-zinc-800 text-zinc-500' : 'bg-[#bef264]/10 text-[#bef264]'}`}>
          {isPending ? 'running' : 'done'}
        </span>
        <svg
          width="10" height="10" viewBox="0 0 24 24" fill="none"
          className={`shrink-0 transition-transform text-zinc-600 group-hover:text-zinc-400 ${open ? 'rotate-90' : ''}`}
        >
          <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open && (
        <div className="mt-2 ml-7 border border-zinc-800 rounded-lg overflow-hidden">
          {args && Object.keys(args).length > 0 && (
            <div className="border-b border-zinc-800">
              <div className="px-3 py-1.5 bg-zinc-900/60">
                <span className="text-[9px] uppercase tracking-widest text-zinc-600 font-medium">Input</span>
              </div>
              <pre className="text-[11px] text-zinc-400 font-mono leading-relaxed p-3 overflow-x-auto max-h-40 bg-zinc-950/60">
                {JSON.stringify(args, null, 2)}
              </pre>
            </div>
          )}
          {isDone && result !== undefined && (
            <div>
              <div className="px-3 py-1.5 bg-zinc-900/60">
                <span className="text-[9px] uppercase tracking-widest text-[#bef264]/60 font-medium">Output</span>
              </div>
              <pre className="text-[11px] text-zinc-400 font-mono leading-relaxed p-3 overflow-x-auto max-h-48 bg-zinc-950/60">
                {typeof result === 'string' ? result : JSON.stringify(result, null, 2)}
              </pre>
            </div>
          )}
          {isPending && (
            <div className="px-3 py-3 flex items-center gap-2 bg-zinc-950/60">
              <div className="flex gap-1">
                <div className="w-1 h-1 rounded-full bg-zinc-600 animate-bounce [animation-delay:0ms]" />
                <div className="w-1 h-1 rounded-full bg-zinc-600 animate-bounce [animation-delay:150ms]" />
                <div className="w-1 h-1 rounded-full bg-zinc-600 animate-bounce [animation-delay:300ms]" />
              </div>
              <span className="text-[10px] text-zinc-600">Waiting for result...</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function MarkdownContent({ content }: { content: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        p: ({ children }) => <p className="text-sm text-zinc-100 leading-relaxed mb-3 last:mb-0">{children}</p>,
        h1: ({ children }) => <h1 className="text-base font-semibold text-white mb-2 mt-4 first:mt-0">{children}</h1>,
        h2: ({ children }) => <h2 className="text-sm font-semibold text-white mb-2 mt-3 first:mt-0">{children}</h2>,
        h3: ({ children }) => <h3 className="text-sm font-medium text-zinc-200 mb-1.5 mt-3 first:mt-0">{children}</h3>,
        ul: ({ children }) => <ul className="text-sm text-zinc-100 leading-relaxed mb-3 last:mb-0 pl-1 space-y-1 list-none">{children}</ul>,
        ol: ({ children }) => <ol className="text-sm text-zinc-100 leading-relaxed mb-3 last:mb-0 pl-4 space-y-1 list-decimal">{children}</ol>,
        li: ({ children }) => (
          <li className="flex gap-2 items-start">
            <span className="text-[#bef264] mt-[5px] shrink-0 text-[8px]">◆</span>
            <span className="flex-1">{children}</span>
          </li>
        ),
        code: ({ inline, children, ...props }: { inline?: boolean; children?: React.ReactNode }) =>
          inline
            ? <code className="text-[#bef264] bg-zinc-800 rounded px-1.5 py-0.5 text-xs font-mono" {...props}>{children}</code>
            : <code className="block text-xs text-zinc-300 font-mono leading-relaxed" {...props}>{children}</code>,
        pre: ({ children }) => <pre className="bg-zinc-950 border border-zinc-800 rounded-lg p-3 mb-3 overflow-x-auto text-xs font-mono">{children}</pre>,
        blockquote: ({ children }) => <blockquote className="border-l-2 border-[#bef264] pl-3 mb-3 text-zinc-400 italic text-sm">{children}</blockquote>,
        strong: ({ children }) => <strong className="font-semibold text-white">{children}</strong>,
        em: ({ children }) => <em className="italic text-zinc-300">{children}</em>,
        a: ({ href, children }) => (
          <a href={href} target="_blank" rel="noopener noreferrer"
            className="text-[#bef264] underline underline-offset-2 hover:text-[#d4fb7a] transition-colors">
            {children}
          </a>
        ),
        hr: () => <hr className="border-zinc-800 my-3" />,
        table: ({ children }) => (
          <div className="overflow-x-auto mb-3">
            <table className="text-xs text-zinc-300 w-full border-collapse">{children}</table>
          </div>
        ),
        th: ({ children }) => <th className="text-left text-[10px] uppercase tracking-wider text-zinc-500 border-b border-zinc-700 pb-1.5 pr-4 font-medium">{children}</th>,
        td: ({ children }) => <td className="border-b border-zinc-800 py-1.5 pr-4">{children}</td>,
      }}
    >
      {content}
    </ReactMarkdown>
  );
}

function GeneratingBlock() {
  return (
    <div className="space-y-2 py-1">
      <div className="h-2.5 bg-zinc-800 rounded-full w-3/4 animate-pulse" />
      <div className="h-2.5 bg-zinc-800 rounded-full w-1/2 animate-pulse [animation-delay:100ms]" />
      <div className="h-2.5 bg-zinc-800 rounded-full w-2/3 animate-pulse [animation-delay:200ms]" />
    </div>
  );
}

function Cursor() {
  return (
    <span className="inline-block w-[2px] h-[14px] bg-[#bef264] ml-0.5 align-middle animate-[blink_0.8s_ease-in-out_infinite]" />
  );
}

function AssistantMessage({
  text,
  parts,
  isStreaming,
}: {
  text: string;
  parts: unknown[];
  isStreaming?: boolean;
}) {
  const { thinking, response } = parseMessage(text);
  const isStillThinking = thinking !== null && response === '';
  const toolParts = (parts as Array<{ type: string }>).filter(p => p.type === 'tool-invocation');
  const allToolsDone = toolParts.every(
    p => (p as ToolInvocationPart).toolInvocation?.state === 'result'
  );

  // ✅ FIX: only this message's streaming state drives the animation
  const animatedResponse = useStreamingText(response, !!isStreaming);
  const hasText = animatedResponse.trim().length > 0;
  const showSkeleton = isStreaming && allToolsDone && !hasText && !isStillThinking;
  const showCursor = isStreaming && hasText;

  return (
    <div>
      {isStillThinking ? (
        <StreamingThinkingBlock />
      ) : thinking ? (
        <ThinkingBlock thinking={thinking} />
      ) : null}

      {toolParts.length > 0 && (
        <div className="mb-3 space-y-1">
          {toolParts.map((part, i) => (
            <ToolInvocationBlock key={i} part={part as ToolInvocationPart} />
          ))}
        </div>
      )}

      {hasText ? (
        <div className="relative">
          <MarkdownContent content={animatedResponse} />
          {showCursor && <Cursor />}
        </div>
      ) : showSkeleton ? (
        <GeneratingBlock />
      ) : null}
    </div>
  );
}

function SendIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg" width="15" height="15"
      viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <path d="m12 16 4-4-4-4" />
      <path d="M8 12h8" />
    </svg>
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

  const canSend = !!input.trim() && !isLoading;

  if (centered) {
    return (
      <div className="w-full max-w-2xl mx-auto px-4">
        <div className="mb-8 text-center">
          <div className="flex items-center justify-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-xl bg-[#bef264] flex items-center justify-center">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="4" fill="black" />
              </svg>
            </div>
          </div>
          <h1 className="text-2xl font-semibold text-white tracking-tight mb-1">Good day.</h1>
          <p className="text-zinc-500 text-sm">What&apos;s on your mind?</p>
        </div>

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
              <div className="w-1.5 h-1.5 rounded-full bg-zinc-700" />
              <span className="text-[10px] text-zinc-600 tracking-wider uppercase">
                Shift+Enter for new line
              </span>
            </div>
            <button
              onClick={onSubmit}
              disabled={!canSend}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#bef264] text-black text-xs font-semibold disabled:opacity-30 disabled:cursor-not-allowed hover:bg-[#d4fb7a] transition-colors cursor-pointer"
            >
              Send <SendIcon />
            </button>
          </div>
        </div>

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

  return (
    <div className="sticky bottom-0 bg-transparent px-4 py-3">
      <div className="max-w-2xl mx-auto">
        <div className="bg-zinc-900 border-2 border-zinc-700 rounded-2xl overflow-hidden focus-within:border-[#bef264] transition-colors">
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
            <span className="text-[10px] text-zinc-700 tracking-wider uppercase">
              Shift+Enter for new line
            </span>
            <button
              onClick={onSubmit}
              disabled={!canSend}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#bef264] text-black text-xs font-semibold disabled:opacity-30 disabled:cursor-not-allowed hover:bg-[#d4fb7a] transition-colors cursor-pointer"
            >
              Send <SendIcon />
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
    if (hasMessages) bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, hasMessages]);

  const handleSubmit = () => {
    if (!input.trim() || isLoading) return;
    sendMessage({ text: input });
    setInput('');
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      {/* Compact navbar */}
      <header className="border-b border-zinc-800/60 px-4 py-2 flex items-center justify-between sticky top-0 bg-black/95 backdrop-blur-sm z-10">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-[#bef264] flex items-center justify-center">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="4" fill="black" />
            </svg>
          </div>
          <span className="font-semibold tracking-tight text-white text-xs">AURA</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div
            className={`w-1.5 h-1.5 rounded-full transition-colors ${isLoading ? 'bg-[#bef264] animate-pulse' : 'bg-zinc-700'}`}
          />
          <span className="text-[10px] text-zinc-600">{isLoading ? 'Generating...' : 'Ready'}</span>
        </div>
      </header>

      {!hasMessages ? (
        <div className="relative flex-1 flex flex-col items-center justify-center py-12 overflow-hidden">
          {/* Background blobs */}
          <div
            aria-hidden="true"
            className="absolute inset-x-0 -top-40 -z-10 transform-gpu overflow-hidden blur-3xl sm:-top-80"
          >
            <div
              style={{
                clipPath:
                  'polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)',
              }}
              className="relative left-[calc(50%-11rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 rotate-[30deg] bg-gradient-to-tr from-[#ff80b5] to-[#9089fc] opacity-20 sm:left-[calc(50%-30rem)] sm:w-[72.1875rem]"
            />
          </div>
          <div
            aria-hidden="true"
            className="absolute inset-x-0 bottom-0 -z-10 transform-gpu overflow-hidden blur-3xl"
          >
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
        <>
          <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6 max-w-5xl mx-auto w-full">
            {messages.map((message, index) => (  // ✅ FIX: add index
              <div
                key={message.id}
                className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {message.role === 'assistant' && (
                  <div className="w-7 h-7 rounded-lg bg-[#bef264] flex items-center justify-center shrink-0 mt-1">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="4" fill="black" />
                    </svg>
                  </div>
                )}

                <div className={message.role === 'user' ? 'max-w-[70%]' : 'flex-1 min-w-0'}>
                  {message.role === 'assistant' && (
                    <p className="text-xs text-zinc-500 mb-1 ml-1">Aura</p>
                  )}
                  <div
                    className={`rounded-2xl text-sm leading-relaxed ${
                      message.role === 'user'
                        ? 'bg-zinc-700 text-zinc-100 rounded-tr-sm font-medium px-3.5 py-2'
                        : 'bg-zinc-900 border border-zinc-800 text-zinc-100 rounded-tl-sm px-4 py-3'
                    }`}
                  >
                    {message.role === 'assistant' ? (
                      <AssistantMessage
                        text={message.parts.map(p => (p.type === 'text' ? p.text : '')).join('')}
                        parts={message.parts}
                        // ✅ KEY FIX: only the last message gets isStreaming=true
                        isStreaming={isLoading && index === messages.length - 1}
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
                      <path
                        d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"
                        fill="#bef264"
                      />
                    </svg>
                  </div>
                )}
              </div>
            ))}

            {/* Skeleton loader while waiting for first token */}
            {status === 'submitted' && (
              <div className="flex gap-3 justify-start">
                <div className="w-7 h-7 rounded-lg bg-[#bef264] flex items-center justify-center shrink-0 mt-1">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="4" fill="black" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-zinc-500 mb-1 ml-1">Aura</p>
                  <div className="bg-zinc-900 border border-zinc-800 rounded-2xl rounded-tl-sm px-4 py-3">
                    <div className="space-y-2">
                      <div className="h-2.5 bg-zinc-800 rounded-full w-2/3 animate-pulse" />
                      <div className="h-2.5 bg-zinc-800 rounded-full w-1/2 animate-pulse [animation-delay:100ms]" />
                      <div className="h-2.5 bg-zinc-800 rounded-full w-3/5 animate-pulse [animation-delay:200ms]" />
                    </div>
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

      <style>{`
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
      `}</style>
    </div>
  );
}