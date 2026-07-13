'use client';
import { toast } from "@/lib/toast";

import { useState } from 'react';
import { Building, ListTodo } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import TemplateManager from '@/components/TemplateManager';
import { updateTenantSettings } from '@/lib/actions';

export default function SettingsTabs({ tenant, templates }: { tenant: any; templates: any[] }) {
  const [activeTab, setActiveTab] = useState<'profile' | 'templates'>('profile');

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
      <div className="md:col-span-1 space-y-2">
        <button 
          onClick={() => setActiveTab('profile')}
          className={`w-full text-left px-4 py-3 rounded-lg font-bold flex items-center gap-3 transition-colors ${activeTab === 'profile' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50'}`}
        >
          <Building className="h-5 w-5" />
          組織プロフィール
        </button>
        <button 
          onClick={() => setActiveTab('templates')}
          className={`w-full text-left px-4 py-3 rounded-lg font-bold flex items-center gap-3 transition-colors ${activeTab === 'templates' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50'}`}
        >
          <ListTodo className="h-5 w-5" />
          タスクテンプレート
        </button>
      </div>

      <div className="md:col-span-2 space-y-6">
        {activeTab === 'profile' && (
          <Card className="p-6 border-slate-200 shadow-sm bg-white animate-in fade-in">
            <h2 className="text-lg font-bold text-slate-800 mb-6">組織プロフィール</h2>
            <form action={async (formData) => {
              await updateTenantSettings(formData);
              toast.success('保存しました');
            }} className="space-y-4">
              <div>
                <label className="text-sm font-semibold text-slate-700 mb-1 block">塾名 / 組織名</label>
                <Input name="name" defaultValue={tenant?.name || ''} required className="border-slate-200 max-w-md" />
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
        )}

        {activeTab === 'templates' && (
          <div className="animate-in fade-in">
            <TemplateManager initialTemplates={templates} />
          </div>
        )}
      </div>
    </div>
  );
}

