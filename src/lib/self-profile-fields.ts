// 自己分析・将来ビジョンの項目定義（通常モジュール。クライアント/サーバー双方でimport可）。

export interface SelfProfileInput {
  passions?: string;
  happyMoments?: string;
  contributions?: string;
  strengths?: string;
  weaknesses?: string;
  values?: string;
  interests?: string;
  turningPoints?: string;
  visionAge20?: string;
  visionAge30?: string;
  visionAge40?: string;
  careerGoal?: string;
  admissionAxis?: string;
  learningStyleResult?: string;
  aptitudeResult?: string;
}

export type SelfProfileField = keyof SelfProfileInput;

// フォーム表示順・ラベル・プレースホルダー・グループ
export const SELF_PROFILE_SECTIONS: Array<{
  group: string;
  fields: Array<{ key: SelfProfileField; label: string; placeholder: string }>;
}> = [
  {
    group: "自己分析",
    fields: [
      { key: "passions", label: "夢中になったこと", placeholder: "時間を忘れて熱中した経験、のめり込んだ活動など" },
      { key: "happyMoments", label: "幸せ・充実を感じた瞬間", placeholder: "どんな時に喜びや達成感を覚えたか" },
      { key: "contributions", label: "人の役に立った経験", placeholder: "誰かに貢献した、感謝された経験" },
      { key: "turningPoints", label: "原体験・転機", placeholder: "今の自分の考え方や進路を形づくった出来事" },
      { key: "strengths", label: "強み・長所", placeholder: "自分の得意なこと、周囲から評価される点" },
      { key: "weaknesses", label: "弱み・課題", placeholder: "苦手なこと、これから伸ばしたい点" },
      { key: "values", label: "大切にしている価値観", placeholder: "判断や行動の軸にしている考え方" },
      { key: "interests", label: "興味・関心のある学問分野", placeholder: "学んでみたい分野、探究したいテーマ" }
    ]
  },
  {
    group: "将来ビジョン",
    fields: [
      { key: "careerGoal", label: "将来就きたい職業・成し遂げたいこと", placeholder: "目指す職業、実現したいこと" },
      { key: "admissionAxis", label: "志望理由の軸（課題意識）", placeholder: "解決したい社会課題、問題意識" },
      { key: "visionAge20", label: "20歳時点の理想", placeholder: "大学での学び・活動の理想像" },
      { key: "visionAge30", label: "30歳時点の理想", placeholder: "仕事・生き方の理想像" },
      { key: "visionAge40", label: "40歳時点の理想", placeholder: "社会での役割・立ち位置の理想像" }
    ]
  },
  {
    group: "診断結果の記録（診断ツールの結果を貼り付け）",
    fields: [
      { key: "aptitudeResult", label: "進路発見チャートの結果", placeholder: "向いている学部・進路タイプなど、診断結果の要点を記録" },
      { key: "learningStyleResult", label: "学習スタイル診断の結果", placeholder: "自分の学び方のタイプ・スコアなど、診断結果の要点を記録" }
    ]
  }
];

export const SELF_PROFILE_KEYS: SelfProfileField[] = SELF_PROFILE_SECTIONS.flatMap((s) => s.fields.map((f) => f.key));

// 生徒の自己分析データを、AI添削のプロンプトに埋め込む文脈テキストへ整形する。
// 志望理由書・面接など「本人の背景」が効く添削でのみ使う。空なら空文字を返す。
export function buildSelfProfileContext(profile: Partial<Record<SelfProfileField, string | null>> | null): string {
  if (!profile) return "";
  const lines = SELF_PROFILE_KEYS
    .map((key) => {
      const value = (profile[key] ?? "").toString().trim();
      return value ? `- ${SELF_PROFILE_AI_LABELS[key]}: ${value}` : null;
    })
    .filter(Boolean);
  if (lines.length === 0) return "";
  return `【この生徒の自己分析・将来ビジョン（本人が事前に記入した背景情報）】
以下は生徒本人が登録した原体験・価値観・将来像です。答案の背景理解と、より具体的で本人に即した改善提案のために参考にしてください。
ただし、答案に書かれていない内容を採点上の加点根拠にしたり、この情報を答案の一部として扱ったりしないこと。あくまで「本人の背景を踏まえた助言」を行うための材料です。
${lines.join("\n")}`;
}

// AI添削の文脈用ラベル（プロンプトに埋め込む見出し）
export const SELF_PROFILE_AI_LABELS: Record<SelfProfileField, string> = {
  passions: "夢中になったこと",
  happyMoments: "幸せを感じた瞬間",
  contributions: "人の役に立った経験",
  turningPoints: "原体験・転機",
  strengths: "強み",
  weaknesses: "弱み・課題",
  values: "価値観",
  interests: "興味のある学問分野",
  careerGoal: "将来の目標",
  admissionAxis: "志望理由の軸・課題意識",
  visionAge20: "20歳時点の理想",
  visionAge30: "30歳時点の理想",
  visionAge40: "40歳時点の理想",
  aptitudeResult: "進路診断の結果（向いている学部・進路タイプ）",
  learningStyleResult: "学習スタイル診断の結果"
};
