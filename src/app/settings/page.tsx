import { Settings, Users, Building, ShieldCheck, ListTodo } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser, getTenant, getTemplates } from "@/lib/actions";
import { getTenantInvites } from "@/lib/actions/tenant-invites";
import MentorInviteManager from "@/components/MentorInviteManager";
import SettingsTabs from "./SettingsTabs";

export default async function SettingsPage() {
  // 組織設定はメンター専用
  const user = await getCurrentUser();
  if (user.role === "STUDENT") {
    redirect("/portal");
  }

  const tenant = await getTenant();
  const templates = await getTemplates();
  const { invites, mentors, students, canManageAccess } = await getTenantInvites();

  return (
    <div className="w-full animate-in fade-in duration-500 pb-20">
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
            <Settings className="h-6 w-6 text-indigo-600" />
            組織・アカウント設定
          </h1>
          <p className="text-slate-500 mt-2 text-sm font-medium">所属するテナント（塾）の設定やメンターのアカウント管理を行います。</p>
        </div>
        <a
          href="/settings/question-bank"
          className="inline-flex h-10 items-center gap-2 rounded-md border border-indigo-200 bg-white px-4 text-sm font-bold text-indigo-600 shadow-sm transition-colors hover:bg-indigo-50"
        >
          問題バンク管理
        </a>
      </div>

      <div className="mb-8 grid gap-4">
        <MentorInviteManager invites={invites} mentors={mentors} students={students} canManageAccess={canManageAccess} />
        <Link
          href="/settings/question-bank"
          className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-5 shadow-sm transition-colors hover:border-indigo-300"
        >
          <span>
            <span className="block text-base font-black text-slate-800">問題バンク管理</span>
            <span className="mt-1 block text-sm font-medium text-slate-500">
              演習問題の承認・編集・アーカイブを行います。
            </span>
          </span>
          <span className="text-sm font-bold text-indigo-600">開く →</span>
        </Link>
      </div>

      <SettingsTabs tenant={tenant} templates={templates} />
    </div>
  );
}
