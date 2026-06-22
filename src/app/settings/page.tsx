import { Settings, Users, Building, ShieldCheck, ListTodo } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

import { getTenant, getTemplates } from "@/lib/actions";
import SettingsTabs from "./SettingsTabs";

export default async function SettingsPage() {
  const tenant = await getTenant();
  const templates = await getTemplates();

  return (
    <div className="w-full animate-in fade-in duration-500 pb-20">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
          <Settings className="h-6 w-6 text-indigo-600" />
          組織・アカウント設定
        </h1>
        <p className="text-slate-500 mt-2 text-sm font-medium">所属するテナント（塾）の設定やメンターのアカウント管理を行います。</p>
      </div>

      <SettingsTabs tenant={tenant} templates={templates} />
    </div>
  );
}
