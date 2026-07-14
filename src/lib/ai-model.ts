// AI添削・問題生成に使うモデルの選択。
// 環境変数で切り替え可能:
//   AI_PROVIDER = "google"(既定) | "anthropic"
//   AI_MODEL    = プロバイダ固有のモデルID（未指定時は既定値）
// 必要なAPIキー:
//   google    → GOOGLE_GENERATIVE_AI_API_KEY
//   anthropic → ANTHROPIC_API_KEY

import { google } from "@ai-sdk/google";
import { anthropic } from "@ai-sdk/anthropic";

// 既定モデル。gemini-2.5系は非推奨化済みのため3.5系を既定とする
// （2026-06時点でAPIのモデル一覧により gemini-3.5-flash が現行と確認済み。
//   モデル改廃があった場合はコードを変えずに AI_MODEL 環境変数で上書きする）
const DEFAULTS: Record<string, string> = {
  google: "gemini-3.5-flash",
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
