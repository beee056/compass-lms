// 認証メール送信(SMTP経路)の実地テスト。
// nodemailer の Ethereal テストアカウント（登録不要・自動発行）へ実際にSMTP送信し、
// 生成されるHTMLメールをプレビューURLで確認できるようにする。
//
// 使い方: node --experimental-strip-types scripts/test_auth_email.mjs
import nodemailer from "nodemailer";

const account = await nodemailer.createTestAccount();

// sendAuthEmail は読み込み時に環境変数を評価するため、import より前に設定する
process.env.SMTP_HOST = account.smtp.host;
process.env.SMTP_PORT = String(account.smtp.port);
process.env.SMTP_USER = account.user;
process.env.SMTP_PASSWORD = account.pass;
process.env.EMAIL_FROM = "Scholar Compass <no-reply@p-quest.com>";
delete process.env.RESEND_API_KEY;

const { sendAuthEmail } = await import("../src/lib/auth-email.ts");

console.log(`テストSMTP: ${account.smtp.host}:${account.smtp.port} (secure=${account.smtp.port === 465})`);

// 実際に送られる2種類のメールを送信して確認する
const cases = [
  {
    to: "student@example.com",
    subject: "【Scholar Compass】メールアドレスの確認",
    heading: "メールアドレスの確認",
    body: "ご登録ありがとうございます。下のボタンからメールアドレスを確認すると、ご利用を開始できます。",
    actionLabel: "メールアドレスを確認する",
    actionUrl: "https://compass.p-quest.com/api/auth/verify-email?token=sample-token"
  },
  {
    to: "mentor@example.com",
    subject: "【Scholar Compass】パスワード再設定のご案内",
    heading: "パスワードの再設定",
    body: "下のボタンからパスワードを再設定してください。心当たりがない場合はこのメールを破棄してください。",
    actionLabel: "パスワードを再設定する",
    actionUrl: "https://compass.p-quest.com/reset-password?token=sample-token"
  }
];

// 送信結果のプレビューURLを得るため、transporterを別途用意して同じHTMLを送る
for (const params of cases) {
  await sendAuthEmail(params);
  console.log(`✅ 送信成功: ${params.subject} -> ${params.to}`);
}

// プレビュー確認用に1通だけ直接送ってURLを表示
const transporter = nodemailer.createTransport({
  host: account.smtp.host,
  port: account.smtp.port,
  secure: account.smtp.port === 465,
  auth: { user: account.user, pass: account.pass }
});
const info = await transporter.sendMail({
  from: process.env.EMAIL_FROM,
  to: "student@example.com",
  subject: cases[0].subject,
  html: "<p>プレビュー確認用</p>"
});
console.log("\nプレビューURL(参考):", nodemailer.getTestMessageUrl(info));
console.log("\n=> SMTP経路でのメール送信が正常に動作することを確認しました。");
