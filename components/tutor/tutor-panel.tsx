"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import ReactMarkdown from "react-markdown";
import { ArrowUp, MessageCircle, RotateCcw, ShieldAlert, Square, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { detectSecret, SECRET_WARNING } from "@/lib/safety";
import { TUTOR_MAX_MESSAGE } from "@/lib/validation/tutor";
import type { TutorHistoryItem } from "@/app/api/tutor/route";

type Lang = "en" | "pcm";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  // local-only notices are never sent back to the AI as history
  local?: "secret" | "error";
  streaming?: boolean;
}

const STREAM_ERROR = "\u0000ERR";

type CopyKey = "title" | "sub" | "placeholder" | "offline" | "empty" | "dropped" | "retry" | "open";

const COPY: Record<Lang, Record<CopyKey, string>> = {
  en: {
    title: "Ask the tutor",
    sub: "AI answers can be wrong. Never type your recovery phrase.",
    placeholder: "Ask about this lesson…",
    offline: "The tutor is offline right now. The lesson and quiz still work normally.",
    empty: "Ask anything about this lesson, in English or Pidgin.",
    dropped: "The connection dropped before the answer finished.",
    retry: "Try again",
    open: "Ask the tutor",
  },
  pcm: {
    title: "Ask the tutor",
    sub: "AI fit make mistake. No ever type your recovery phrase.",
    placeholder: "Ask question about this lesson…",
    offline: "Tutor no dey online now. Lesson and quiz still dey work.",
    empty: "Ask anything about this lesson, for English or Pidgin.",
    dropped: "Network cut before the answer finish.",
    retry: "Try again",
    open: "Ask the tutor",
  },
};

let idCounter = 0;
const newId = () => `m${Date.now().toString(36)}${(idCounter++).toString(36)}`;

