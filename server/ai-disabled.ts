import OpenAI, { type ClientOptions } from "openai";

export { toFile } from "openai";

/**
 * AI spending is intentionally shut off. All application and maintenance-script
 * clients must use this module. Do not restore provider access without approval.
 * Reject at the transport boundary, including manually triggered SDK endpoints.
 */
export const AI_DISABLED_MESSAGE =
  "AI features are disabled by the site owner to prevent further AI charges.";

export default class DisabledOpenAI extends OpenAI {
  constructor(options: ClientOptions = {}) {
    super({
      ...options,
      apiKey: "ai-disabled",
      baseURL: "https://ai-disabled.invalid/v1",
      maxRetries: 0,
      fetch: async () => {
        throw new Error(AI_DISABLED_MESSAGE);
      },
    });
  }
}
