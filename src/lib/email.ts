// GAS経由でのメール送信ユーティリティ

export async function sendEmail(to: string, subject: string, body: string) {
  const webhookUrl = process.env.GAS_WEBHOOK_URL;

  if (!webhookUrl) {
    console.log("----------------------------------------");
    console.log(`[DUMMY EMAIL SENT] To: ${to}`);
    console.log(`[DUMMY EMAIL SENT] Subject: ${subject}`);
    console.log(`[DUMMY EMAIL SENT] Body: \n${body}`);
    console.log("----------------------------------------");
    console.log("※GAS_WEBHOOK_URLが設定されていないためダミー出力しました");
    return true;
  }

  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        to,
        subject,
        body,
      }),
    });

    if (!response.ok) {
      throw new Error(`GAS Webhook returned status ${response.status}`);
    }

    return true;
  } catch (error) {
    console.error("Failed to send email via GAS:", error);
    return false;
  }
}