export function TutorPanel({
  lessonSlug,
  language,
  available,
  starters,
}: {
  lessonSlug: string | null;
  language: Lang;
  available: boolean;
  starters: string[];
}) {
  const t = COPY[language];
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [lastQuestion, setLastQuestion] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Load this lesson's previous conversation.
  useEffect(() => {
    let cancelled = false;
    fetch(`/api/tutor${lessonSlug ? `?lesson=${encodeURIComponent(lessonSlug)}` : ""}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { items: TutorHistoryItem[] } | null) => {
        if (!cancelled && data?.items?.length) {
          setMessages(data.items.map((m) => ({ id: newId(), role: m.role, content: m.content })));
        }
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [lessonSlug]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages]);

  // Close the mobile sheet with Escape; lock page scroll while it's open.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: globalThis.KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    const mq = window.matchMedia("(max-width: 1023px)");
    const prev = document.body.style.overflow;
    if (mq.matches) document.body.style.overflow = "hidden";
    setTimeout(() => inputRef.current?.focus(), 50);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open]);

  const ask = useCallback(
    async (raw: string) => {
      const question = raw.trim();
      if (!question || busy) return;
      setNotice(null);

      const secret = detectSecret(question);
      if (secret) {
        // Blocked on the device: the text is never sent anywhere.
        setInput("");
        setMessages((m) => [...m, { id: newId(), role: "assistant", content: SECRET_WARNING[language][secret], local: "secret" }]);
        return;
      }

      const history = messages.filter((m) => !m.local && m.content.trim()).map(({ role, content }) => ({ role, content }));
      const userMsg: Message = { id: newId(), role: "user", content: question };
      const replyId = newId();
      setMessages((m) => [...m, userMsg, { id: replyId, role: "assistant", content: "", streaming: true }]);
      setInput("");
      setBusy(true);
      setLastQuestion(question);

      const controller = new AbortController();
      abortRef.current = controller;
      const update = (fn: (msg: Message) => Message) => setMessages((all) => all.map((x) => (x.id === replyId ? fn(x) : x)));

      try {
        const res = await fetch("/api/tutor", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ lessonSlug, language, messages: [...history, { role: "user", content: question }] }),
          signal: controller.signal,
        });
        if (!res.ok || !res.body) {
          const body = (await res.json().catch(() => null)) as { error?: string } | null;
          setMessages((all) => all.filter((x) => x.id !== replyId));
          setNotice(body?.error ?? t.offline);
          return;
        }
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let text = "";
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          text += decoder.decode(value, { stream: true });
          const broke = text.includes(STREAM_ERROR);
          const clean = text.replace(STREAM_ERROR, "");
          update((x) => ({ ...x, content: clean }));
          if (broke) {
            update((x) => ({ ...x, streaming: false, local: clean.trim() ? undefined : "error" }));
            setNotice(t.dropped);
            break;
          }
        }
        if (res.headers.get("X-Tutor-Blocked")) update((x) => ({ ...x, local: "secret" }));
      } catch (err) {
        if ((err as Error).name !== "AbortError") setNotice(t.dropped);
      } finally {
        update((x) => ({ ...x, streaming: false }));
        setMessages((all) => all.filter((x) => !(x.id === replyId && !x.content.trim())));
        setBusy(false);
        abortRef.current = null;
      }
    },
    [busy, language, lessonSlug, messages, t],
  );

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    void ask(input);
  }

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      void ask(input);
    }
  }

  const tooLong = input.length > TUTOR_MAX_MESSAGE;

  return (
    <>
      {/* Mobile launcher */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "fixed bottom-4 right-4 z-30 inline-flex h-12 items-center gap-2 rounded-md bg-brand px-5 font-medium text-white shadow-sm transition-colors duration-150 ease-out hover:bg-brand-hover lg:hidden",
          open && "hidden",
        )}
      >
        <MessageCircle aria-hidden className="h-5 w-5" />
        {t.open}
      </button>

      {/* Mobile backdrop */}
      {open ? <div aria-hidden onClick={() => setOpen(false)} className="fixed inset-0 z-40 bg-ink/40 lg:hidden" /> : null}

      <section
        aria-label={t.title}
        className={cn(
          "flex-col border-line bg-surface",
          // mobile: bottom sheet
          "fixed inset-x-0 bottom-0 z-50 h-[85dvh] rounded-t-lg border-t",
          open ? "flex animate-sheet-in" : "hidden",
          // desktop: sticky side panel
          "lg:sticky lg:top-6 lg:z-auto lg:flex lg:h-[calc(100dvh-48px)] lg:max-h-[780px] lg:animate-none lg:rounded-lg lg:border",
        )}
      >
        <header className="flex items-start justify-between gap-3 border-b border-line px-4 py-3">
          <div>
            <h2 className="flex items-center gap-2 text-base">
              <span aria-hidden className={cn("h-2 w-2 rounded-full", available ? "bg-success" : "bg-ink-muted")} />
              {t.title}
            </h2>
            <p className="mt-0.5 text-xs text-ink-muted">{t.sub}</p>
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="-mr-1 inline-flex h-9 w-9 items-center justify-center rounded-md text-ink-muted hover:bg-ink/5 hover:text-ink lg:hidden"
            aria-label="Close tutor"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto px-4 py-4" aria-live="polite">
          {!available ? (
            <p className="rounded-md border border-dashed border-line p-4 text-sm text-ink-muted">{t.offline}</p>
          ) : messages.length === 0 ? (
            <div>
              <p className="text-sm text-ink-muted">{t.empty}</p>
              <ul className="mt-4 space-y-2">
                {starters.map((s) => (
                  <li key={s}>
                    <button
                      type="button"
                      onClick={() => void ask(s)}
                      className="w-full rounded-md border border-line px-3 py-2.5 text-left text-sm transition-colors duration-150 ease-out hover:border-brand hover:bg-brand-soft"
                    >
                      {s}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            messages.map((m) => <Bubble key={m.id} message={m} />)
          )}
          {notice ? (
            <div className="flex flex-col items-start gap-2 rounded-md border border-warning/30 bg-warning-soft p-3 text-sm">
              <p>{notice}</p>
              {lastQuestion && !busy ? (
                <button
                  type="button"
                  onClick={() => {
                    setMessages((all) => (all[all.length - 1]?.role === "user" ? all.slice(0, -1) : all));
                    void ask(lastQuestion);
                  }}
                  className="inline-flex items-center gap-1.5 font-medium text-brand underline underline-offset-4"
                >
                  <RotateCcw aria-hidden className="h-3.5 w-3.5" />
                  {t.retry}
                </button>
              ) : null}
            </div>
          ) : null}
        </div>

        <form onSubmit={onSubmit} className="border-t border-line p-3">
          <div className="flex items-end gap-2 rounded-md border border-line bg-surface p-1.5 focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/20">
            <label htmlFor="tutor-input" className="sr-only">
              {t.placeholder}
            </label>
            <textarea
              ref={inputRef}
              id="tutor-input"
              rows={1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder={t.placeholder}
              disabled={!available}
              className="max-h-32 min-h-9 flex-1 resize-none bg-transparent px-2 py-1.5 text-base leading-6 outline-none placeholder:text-ink-muted/70 disabled:cursor-not-allowed"
              style={{ fieldSizing: "content" } as React.CSSProperties}
            />
            {busy ? (
              <Button
                type="button"
                size="sm"
                variant="secondary"
                className="h-9 w-9 shrink-0 px-0"
                onClick={() => abortRef.current?.abort()}
                aria-label="Stop answer"
              >
                <Square aria-hidden className="h-3.5 w-3.5" fill="currentColor" />
              </Button>
            ) : (
              <Button
                type="submit"
                size="sm"
                className="h-9 w-9 shrink-0 px-0"
                disabled={!available || !input.trim() || tooLong}
                aria-label="Send question"
              >
                <ArrowUp aria-hidden className="h-4 w-4" />
              </Button>
            )}
          </div>
          {tooLong ? (
            <p className="mt-1.5 text-xs text-danger">
              Keep it under {TUTOR_MAX_MESSAGE} characters ({input.length} now).
            </p>
          ) : null}
        </form>
      </section>
    </>
  );
}

function Bubble({ message }: { message: Message }) {
  if (message.role === "user") {
    return (
      <div className="flex justify-end">
        <p className="max-w-[85%] whitespace-pre-wrap rounded-lg rounded-br-sm bg-brand-soft px-3.5 py-2 text-sm text-ink">{message.content}</p>
      </div>
    );
  }
  if (message.local === "secret") {
    return (
      <div role="alert" className="flex gap-2 rounded-md border border-danger/30 bg-danger-soft p-3 text-sm">
        <ShieldAlert aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-danger" />
        <p>{message.content}</p>
      </div>
    );
  }
  return (
    <div className="text-sm leading-6 text-ink [&_li]:my-0.5 [&_ol]:list-decimal [&_ol]:pl-5 [&_p+p]:mt-2 [&_strong]:font-semibold [&_ul]:list-disc [&_ul]:pl-5">
      {message.content ? (
        <ReactMarkdown
          components={{
            a: ({ children }) => <span className="underline">{children}</span>,
            code: ({ children }) => <code className="break-all rounded-sm bg-paper px-1 font-mono text-[0.85em]">{children}</code>,
          }}
        >
          {message.content}
        </ReactMarkdown>
      ) : null}
      {message.streaming ? (
        <span aria-label="Tutor is typing" className="inline-flex gap-1 align-middle">
          <span className="h-1.5 w-1.5 animate-shimmer rounded-full bg-ink-muted" />
          <span className="h-1.5 w-1.5 animate-shimmer rounded-full bg-ink-muted [animation-delay:150ms]" />
          <span className="h-1.5 w-1.5 animate-shimmer rounded-full bg-ink-muted [animation-delay:300ms]" />
        </span>
      ) : null}
    </div>
  );
}
