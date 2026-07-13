import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { sendEmail } from '@/lib/email';
import { startOfTodayJST } from '@/lib/dates';

// Vercel Cron からの呼び出し専用にするためのシークレット
// vercel.json に設定するか、Headersを検証します
// 本格運用時は Authorization Header などで検証してください

export async function GET(request: Request) {
  try {
    const cronSecret = process.env.CRON_SECRET;
    if (!cronSecret) {
      console.error('CRON_SECRET is not configured');
      return new NextResponse('Server misconfiguration', { status: 500 });
    }
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${cronSecret}`) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    // 「今日(JST)の始まり」をUTCの瞬間として算出（共通ユーティリティに統一）
    const todayStartJst = startOfTodayJST();

    // 期日超過(JSTで前日以前が期限)かつ未完了のタスクを取得
    const overdueTasks = await prisma.task.findMany({
      where: {
        completed: false,
        dueDate: {
          lt: todayStartJst
        }
      },
      include: {
        studentProfile: {
          include: {
            user: true,
            tenant: true
          }
        }
      }
    });

    // 生徒ごとにタスクをグループ化
    const userTaskMap = new Map();
    for (const task of overdueTasks) {
      if (!task.studentProfile || !task.studentProfile.user || !task.studentProfile.user.email) continue;
      
      const email = task.studentProfile.user.email;
      if (!userTaskMap.has(email)) {
        userTaskMap.set(email, {
          studentName: task.studentProfile.name,
          tenantName: task.studentProfile.tenant.name,
          tasks: []
        });
      }
      userTaskMap.get(email).tasks.push(task);
    }

    // メール送信
    for (const [email, data] of userTaskMap.entries()) {
      const taskListStr = data.tasks.map((t: any) => `- ${t.title} (期限: ${t.dueDate ? new Date(t.dueDate).toLocaleDateString('ja-JP') : '未定'})`).join('\n');
      
      const subject = `【${data.tenantName}】未完了のタスクがあります`;
      const body = `${data.studentName} さん\n\nお疲れ様です。以下のタスクの期限が超過しています。\n速やかに確認し、完了させてください。\n\n${taskListStr}\n\nCompassにログインして詳細を確認してください。`;
      
      await sendEmail(email, subject, body);
    }

    return NextResponse.json({ success: true, count: userTaskMap.size });
  } catch (error: any) {
    console.error('Failed to run cron job:', error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}

