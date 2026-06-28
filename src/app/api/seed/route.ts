import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const secret = url.searchParams.get("secret");

  if (secret !== "compass-seed-1234") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // 既存のデータをリセット
    await prisma.aIFeedback.deleteMany({});
    await prisma.stepAnswer.deleteMany({});
    await prisma.lessonStep.deleteMany({});
    await prisma.lesson.deleteMany({});
    await prisma.course.deleteMany({});
    await prisma.questionBank.deleteMany({});

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
        content: "【今回のお題】あなたが本学（慶應義塾大学SFC）を志望する理由と、入学後に取り組みたいテーマを800字で記述しなさい。\n\n文章を書き始める前に、相手を納得させるための「7つの要件」を一つずつ言語化していきましょう。各ステップであなたの考えを入力し、AIからフィードバックを受けてください。",
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
          hint: "💡 単なる「〇〇をしたい」という一般論ではなく、「なぜ自分がそれをやるべきなのか」という強い原体験（きっかけ）をセットで書きましょう。",
          placeholder: "私は高校2年時の〇〇ボランティアの経験から、日本の〇〇における地域格差という課題を解決したいと考えるようになりました。そのためには…",
          order: 1,
          isRequired: true
        },
        {
          lessonId: lesson1.id,
          title: "STEP 2: 「望む結果」の定義",
          description: "この文章や面接でのコミュニケーションを通じて、最終的に相手（評価者）から得たい「望む結果」は何ですか？",
          prompt: "ユーザーの入力が、評価者に対して「この学生はポリシーに完全に合致しており入学させるべきだ」という確信を抱かせるような明確なゴール設定になっているか評価してください。",
          hint: "💡 面接官に「この生徒はうちの大学が求めている人材だ」と思わせるために、どのような印象を与えたいか書きましょう。",
          placeholder: "評価者に対し、私が持つ「現場での課題解決力」と「SFCの理念への深い共感」を伝え、他の受験生にはない独自のアプローチを持っている学生であると確信させたいです。",
          order: 2,
          isRequired: true
        },
        {
          lessonId: lesson1.id,
          title: "STEP 3: 「論点」の特定",
          description: "評価者が設定した、あるいはあなたが自ら見出した「核となる問い（論点）」は何ですか？「なぜ他大学ではなく本学なのか？」という視点を含めてください。",
          prompt: "入力された論点が、大学側が求める「核となる問い」からズレていないかを確認してください。他大学との比較視点が欠けている場合は厳しく指摘してください。",
          hint: "💡 自分本位の理由ではなく、「大学側はどんな生徒を求めてこの設問を作ったのか」という相手側の視点を書き出してみましょう。",
          placeholder: "大学側が求めているのは「社会課題を自ら見つけ、テクノロジーを用いて解決できる人材か？」という点です。また、「なぜ他大学の情報学部ではなくSFCなのか」という独自環境への必然性が問われています。",
          order: 3,
          isRequired: true
        },
        {
          lessonId: lesson1.id,
          title: "STEP 4: 「読み手」の想定",
          description: "あなたの提出物や発話を評価する対象者（読み手）は誰ですか？彼らの専門性や期待値について書いてください。",
          prompt: "対象を「学部の教授陣（高度な専門家）」と想定できているか確認してください。感情的な訴えではなく、専門知識と論理性が求められることを理解しているか評価してください。",
          hint: "💡 「どんな人がこの文章を読むのか」を具体的にイメージしましょう。相手の専門知識レベルはどのくらいですか？",
          placeholder: "読み手はSFCの教授陣（テクノロジーや社会科学の専門家）です。彼らは感情的な熱意よりも、課題に対する解像度の高さや論理的思考力、そして「大学の施設・研究室をどう活用するか」という具体性を期待しています。",
          order: 4,
          isRequired: true
        },
        {
          lessonId: lesson1.id,
          title: "STEP 5: 「自分の立場」の確立",
          description: "志願者としてのあなたの背景、経験、活動実績に基づく立ち位置を整理してください。",
          prompt: "原体験や探究活動の記録が客観的に整理され、説得力の源泉となっているか評価してください。単なる「熱意」ではなく「事実に基づく立場」になっているかチェックしてください。",
          hint: "💡 あなたがその意見を主張できる「資格」は何ですか？過去の活動実績や、現在取り組んでいることを客観的に書きましょう。",
          placeholder: "私はこれまでNPO法人〇〇でのインターンを通じ、実際に現場の〇〇問題に直面してきました。また、高校の探究学習において〇〇に関するフィールドワークを行い、市役所へ提言を行った実績があります。",
          order: 5,
          isRequired: true
        },
        {
          lessonId: lesson1.id,
          title: "STEP 6: 「論拠」の提示",
          description: "あなたの「意見」を裏付け、相手を納得させるための具体的な根拠や事実（統計データ、先行研究の引用、一次情報など）を提示してください。",
          prompt: "意見を支える強固な「客観的事実・一次情報」が含まれているか厳しく評価してください。論拠なき意見や主観的な思い込みには、データや研究を引用するよう促してください。",
          hint: "💡 あなたの主張を補強する客観的なデータ、論文、あるいは専門家から聞いた話などを提示しましょう。",
          placeholder: "内閣府の〇〇年度の調査によると、地域格差は過去10年で〇％拡大しています。また、〇〇大学の〇〇教授の論文では「〇〇システムを導入することで〇〇が解決する」と実証されており、私の仮説を裏付けています。",
          order: 6,
          isRequired: true
        },
        {
          lessonId: lesson1.id,
          title: "STEP 7: 「根本思想」の深化",
          description: "あなたの価値観の根底にある、揺るぎない信念や哲学（究極的な目標）は何ですか？志望理由と将来像を深く接続してください。",
          prompt: "ユーザーの根本思想が、志望理由および将来のビジョンと一貫しているか（深掘りに強いか）を評価してください。表面的な理由や、大学入学がゴールになっている場合は根本からの再考を促してください。",
          hint: "💡 最も深いレベルの「あなたの価値観」は何ですか？なぜそこまでしてその課題を解決したいのですか？",
          placeholder: "私の根本思想は「すべての人が生まれた環境に依存せず、公平に〇〇できる社会を創る」ことです。大学進学はあくまでその第一歩であり、将来的には〇〇の領域で起業し、社会システムそのものを変革したいと考えています。",
          order: 7,
          isRequired: true
        }
      ]
    });

    return NextResponse.json({ message: "Interactive curriculum seed completed successfully" });
  } catch (error) {
    console.error("Seed error:", error);
    return NextResponse.json({ error: "Failed to seed database" }, { status: 500 });
  }
}
