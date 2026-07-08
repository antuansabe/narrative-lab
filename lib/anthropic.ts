// Extracted from CAS (scoring-matrix-demo) lib/anthropic.ts @ 42cce10, 2026-07-07
import Anthropic from "@anthropic-ai/sdk";

export class AnthropicConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AnthropicConfigError";
  }
}

export type ClaudeCallOptions = {
  model: string;
  systemPrompt: string;
  userMessage: string;
  maxTokens: number;
  temperature?: number;
};

export type ClaudeCallResult = {
  text: string;
  usage: {
    inputTokens: number;
    outputTokens: number;
    cacheReadTokens: number;
    cacheCreationTokens: number;
  };
};

let _client: Anthropic | null = null;

// Deferred until first use so the module can be imported in contexts where
// ANTHROPIC_API_KEY is not present (CI typecheck, test runners, etc.).
function getClient(): Anthropic {
  if (!_client) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new AnthropicConfigError("ANTHROPIC_API_KEY is not set");
    _client = new Anthropic({ apiKey, maxRetries: 0 });
  }
  return _client;
}

function stripCodeFences(raw: string): string {
  const s = raw.trim();
  const match = s.match(/^```[a-zA-Z]*\s*\n?([\s\S]*?)\n?```$/);
  return match ? match[1].trim() : s;
}

export async function callClaudeWithCachedSystem(
  opts: ClaudeCallOptions,
): Promise<ClaudeCallResult> {
  const { model, systemPrompt, userMessage, maxTokens, temperature = 0 } = opts;

  let attempt = 1;
  const maxAttempts = 4;

  while (true) {
    try {
      const response = await getClient().messages.create({
        model,
        max_tokens: maxTokens,
        temperature,
        system: [
          {
            type: "text",
            text: systemPrompt,
            cache_control: { type: "ephemeral" },
          },
        ],
        messages: [{ role: "user", content: userMessage }],
      });

      const first = response.content[0];
      if (!first || first.type !== "text") {
        throw new Error("The model response contains no text.");
      }

      return {
        text: stripCodeFences(first.text),
        usage: {
          inputTokens: response.usage.input_tokens,
          outputTokens: response.usage.output_tokens,
          cacheReadTokens: response.usage.cache_read_input_tokens ?? 0,
          cacheCreationTokens: response.usage.cache_creation_input_tokens ?? 0,
        },
      };
    } catch (err: any) {
      const status = err?.status || err?.statusCode;
      const isRetryable =
          !status || // Network/Fetch/Timeout error
          status === 429 || // Rate Limit
          status === 529 || // Overloaded
          (status >= 500 && status <= 504); // Generic Server Errors

      if (isRetryable && attempt < maxAttempts) {
        // base delay: 2^attempt * 1000 (2s, 4s, 8s)
        const baseDelay = Math.pow(2, attempt) * 1000;
        // jitter: +/- 25% (between 0.75 and 1.25)
        const jitter = 0.75 + Math.random() * 0.5;
        const delay = Math.round(baseDelay * jitter);

        const errorType = status ? `status ${status}` : "network error";
        console.warn(
            `[anthropic] Anthropic call failed (${errorType}), retrying in ${(delay / 1000).toFixed(1)}s (attempt ${attempt}/${maxAttempts - 1})...`
        );

        await new Promise((resolve) => setTimeout(resolve, delay));
        attempt++;
      } else {
        throw err;
      }
    }
  }
}
