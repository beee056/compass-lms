// AI添削・問題生成に使うモデルの選択。
// 環境変数で切り替え可能:
//   AI_PROVIDER = "google"(既定) | "anthropic"
//   AI_MODEL    = プロバイダ固有のモデルID（未指定時は既定値）
// 必要なAPIキー:
//   google    → GOOGLE_GENERATIVE_AI_API_KEY
//   anthropic → ANTHROPIC_API_KEY

import { google } from "@ai-sdk/google";
import { anthropic } from "@ai-sdk/anthropic";

const DEFAULTS: Record<string, string> = {
  google: "gemini-2.5-flash",
  anthropic: "claude-sonnet-5"
};

export function getAIModel() {
  const provider = (process.env.AI_PROVIDER || "google").toLowerCase();
  const modelId = process.env.AI_MODEL || DEFAULTS[provider] || DEFAULTS.google;
  if (provider === "anthropic") {
    return anthropic(modelId);
  }
  return google(modelId);
}
