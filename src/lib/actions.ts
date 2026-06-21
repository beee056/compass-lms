"use server";

import { auth } from "@clerk/nextjs/server";
import prisma from "./prisma";

// 仮のモックデータ（DB接続前用）
const MOCK_STUDENTS = [
  {
    id: "1",
    name: "山田 太郎",
    universities: ["慶應義塾大学 総合政策学部", "早稲田大学 経済学部"],
    lastUpdated: "2026-01-28",
    initial: "山"
  },
  {
    id: "2",
    name: "佐藤 花子",
    universities: ["明治大学 心理学部", "北里大学 医療衛生学部"],
    lastUpdated: "2026-04-21",
    initial: "佐"
  }
];

export async function getStudents() {
  try {
    // Vercel/Clerk ベストプラクティス: サーバーアクション内で認証状態を検証
    const { userId } = await auth();
    
    // 未認証の場合はエラー（または空配列）
    if (!userId) {
      throw new Error("Unauthorized");
    }

    // まず該当ユーザーを取得し、所属するTenantIDを取得
    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
    });

    // DB上でユーザーが未作成の場合（初期状態）はモックを返す
    if (!user) {
      return MOCK_STUDENTS;
    }

    // TenantIDに基づいて自塾の生徒のみを取得
    const students = await prisma.studentProfile.findMany({
      where: { tenantId: user.tenantId },
      include: {
        universities: true,
      },
      orderBy: {
        updatedAt: 'desc'
      }
    });
    
    if (students.length === 0) return MOCK_STUDENTS;
    
    return students.map(s => ({
      id: s.id,
      name: s.name,
      universities: s.universities.map(u => `${u.name} ${u.department}`),
      lastUpdated: s.updatedAt.toISOString().split('T')[0],
      initial: s.name.charAt(0)
    }));
  } catch (error) {
    console.warn("DB not connected or not authenticated, using mock data");
    return MOCK_STUDENTS;
  }
}

