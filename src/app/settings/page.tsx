import { Settings, Users, Building, ShieldCheck, ListTodo } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

import { getTenant, updateTenantSettings, getTemplates } from "@/lib/actions";
import TemplateManager from "@/components/TemplateManager";

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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-1 space-y-2">
          <button className="w-full text-left px-4 py-3 rounded-lg bg-indigo-50 text-indigo-700 font-bold flex items-center gap-3">
            <Building className="h-5 w-5" />
            組織プロフィール
          </button>
          <button className="w-full text-left px-4 py-3 rounded-lg text-slate-600 hover:bg-slate-50 font-semibold transition-colors flex items-center gap-3">
            <ListTodo className="h-5 w-5" />
            タスクテンプレート
          </button>
          <button className="w-full text-left px-4 py-3 rounded-lg text-slate-600 hover:bg-slate-50 font-semibold transition-colors flex items-center gap-3">
            <Users className="h-5 w-5" />
            メンター管理
          </button>
          <button className="w-full text-left px-4 py-3 rounded-lg text-slate-600 hover:bg-slate-50 font-semibold transition-colors flex items-center gap-3">
            <ShieldCheck className="h-5 w-5" />
            セキュリティ・GAS連携
          </button>
        </div>

        <div className="md:col-span-2 space-y-6">
          <Card className="p-6 border-slate-200 shadow-sm bg-white">
            <h2 className="text-lg font-bold text-slate-800 mb-6">組織プロフィール</h2>
            <form action={updateTenantSettings} className="space-y-4">
              <div>
                <label className="text-sm font-semibold text-slate-700 mb-1 block">塾名 / 組織名</label>
                <Input name="name" defaultValue={tenant?.name || ""} required className="border-slate-200 max-w-md" />
              </div>
              <div>
                <label className="text-sm font-semibold text-slate-700 mb-1 block">連携用 Google Drive 親フォルダID</label>
                <Input name="driveId" defaultValue="1A2B3C4D5E6F7G8H9I" disabled className="border-slate-200 max-w-md font-mono text-sm" />
                <p className="text-xs text-slate-500 mt-1">生徒フォルダが自動生成される親フォルダのIDです。（現在は固定）</p>
              </div>
              <Button type="submit" className="mt-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-6">
                保存する
              </Button>
            </form>
          </Card>

          {/* テンプレート管理 */}
          <div id="templates">
            <TemplateManager initialTemplates={templates as any[]} />
          </div>
        </div>
      </div>
    </div>
  );
}
