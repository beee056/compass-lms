// 別PJ(lp.p-quest.com)で作成済みの診断ツールへの導線。作り直さず活用する。
// 結果はメール/PDFで返る仕様のため、LMS側では「ツールへのリンク」＋「結果の記録」で連携する。

export interface DiagnosticTool {
  key: string;
  title: string;
  description: string;
  url: string;
  durationNote: string;
}

export const DIAGNOSTIC_TOOLS: DiagnosticTool[] = [
  {
    key: "shinro",
    title: "進路発見チャート",
    description: "興味・強み・価値観から、向いている学部・進路タイプを見つけます。",
    url: "https://lp.p-quest.com/tools/shinro",
    durationNote: "8問・約3分"
  },
  {
    key: "learning-style",
    title: "学習スタイル診断",
    description: "学習効率・コミュニケーション・問題解決の3軸で、自分に合った学び方を知ります。",
    url: "https://lp.p-quest.com/tools/learning-style",
    durationNote: "12問・約5分"
  },
  {
    key: "shindan",
    title: "合格可能性診断",
    description: "志望の明確さ・問いの接続・経験の言語化など5軸で、総合型選抜の準備度を測ります。",
    url: "https://lp.p-quest.com/tools/shindan",
    durationNote: "10問・約5分"
  },
  {
    key: "shinro-map",
    title: "進路探究マップ",
    description: "「問い」から学問分野・学部・職業を探索できる対話的マップです。",
    url: "https://p-quest.com/shinro-map-detail.html",
    durationNote: "自由に探索"
  }
];
