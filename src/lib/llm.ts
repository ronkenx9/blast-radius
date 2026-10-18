// OpenAI-compatible chat completion. Works with Vercel AI Gateway, OpenAI, OpenRouter.
// Keys are read from env only and never logged.
export function llmConfig() {
  const e = process.env;
  if (e.AI_GATEWAY_API_KEY)
    return { key: e.AI_GATEWAY_API_KEY, base: e.LLM_BASE_URL || "https://ai-gateway.vercel.sh/v1", model: e.LLM_MODEL || "openai/gpt-4o-mini", provider: "Vercel AI Gateway" };
  if (e.OPENAI_API_KEY)
    return { key: e.OPENAI_API_KEY, base: e.OPENAI_BASE_URL || e.LLM_BASE_URL || "https://api.openai.com/v1", model: e.LLM_MODEL || "gpt-4o-mini", provider: "OpenAI" };
  if (e.OPENROUTER_API_KEY)
    return { key: e.OPENROUTER_API_KEY, base: e.LLM_BASE_URL || "https://openrouter.ai/api/v1", model: e.LLM_MODEL || "openai/gpt-4o-mini", provider: "OpenRouter" };
  return null;
}

export type LLMResult = { data: unknown | null; error?: string; ms: number };

export async function chatJSON(system: string, user: string): Promise<LLMResult> {
  const c = llmConfig();
  const t0 = Date.now();
  if (!c) return { data: null, error: "no model key", ms: 0 };
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 25000);
  try {
    const r = await fetch(`${c.base}/chat/completions`, {
      method: "POST",
      signal: ctrl.signal,
      headers: { "content-type": "application/json", authorization: `Bearer ${c.key}` },
      body: JSON.stringify({
        model: c.model,
        temperature: 0.2,
        response_format: { type: "json_object" },
        messages: [{ role: "system", content: system }, { role: "user", content: user }],
      }),
    });
    if (!r.ok) return { data: null, error: `${c.provider} HTTP ${r.status}${r.status === 401 ? " (key rejected)" : ""}`, ms: Date.now() - t0 };
    const j = await r.json();
    return { data: JSON.parse(j.choices?.[0]?.message?.content || "null"), ms: Date.now() - t0 };
  } catch (e: any) {
    return { data: null, error: e?.name === "AbortError" ? `${c.provider} timeout` : `${c.provider} error`, ms: Date.now() - t0 };
  } finally {
    clearTimeout(t);
  }
}
