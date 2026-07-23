"use server";

import { revalidatePath } from "next/cache";
import prisma from "../prisma";
import { getCurrentUser } from "../actions";
import { assertOperator, assertMentor, toClientError, ValidationError } from "../authz";
import { parseTable } from "../csv";

export type ImportKind = "students" | "universities" | "documents";

// 取込先テナントの解決。operatorは任意テナント(代行)、通常メンターは自分のアクティブ塾のみ。
async function resolveTargetTenant(
  user: Awaited<ReturnType<typeof getCurrentUser>>,
  targetTenantId?: string
): Promise<string> {
  if (targetTenantId && targetTenantId !== user.tenantId) {
    assertOperator(user);
    const t = await prisma.tenant.findUnique({ where: { id: targetTenantId }, select: { id: true } });
    if (!t) throw new ValidationError("対象の塾が見つかりません");
    return targetTenantId;
  }
  assertMentor(user);
  return user.tenantId;
}

function parseDate(raw: string): Date | null {
  const v = (raw || "").trim();
  if (!v) return null;
  const m = v.match(/^(\d{4})[/\-.](\d{1,2})[/\-.](\d{1,2})$/);
  if (!m) throw new ValidationError(`日付の形式が不正です: 「${v}」（例: 2026/9/7）`);
  // JST基準の当日0時（UTCでは前日15時）。startOfDayJST相当
  const date = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]), -9, 0, 0));
  if (isNaN(date.getTime())) throw new ValidationError(`日付が不正です: 「${v}」`);
  return date;
}

function pushName<T>(map: Map<string, T[]>, key: string, value: T) {
  const arr = map.get(key);
  if (arr) arr.push(value);
  else map.set(key, [value]);
}

export async function runImport(kind: ImportKind, csvText: string, dryRun: boolean, targetTenantId?: string) {
  try {
    const user = await getCurrentUser();
    const tenantId = await resolveTargetTenant(user, targetTenantId);
    const rows = parseTable(csvText);
    if (rows.length === 0) throw new ValidationError("データ行がありません（1行目はヘッダ）");

    const errors: string[] = [];
    let created = 0;

    if (kind === "students") {
      const toCreate: Array<Record<string, unknown>> = [];
      rows.forEach((r, i) => {
        const name = (r["氏名"] || "").trim();
        if (!name) { errors.push(`${i + 2}行目: 氏名が空です`); return; }
        toCreate.push({
          tenantId, name, phase: "ACTIVE", status: "ACTIVE",
          highSchool: r["高校"] || null, grade: r["学年"] || null,
          phone: r["電話"] || null, parentEmail: r["保護者メール"] || null,
          studentEmail: r["生徒メール"] || null
        });
      });
      if (!dryRun) {
        for (const data of toCreate) {
          try { await prisma.studentProfile.create({ data: data as never }); created++; }
          catch { errors.push(`${data.name}: 作成失敗（生徒メール重複の可能性）`); }
        }
        revalidatePath("/");
        if (targetTenantId) revalidatePath(`/admin/tenants/${tenantId}`);
      }
      return { success: true, kind, total: rows.length, valid: toCreate.length, created: dryRun ? 0 : created, errors };
    }

    if (kind === "universities") {
      const students = await prisma.studentProfile.findMany({ where: { tenantId }, select: { id: true, name: true } });
      const byName = new Map<string, string[]>();
      for (const s of students) pushName(byName, s.name.trim(), s.id);
      const toCreate: Array<Record<string, unknown>> = [];
      rows.forEach((r, i) => {
        const sname = (r["生徒氏名"] || "").trim();
        const uni = (r["大学"] || "").trim();
        if (!sname || !uni) { errors.push(`${i + 2}行目: 生徒氏名・大学が必要です`); return; }
        const ids = byName.get(sname);
        if (!ids || ids.length === 0) { errors.push(`${i + 2}行目: 生徒「${sname}」が見つかりません（先に生徒を取込）`); return; }
        if (ids.length > 1) { errors.push(`${i + 2}行目: 同名の生徒が複数（「${sname}」）。手動で登録してください`); return; }
        let applicationDeadline: Date | null = null;
        let mentorSubmissionDueDate: Date | null = null;
        try { applicationDeadline = parseDate(r["出願締切"]); mentorSubmissionDueDate = parseDate(r["塾内提出日"]); }
        catch (e) { errors.push(`${i + 2}行目: ${(e as Error).message}`); return; }
        toCreate.push({
          studentProfileId: ids[0], name: uni, department: r["学部"] || "", method: r["入試方式"] || "総合型選抜",
          applicationDeadline, deadlineType: r["締切区分"] || null, mentorSubmissionDueDate
        });
      });
      if (!dryRun) {
        for (const data of toCreate) { try { await prisma.university.create({ data: data as never }); created++; } catch { errors.push(`${data.name}: 作成失敗`); } }
        revalidatePath("/");
        if (targetTenantId) revalidatePath(`/admin/tenants/${tenantId}`);
      }
      return { success: true, kind, total: rows.length, valid: toCreate.length, created: dryRun ? 0 : created, errors };
    }

    if (kind === "documents") {
      const students = await prisma.studentProfile.findMany({
        where: { tenantId },
        select: { id: true, name: true, universities: { select: { id: true, name: true } } }
      });
      const byName = new Map<string, typeof students>();
      for (const s of students) pushName(byName, s.name.trim(), s);
      const toCreate: Array<Record<string, unknown>> = [];
      rows.forEach((r, i) => {
        const sname = (r["生徒氏名"] || "").trim();
        const type = (r["書類種類"] || "").trim();
        if (!sname || !type) { errors.push(`${i + 2}行目: 生徒氏名・書類種類が必要です`); return; }
        const matches = byName.get(sname);
        if (!matches || matches.length === 0) { errors.push(`${i + 2}行目: 生徒「${sname}」が見つかりません`); return; }
        if (matches.length > 1) { errors.push(`${i + 2}行目: 同名の生徒が複数（「${sname}」）`); return; }
        const student = matches[0];
        const uniName = (r["志望校"] || "").trim();
        let universityId: string | null = null;
        if (uniName) {
          const u = student.universities.find((x) => x.name.trim() === uniName);
          universityId = u?.id ?? null;
          if (!u) errors.push(`${i + 2}行目(警告): 志望校「${uniName}」が未登録のため未紐付けで作成`);
        }
        let dueDate: Date | null = null;
        try { dueDate = parseDate(r["提出期限"]); }
        catch (e) { errors.push(`${i + 2}行目: ${(e as Error).message}`); return; }
        toCreate.push({
          studentProfileId: student.id, universityId,
          title: uniName ? `【${uniName}】${type}` : type,
          type, isInternal: true, status: "DRAFT", dueDate,
          prompt: r["設問"] || null, content: r["本文"] || null
        });
      });
      if (!dryRun) {
        for (const data of toCreate) { try { await prisma.document.create({ data: data as never }); created++; } catch { errors.push(`${data.title}: 作成失敗`); } }
        revalidatePath("/");
        if (targetTenantId) revalidatePath(`/admin/tenants/${tenantId}`);
      }
      return { success: true, kind, total: rows.length, valid: toCreate.length, created: dryRun ? 0 : created, errors };
    }

    throw new ValidationError("不明な取込種別です");
  } catch (error) {
    console.error("Import failed:", error);
    return { success: false, error: toClientError(error, "取込に失敗しました") };
  }
}
