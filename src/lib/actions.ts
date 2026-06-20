"use server";

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
    // DB接続を試行
    const students = await prisma.studentProfile.findMany({
      include: {
        user: true,
      },
      orderBy: {
        updatedAt: 'desc'
      }
    });
    
    if (students.length === 0) return MOCK_STUDENTS;
    
    return students.map(s => ({
      id: s.id,
      name: s.user.name || "名称未設定",
      universities: [s.targetUniv], // 本来は複数持たせる設計に拡張可能
      lastUpdated: s.updatedAt.toISOString().split('T')[0],
      initial: (s.user.name || "名").charAt(0)
    }));
  } catch (error) {
    // DB接続エラー時（環境変数が未設定など）はモックを返す
    console.warn("DB not connected, using mock data:", error);
    return MOCK_STUDENTS;
  }
}
