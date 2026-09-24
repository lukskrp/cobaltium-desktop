/**
 * Translation tiers.
 *
 * The real dispatcher lives in `tiered.ts` (fast Tailscale Qwen preset →
 * DeepL/Google → LLM), mirroring Android `TieredTranslator`.
 * Re-export the public surface here so `main/ipc.ts` and consumers keep
 * importing `translateText` from this module.
 */
export { translateText } from './tiered'
export { deepLTranslate, googleTranslate } from './external'
export type { FastTranslator } from './tiered'
