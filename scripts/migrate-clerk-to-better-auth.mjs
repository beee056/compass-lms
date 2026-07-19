// Clerk → Better Auth 移行の一度きりのデータ整備スクリプト。
//
// 前提: prisma db push でスキーマ（Session/Account/Verification/emailVerified/image/
//       User.tenantId nullable化/Tenant.ownerEmail）を適用済みであること。
//
// やること:
//   1) 既存の各テナントに ownerEmail を記録（そのテナントのMENTORのメール）
//   2) studentProfile.userId を一旦 null に（再登録時にメールで再リンクさせる）
//   3) 旧 User 行（Clerkベース・Better Authクレデンシャルなし）を削除
//      → これによりメール一意制約が空き、同じメールでBetter Auth再登録が可能になる
//
// 実行後、全ユーザーは「同じメールで新規登録（メール確認）」するだけで、
// getCurrentUser のプロビジョニングが ownerEmail / studentEmail に基づき
// 既存ワークスペース・生徒プロフィールへ自動再リンクする。
//
// 使い方: node scripts/migrate-clerk-to-better-auth.mjs [--commit]
//   --commit なしはドライラン（変更しない）。

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const COMMIT = process.argv.includes("--commit");

async function main() {
  const tenants = await prisma.tenant.findMany({
    include: { users: { select: { id: true, email: true, role: true } } }
  });

  const plan = [];
  for (const tenant of tenants) {
    // そのテナントのメンター（複数いる場合は最初の1人）をオーナーとする
    const mentor = tenant.users.find((u) => u.role === "MENTOR") ?? tenant.users[0];
    plan.push({
      tenantId: tenant.id,
      tenantName: tenant.name,
      ownerEmail: mentor?.email ?? null,
      userCount: tenant.users.length
    });
  }

  const totalUsers = await prisma.user.count();
  const linkedProfiles = await prisma.studentProfile.count({ where: { userId: { not: null } } });

  console.log("=== 移行プラン（ドライラン" + (COMMIT ? "ではない・実行します" : "") + "） ===");
  for (const p of plan) {
    console.log(`  tenant「${p.tenantName}」← ownerEmail=${p.ownerEmail ?? "(なし)"} / users=${p.userCount}`);
  }
  console.log(`  studentProfile.userId を null 化: ${linkedProfiles}件`);
  console.log(`  旧User行を削除: ${totalUsers}件`);

  if (!COMMIT) {
    console.log("\n--commit を付けて実行すると上記を適用します。");
    return;
  }

  await prisma.$transaction(async (tx) => {
    for (const p of plan) {
      if (p.ownerEmail) {
        await tx.tenant.update({ where: { id: p.tenantId }, data: { ownerEmail: p.ownerEmail } });
      }
    }
    // FK制約回避のため、先に生徒プロフィールのユーザー紐付けを外す
    await tx.studentProfile.updateMany({ data: { userId: null } });
    // Better Auth 由来の行はまだ無い前提。全User（＝Clerk由来）を削除
    await tx.user.deleteMany({});
  });

  console.log("\n✅ 移行完了。全ユーザーは同じメールで再登録してください。");
}

main()
  .catch((error) => {
    console.error("移行失敗:", error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
