// ダミーのメール送信ユーティリティ

export async function sendEmail(to: string, subject: string, body: string) {
  // 実際のシステムでは、ここで Resend や SendGrid などのAPIを呼び出します。
  // 現在はダミー実装としてコンソールに出力します。

  console.log("----------------------------------------");
  console.log(`[EMAIL SENT] To: ${to}`);
  console.log(`[EMAIL SENT] Subject: ${subject}`);
  console.log(`[EMAIL SENT] Body: \n${body}`);
  console.log("----------------------------------------");

  // TODO: 実際のメール送信ロジックを実装する場合は以下のように記述します
  /*
  const resend = new Resend(process.env.RESEND_API_KEY);
  await resend.emails.send({
    from: "Compass LMS <noreply@example.com>",
    to: [to],
    subject: subject,
    text: body
  });
  */
  
  return true;
}
