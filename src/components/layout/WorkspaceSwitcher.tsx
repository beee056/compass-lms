"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import { Building2, Check, ChevronDown, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "@/lib/toast";
import { switchTenant } from "@/lib/actions";

interface Membership {
  tenantId: string;
  tenantName: string;
  hasFullTenantAccess: boolean;
  isOwner: boolean;
}

// 複数塾に所属するメンター向けのワークスペース切替。1塾のみなら現在の塾名を表示するだけ。
export default function WorkspaceSwitcher({
  memberships,
  activeTenantId
}: {
  memberships: Membership[];
  activeTenantId: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const ref = useRef<HTMLDivElement>(null);

  const active = memberships.find((m) => m.tenantId === activeTenantId);
  const multi = memberships.length > 1;

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  if (!active) return null;

  const scopeLabel = (m: Membership) =>
    m.isOwner ? "オーナー" : m.hasFullTenantAccess ? "フルアクセス" : "担当生徒のみ";

  const handleSelect = (tenantId: string) => {
    if (tenantId === activeTenantId) {
      setOpen(false);
      return;
    }
    startTransition(async () => {
      const res = await switchTenant(tenantId);
      setOpen(false);
      if (res.success) {
        router.refresh();
      } else {
        toast.error(res.error ?? "切り替えに失敗しました");
      }
    });
  };

  if (!multi) {
    return (
      <div
        className="hidden max-w-[200px] items-center gap-1.5 rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1.5 md:flex"
        title={active.tenantName}
      >
        <Building2 className="h-4 w-4 shrink-0 text-slate-400" />
        <span className="truncate text-xs font-bold text-slate-600">{active.tenantName}</span>
      </div>
    );
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        disabled={isPending}
        className="flex max-w-[180px] items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2.5 py-1.5 transition-colors hover:border-slate-300"
        title={`現在: ${active.tenantName}`}
      >
        {isPending ? (
          <Loader2 className="h-4 w-4 shrink-0 animate-spin text-slate-400" />
        ) : (
          <Building2 className="h-4 w-4 shrink-0 text-slate-400" />
        )}
        <span className="truncate text-xs font-bold text-slate-700">{active.tenantName}</span>
        <ChevronDown className="h-3.5 w-3.5 shrink-0 text-slate-400" />
      </button>
      {open && (
        <div className="absolute right-0 z-50 mt-1 w-64 rounded-lg border border-slate-200 bg-white p-1 shadow-lg">
          <p className="px-2 py-1.5 text-[10px] font-black uppercase tracking-wider text-slate-400">ワークスペースを切替</p>
          {memberships.map((m) => (
            <button
              key={m.tenantId}
              onClick={() => handleSelect(m.tenantId)}
              className="flex w-full items-center justify-between gap-2 rounded-md px-2 py-2 text-left transition-colors hover:bg-slate-50"
            >
              <span className="min-w-0">
                <span className="block truncate text-sm font-bold text-slate-700">{m.tenantName}</span>
                <span className="text-[11px] font-semibold text-slate-400">{scopeLabel(m)}</span>
              </span>
              {m.tenantId === activeTenantId && <Check className="h-4 w-4 shrink-0 text-indigo-600" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
