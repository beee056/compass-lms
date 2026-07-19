import { Resend } from "resend";

// Resend 経由の認証メール送信。RESEND_API_KEY 未設定時はエラーにせずログのみ（開発時の利便のため）。
const resendApiKey = process.env.RESEND_API_KEY;
const emailFrom = process.env.EMAIL_FROM || "Scholar Compass <no-reply@p-quest.com>";

const resend = resendApiKey ? new Resend(resendApiKey) : null;

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

export async function sendAuthEmail(params: AuthEmailParams): Promise<void> {
  const html = renderHtml(params);
  if (!resend) {
    // 開発環境などRESEND未設定時は、リンクをログ出力して手動確認できるようにする
    console.warn(`[auth-email] RESEND_API_KEY未設定のため送信をスキップ: ${params.subject} -> ${params.to}\n  URL: ${params.actionUrl}`);
    return;
  }
  const { error } = await resend.emails.send({
    from: emailFrom,
    to: params.to,
    subject: params.subject,
    html
  });
  if (error) {
    console.error("[auth-email] 送信失敗:", error);
    throw new Error("メールの送信に失敗しました");
  }
}
