import { GoogleGenerativeAI } from "@google/generative-ai";

// Vercelなどで設定されている環境変数を使用
const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY || "";

const genAI = new GoogleGenerativeAI(apiKey);

export async function generateAiFeedback(prompt: string, studentAnswer: string) {
  if (!apiKey) {
    throw new Error("Gemini API key is not configured.");
  }

  // 最新の高速・高性能モデル「gemini-3.5-flash」を使用
  const model = genAI.getGenerativeModel({ model: "gemini-3.5-flash" });

  const systemPrompt = `
あなたは総合型選抜・学校推薦型選抜のプロフェッショナルなメンター（指導者）です。
高校生が記述した内容に対して、以下のルールで厳格かつ論理的なフィードバックを行ってください。

【評価基準（プロンプト）】
${prompt}

【フィードバックのルール】
1. 褒めるべき点があれば簡潔に褒めますが、基本的には「論理の飛躍」「要件漏れ」「具体性の欠如」を厳しく指摘してください。
2. 答えを教えるのではなく、生徒に「考えさせる」問いかけを行ってください。
3. フィードバック文は、マークダウンを使わず、プレーンテキストで改行を交えて読みやすく書いてください。
4. 最終的に、この解答の「論理的完成度」を100点満点のスコアで評価してください。

以下のJSONフォーマットのみを出力してください。それ以外のテキストは一切含めないでください。
{
  "content": "フィードバックの文章（段落を分けて読みやすく）",
  "score": 85
}
`;

  const userMessage = `【生徒の解答】\n${studentAnswer}`;

  try {
    const result = await model.generateContent({
      contents: [
        { role: "user", parts: [{ text: systemPrompt }] },
        { role: "user", parts: [{ text: userMessage }] }
      ],
      generationConfig: {
        temperature: 0.2, // より厳格で論理的な出力を期待するため低め
        responseMimeType: "application/json",
      }
    });

    const responseText = result.response.text();
    const parsed = JSON.parse(responseText);
    
    let score = null;
    if (parsed.score !== undefined && parsed.score !== null) {
      const parsedScore = parseInt(String(parsed.score), 10);
      if (!isNaN(parsedScore)) {
        score = parsedScore;
      }
    }
    
    return {
      content: parsed.content || "フィードバックの生成に失敗しました。",
      score: score
    };
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw new Error("AI添削中にエラーが発生しました。");
  }
}
