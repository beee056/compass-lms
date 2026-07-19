import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import prisma from "./prisma";
import { sendAuthEmail } from "./auth-email";

// Better Auth サーバー設定。
// - email/password 認証（サインアップ時はメール確認必須）
// - Prisma(Postgres/Neon)アダプタ。user/session/account/verification を既存スキーマにマップ
// - メール送信は Resend 経由（auth-email.ts）
export const auth = betterAuth({
  appName: "Scholar Compass",
  baseURL: process.env.BETTER_AUTH_URL,
  secret: process.env.BETTER_AUTH_SECRET,
  database: prismaAdapter(prisma, { provider: "postgresql" }),

  emailAndPassword: {
    enabled: true,
    // サインアップ時のメール確認を必須にする（なりすまし登録防止）
    requireEmailVerification: true,
    minPasswordLength: 8,
    sendResetPassword: async ({ user, url }) => {
      await sendAuthEmail({
        to: user.email,
        subject: "【Scholar Compass】パスワード再設定のご案内",
        heading: "パスワードの再設定",
        body: "下のボタンからパスワードを再設定してください。心当たりがない場合はこのメールを破棄してください。",
        actionLabel: "パスワードを再設定する",
        actionUrl: url
      });
    }
  },

  emailVerification: {
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
    sendVerificationEmail: async ({ user, url }) => {
      await sendAuthEmail({
        to: user.email,
        subject: "【Scholar Compass】メールアドレスの確認",
        heading: "メールアドレスの確認",
        body: "ご登録ありがとうございます。下のボタンからメールアドレスを確認すると、ご利用を開始できます。",
        actionLabel: "メールアドレスを確認する",
        actionUrl: url
      });
    }
  },

  // クッキーセッション。7日で失効、1日ごとに更新
  session: {
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24
  },

  // 追加フィールドはProviderが管理しないので、既定値をDB側(schema)で持たせる
  user: {
    additionalFields: {
      role: { type: "string", required: false, defaultValue: "MENTOR", input: false },
      isOperator: { type: "boolean", required: false, defaultValue: false, input: false },
      tenantId: { type: "string", required: false, input: false }
    }
  }
});
