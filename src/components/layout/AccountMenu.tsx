"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { LogOut, ChevronDown, User as UserIcon } from "lucide-react";
import { signOut } from "@/lib/auth-client";

// ヘッダー右端のアカウントメニュー（Clerk UserButton の置き換え）
export default function AccountMenu({ name, email }: { name: string; email: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const initial = (name || email || "?").charAt(0).toUpperCase();

  async function handleSignOut() {
    await signOut();
    router.push("/sign-in");
    router.refresh();
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex h-9 items-center gap-1.5 rounded-full border border-slate-200 bg-white pl-1 pr-2 transition-colors hover:bg-slate-50"
        aria-label="アカウントメニュー"
      >
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-600 text-xs font-black text-white">
          {initial}
        </span>
        <ChevronDown className="h-4 w-4 text-slate-400" />
      </button>

      {open && (
        <div className="absolute right-0 top-11 z-50 w-60 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg">
          <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-600 text-xs font-black text-white">
              {initial}
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-bold text-slate-800">{name}</span>
              <span className="block truncate text-xs text-slate-400">{email}</span>
            </span>
          </div>
          <button
            onClick={handleSignOut}
            className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50"
          >
            <LogOut className="h-4 w-4" />
            ログアウト
          </button>
        </div>
      )}
    </div>
  );
}
