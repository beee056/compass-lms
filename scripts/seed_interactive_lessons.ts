import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log("インタラクティブなカリキュラムデータをシード中...");

  // 既存のデータをリセット
  await prisma.stepAnswer.deleteMany({});
  await prisma.aIFeedback.deleteMany({});
  await prisma.lessonStep.deleteMany({});
  await prisma.lesson.deleteMany({});
  await prisma.course.deleteMany({});

  const course = await prisma.course.create({
    data: {
      title: "総合型選抜・学校推薦型選抜 実践指導カリキュラム",
      description: "「読むだけ」の学習から脱却し、AIと対話しながら自らの志望理由を論理的に構築していく実践的カリキュラムです。",
      order: 1
    }
  });

  const lesson1 = await prisma.lesson.create({
    data: {
      courseId: course.id,
      title: "1. 全体像と文章設計の「7つの要件」",
      content: "文章を書き始める前に、相手を納得させるための「7つの要件」を一つずつ言語化していきましょう。各ステップであなたの考えを入力し、AIからフィードバックを受けてください。",
      order: 1
    }
  });

  await prisma.lessonStep.createMany({
    data: [
      {
        lessonId: lesson1.id,
        title: "STEP 1: 「意見」の言語化",
        description: "提示された「問い」に対し、あなたが導き出した「答え（意見）」を書いてください。単なる一般論の受け売りは排除し、経験に裏打ちされた独自の主張であることが求められます。",
        prompt: "ユーザーの入力が「独自の意見」として成立しているかを厳しくチェックしてください。「一般論」「ありきたりな表現」である場合は論点ズレを指摘し、より具体的な原体験に基づく意見になるようフィードバックを返してください。",
        order: 1,
        isRequired: true
      },
      {
        lessonId: lesson1.id,
        title: "STEP 2: 「望む結果」の定義",
        description: "この文章や面接でのコミュニケーションを通じて、最終的に相手（評価者）から得たい「望む結果」は何ですか？",
        prompt: "ユーザーの入力が、評価者に対して「この学生はポリシーに完全に合致しており入学させるべきだ」という確信を抱かせるような明確なゴール設定になっているか評価してください。",
        order: 2,
        isRequired: true
      },
      {
        lessonId: lesson1.id,
        title: "STEP 3: 「論点」の特定",
        description: "評価者が設定した、あるいはあなたが自ら見出した「核となる問い（論点）」は何ですか？「なぜ他大学ではなく本学なのか？」という視点を含めてください。",
        prompt: "入力された論点が、大学側が求める「核となる問い」からズレていないかを確認してください。他大学との比較視点が欠けている場合は厳しく指摘してください。",
        order: 3,
        isRequired: true
      },
      {
        lessonId: lesson1.id,
        title: "STEP 4: 「読み手」の想定",
        description: "あなたの提出物や発話を評価する対象者（読み手）は誰ですか？彼らの専門性や期待値について書いてください。",
        prompt: "対象を「学部の教授陣（高度な専門家）」と想定できているか確認してください。感情的な訴えではなく、専門知識と論理性が求められることを理解しているか評価してください。",
        order: 4,
        isRequired: true
      },
      {
        lessonId: lesson1.id,
        title: "STEP 5: 「自分の立場」の確立",
        description: "志願者としてのあなたの背景、経験、活動実績に基づく立ち位置を整理してください。",
        prompt: "原体験や探究活動の記録が客観的に整理され、説得力の源泉となっているか評価してください。単なる「熱意」ではなく「事実に基づく立場」になっているかチェックしてください。",
        order: 5,
        isRequired: true
      },
      {
        lessonId: lesson1.id,
        title: "STEP 6: 「論拠」の提示",
        description: "あなたの「意見」を裏付け、相手を納得させるための具体的な根拠や事実（統計データ、先行研究の引用、一次情報など）を提示してください。",
        prompt: "意見を支える強固な「客観的事実・一次情報」が含まれているか厳しく評価してください。論拠なき意見や主観的な思い込みには、データや研究を引用するよう促してください。",
        order: 6,
        isRequired: true
      },
      {
        lessonId: lesson1.id,
        title: "STEP 7: 「根本思想」の深化",
        description: "あなたの価値観の根底にある、揺るぎない信念や哲学（究極的な目標）は何ですか？志望理由と将来像を深く接続してください。",
        prompt: "ユーザーの根本思想が、志望理由および将来のビジョンと一貫しているか（深掘りに強いか）を評価してください。表面的な理由や、大学入学がゴールになっている場合は根本からの再考を促してください。",
        order: 7,
        isRequired: true
      }
    ]
  });

  console.log("初期データのシードが完了しました！");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
