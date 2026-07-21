"use server";

import { revalidatePath } from "next/cache";
import prisma from "../prisma";
import { getCurrentUser } from "../actions";
import { assertMentor, assertStudentAccess, findAuthorizedUniversity, toClientError, ValidationError } from "../authz";
import { startOfDayJST } from "../dates";

const RESOURCE_KINDS = ["募集要項", "出願フォーム", "アドミッション・ポリシー", "学部ページ", "過去問", "その他"];

function validateUrl(value: string): string {
  try {
    const url = new URL(value.trim());
    if (url.protocol !== "https:") throw new Error("HTTPS only");
    return url.toString();
  } catch {
    throw new ValidationError("資料URLは https:// から始まる有効なURLを入力してください");
  }
}

export async function createUniversityResource(input: {
  universityId: string;
  title: string;
  kind: string;
  url: string;
  admissionYear?: string;
  lastVerifiedAt?: string;
  notes?: string;
}) {
  try {
    const user = await getCurrentUser();
    assertMentor(user);
    const university = await findAuthorizedUniversity(user, input.universityId);
    const title = input.title.trim();
    if (!title || title.length > 120) throw new ValidationError("資料名は120字以内で入力してください");
    if (!RESOURCE_KINDS.includes(input.kind)) throw new ValidationError("資料種別が不正です");
    if (input.admissionYear && input.admissionYear.length > 20) throw new ValidationError("年度は20字以内で入力してください");
    if (input.notes && input.notes.length > 1000) throw new ValidationError("メモは1000字以内で入力してください");

    await prisma.universityResource.create({
      data: {
        universityId: university.id,
        title,
        kind: input.kind,
        url: validateUrl(input.url),
        admissionYear: input.admissionYear?.trim() || null,
        lastVerifiedAt: input.lastVerifiedAt ? startOfDayJST(input.lastVerifiedAt) : null,
        notes: input.notes?.trim() || null
      }
    });

    revalidatePath(`/students/${university.studentProfileId}`);
    revalidatePath("/portal");
    return { success: true };
  } catch (error) {
    return { success: false, error: toClientError(error, "資料の登録に失敗しました") };
  }
}

export async function deleteUniversityResource(resourceId: string) {
  try {
    const user = await getCurrentUser();
    assertMentor(user);
    const resource = await prisma.universityResource.findFirst({
      where: { id: resourceId, university: { studentProfile: { tenantId: user.tenantId } } },
      include: { university: { select: { studentProfileId: true } } }
    });
    if (!resource) throw new ValidationError("資料が見つかりません");
    await assertStudentAccess(user, resource.university.studentProfileId);
    await prisma.universityResource.delete({ where: { id: resource.id } });
    revalidatePath(`/students/${resource.university.studentProfileId}`);
    revalidatePath("/portal");
    return { success: true };
  } catch (error) {
    return { success: false, error: toClientError(error, "資料の削除に失敗しました") };
  }
}
