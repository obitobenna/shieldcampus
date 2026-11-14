// Minimal client for any OpenAI-compatible chat completions API (Groq, Gemini, OpenRouter, ...).
// Plain fetch, no SDK. Server-side only by convention (it reads the API key); it does not import
// "server-only" so the `npm run translate` script can reuse it.

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export class LlmError extends Error {
  constructor(
    message: string,
    public readonly kind: "not_configured" | "upstream" | "timeout" | "empty",
  ) {
    super(message);
  }
}

interface LlmConfig {
  apiKey: string;
  baseUrl: string;
  model: string;
}

function config(): LlmConfig | null {
  const apiKey = process.env.LLM_API_KEY?.trim();
  if (!apiKey) return null;
  return {
    apiKey,
    baseUrl: (process.env.LLM_BASE_URL?.trim() || "https://api.groq.com/openai/v1").replace(/\/+$/, ""),
    model: process.env.LLM_MODEL?.trim() || "llama-3.3-70b-versatile",
  };
}

export function llmConfigured(): boolean {
  return config() !== null;
}

interface Options {
  maxTokens?: number;
  temperature?: number;
  timeoutMs?: number;
  signal?: AbortSignal;
}

async function request(messages: ChatMessage[], stream: boolean, opts: Options): Promise<Response> {
  const cfg = config();
  if (!cfg) throw new LlmError("LLM_API_KEY is not set.", "not_configured");

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(new LlmError("The AI took too long to respond.", "timeout")), opts.timeoutMs ?? 30_000);
  opts.signal?.addEventListener("abort", () => controller.abort(opts.signal?.reason), { once: true });

  try {
    const res = await fetch(`${cfg.baseUrl}/chat/completions`, {
      method: "POST",
      headers: { Authorization: `Bearer ${cfg.apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: cfg.model,
        messages,
        stream,
        max_tokens: opts.maxTokens ?? 600,
        temperature: opts.temperature ?? 0.4,
      }),
      signal: controller.signal,
    });
    if (!res.ok) {
      const detail = (await res.text().catch(() => "")).slice(0, 300);
      throw new LlmError(`AI provider returned ${res.status}: ${detail}`, "upstream");
    }
    if (!stream) clearTimeout(timer);
    // For streams the timer keeps running as an overall cap and is cleared when the stream ends.
    if (stream && res.body) {
      const reader = res.body.getReader();
      const guarded = new ReadableStream<Uint8Array>({
        async pull(ctrl) {
          try {
            const { done, value } = await reader.read();
            if (done) {
              clearTimeout(timer);
              ctrl.close();
            } else ctrl.enqueue(value);
          } catch (err) {
            clearTimeout(timer);
            ctrl.error(err);
          }
        },
        cancel(reason) {
          clearTimeout(timer);
          return reader.cancel(reason);
        },
      });
      return new Response(guarded, { status: res.status, headers: res.headers });
    }
    return res;
  } catch (err) {
    clearTimeout(timer);
    if (err instanceof LlmError) throw err;
    if (controller.signal.aborted && controller.signal.reason instanceof LlmError) throw controller.signal.reason;
    throw new LlmError(`Could not reach the AI provider: ${err instanceof Error ? err.message : String(err)}`, "upstream");
  }
}

/** Non-streaming completion. Returns the assistant's text. */
export async function complete(messages: ChatMessage[], opts: Options = {}): Promise<string> {
  const res = await request(messages, false, opts);
  const json = (await res.json().catch(() => null)) as { choices?: { message?: { content?: string } }[] } | null;
  const text = json?.choices?.[0]?.message?.content?.trim();
  if (!text) throw new LlmError("The AI returned an empty answer.", "empty");
  return text;
}

/** Streaming completion. Yields text deltas as they arrive (parses OpenAI-style SSE). */
export async function* streamCompletion(messages: ChatMessage[], opts: Options = {}): AsyncGenerator<string> {
  const res = await request(messages, true, opts);
  if (!res.body) throw new LlmError("The AI returned no stream.", "empty");

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let newline: number;
      while ((newline = buffer.indexOf("\n")) !== -1) {
        const line = buffer.slice(0, newline).trim();
        buffer = buffer.slice(newline + 1);
        if (!line.startsWith("data:")) continue;
        const payload = line.slice(5).trim();
        if (payload === "[DONE]") return;
        try {
          const chunk = JSON.parse(payload) as { choices?: { delta?: { content?: string } }[] };
          const delta = chunk.choices?.[0]?.delta?.content;
          if (delta) yield delta;
        } catch {
          // Ignore keep-alive or malformed lines.
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}
