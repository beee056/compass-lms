// 本番SMTP(.envのSMTP_*)で実際に送信できるかを検証する。
// 使い方: node --experimental-strip-types scripts/verify_smtp_live.mjs <宛先メールアドレス>
import { readFileSync } from "node:fs";
import nodemailer from "nodemailer";

// .env を読み込む（dotenv不使用のため簡易パース。CRLF/LF両対応）
for (const line of readFileSync(".env", "utf8").split(/\r?\n/)) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) process.env[m[1]] = m[2].trim().replace(/^"(.*)"$/, "$1");
}

const to = process.argv[2];
if (!to) {
  console.error("宛先メールアドレスを指定してください");
  process.exit(1);
}

const host = process.env.SMTP_HOST;
const port = Number(process.env.SMTP_PORT || 465);
console.log(`接続先: ${host}:${port} (secure=${port === 465}) / user=${process.env.SMTP_USER}`);

const transporter = nodemailer.createTransport({
  host,
  port,
  secure: port === 465,
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD }
});

// 認証・接続の検証
await transporter.verify();
console.log("✅ SMTP接続・認証OK");

const info = await transporter.sendMail({
  from: process.env.EMAIL_FROM,
  to,
  subject: "【Scholar Compass】メール送信テスト",
  text: "Scholar Compass の認証メール送信テストです。このメールが届いていれば、ログイン時の確認メール・パスワード再設定メールが正常に送信できます。",
  html: '<p>Scholar Compass の認証メール送信テストです。</p><p>このメールが届いていれば、<strong>確認メール・パスワード再設定メール</strong>が正常に送信できます。</p>'
});
console.log("✅ 送信成功 messageId:", info.messageId);
console.log("   accepted:", info.accepted, " rejected:", info.rejected);
