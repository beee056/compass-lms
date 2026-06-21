import { Webhook } from 'svix'
import { headers } from 'next/headers'
import { WebhookEvent } from '@clerk/nextjs/server'
import prisma from '@/lib/prisma'

export async function POST(req: Request) {
  // WEBHOOK_SECRETが環境変数に設定されているか確認
  const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET

  if (!WEBHOOK_SECRET) {
    throw new Error('Please add WEBHOOK_SECRET from Clerk Dashboard to .env or .env.local')
  }

  // リクエストヘッダーを取得
  const headerPayload = headers();
  const svix_id = headerPayload.get("svix-id");
  const svix_timestamp = headerPayload.get("svix-timestamp");
  const svix_signature = headerPayload.get("svix-signature");

  // ヘッダーがない場合はエラー
  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response('Error occured -- no svix headers', {
      status: 400
    })
  }

  // Payloadを取得
  const payload = await req.json()
  const body = JSON.stringify(payload);

  // Webhookインスタンスを作成
  const wh = new Webhook(WEBHOOK_SECRET);

  let evt: WebhookEvent

  // 署名を検証
  try {
    evt = wh.verify(body, {
      "svix-id": svix_id,
      "svix-timestamp": svix_timestamp,
      "svix-signature": svix_signature,
    }) as WebhookEvent
  } catch (err) {
    console.error('Error verifying webhook:', err);
    return new Response('Error occured', {
      status: 400
    })
  }

  // イベントタイプに応じて処理
  const eventType = evt.type;

  if (eventType === 'user.created') {
    const { id, email_addresses, first_name, last_name } = evt.data;
    
    const email = email_addresses[0]?.email_address;
    const name = `${last_name || ''} ${first_name || ''}`.trim() || 'No Name';

    try {
      // 1. 新しいテナント（塾）を作成（※現状はユーザー1人につき1テナントとする）
      // 将来的には招待機能などで既存テナントに属するロジックが必要だが、MVPでは新規作成する
      const tenant = await prisma.tenant.create({
        data: {
          name: `${name}の組織`,
        }
      });

      // 2. ユーザーを作成し、生成したテナントに紐付ける
      await prisma.user.create({
        data: {
          clerkId: id,
          tenantId: tenant.id,
          role: "MENTOR",
          name: name,
          email: email || '',
        }
      });

      console.log(`User ${id} and Tenant ${tenant.id} created successfully`);
    } catch (error) {
      console.error('Error creating user/tenant in DB:', error);
      return new Response('Error creating user', { status: 500 });
    }
  }

  return new Response('', { status: 200 })
}
