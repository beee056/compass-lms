import nodemailer from "nodemailer";
import { Resend } from "resend";

// 認証メールの送信。送信手段は環境変数で自動選択する:
//   1) SMTP_HOST があれば SMTP（ロリポップ等の既存メールアカウント。追加登録・DNS不要）
//   2) RESEND_API_KEY があれば Resend
//   3) どちらも無ければ送信せずURLをログ出力（開発用フォールバック）
const smtpHost = process.env.SMTP_HOST;
const smtpPort = Number(process.env.SMTP_PORT || 465);
const smtpUser = process.env.SMTP_USER;
const smtpPass = process.env.SMTP_PASSWORD;
const resendApiKey = process.env.RESEND_API_KEY;
const emailFrom = process.env.EMAIL_FROM || smtpUser || "no-reply@example.com";

const transporter = smtpHost
  ? nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      // 465はSSL、587はSTARTTLS
      secure: smtpPort === 465,
      auth: smtpUser && smtpPass ? { user: smtpUser, pass: smtpPass } : undefined
    })
  : null;

const resend = !transporter && resendApiKey ? new Resend(resendApiKey) : null;

interface AuthEmailParams {
  to: string;
  subject: string;
  heading: string;
  body: string;
  actionLabel: string;
  actionUrl: string;
}

function renderHtml({ heading, body, actionLabel, actionUrl }: Omit<AuthEmailParams, "to" | "subject">): string {
  return `<!doctype html>
<html lang="ja"><body style="margin:0;background:#f7f8f4;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',sans-serif;">
  <div style="max-width:480px;margin:0 auto;padding:32px 20px;">
    <div style="background:#ffffff;border:1px solid #e2e8f0;border-radius:12px;padding:28px;">
      <div style="font-size:13px;font-weight:800;letter-spacing:0.12em;color:#3346a3;text-transform:uppercase;">Scholar Compass</div>
      <h1 style="margin:12px 0 8px;font-size:20px;color:#17202a;">${heading}</h1>
      <p style="margin:0 0 24px;font-size:14px;line-height:1.8;color:#475569;">${body}</p>
      <a href="${actionUrl}" style="display:inline-block;background:#3346a3;color:#ffffff;font-weight:700;font-size:14px;text-decoration:none;padding:12px 24px;border-radius:8px;">${actionLabel}</a>
      <p style="margin:24px 0 0;font-size:12px;line-height:1.7;color:#94a3b8;">ボタンが押せない場合は、次のURLをブラウザに貼り付けてください:<br>${actionUrl}</p>
    </div>
    <p style="margin:16px 0 0;text-align:center;font-size:12px;color:#94a3b8;">総合型選抜 指導管理 / お問い合わせ: info@p-quest.com</p>
  </div>
</body></html>`;
}

function renderText({ heading, body, actionLabel, actionUrl }: Omit<AuthEmailParams, "to" | "subject">): string {
  return `${heading}\n\n${body}\n\n${actionLabel}:\n${actionUrl}\n\n---\nScholar Compass / お問い合わせ: info@p-quest.com`;
}

export async function sendAuthEmail(params: AuthEmailParams): Promise<void> {
  const html = renderHtml(params);
  const text = renderText(params);

  if (transporter) {
    await transporter.sendMail({
      from: emailFrom,
      to: params.to,
      subject: params.subject,
      html,
      text
    });
    return;
  }

  if (resend) {
    const { error } = await resend.emails.send({
      from: emailFrom,
      to: params.to,
      subject: params.subject,
      html,
      text
    });
    if (error) {
      console.error("[auth-email] Resend送信失敗:", error);
      throw new Error("メールの送信に失敗しました");
    }
    return;
  }

  // 開発環境など未設定時は、リンクをログ出力して手動確認できるようにする
  console.warn(
    `[auth-email] 送信手段が未設定のためスキップ: ${params.subject} -> ${params.to}\n  URL: ${params.actionUrl}`
  );
}
