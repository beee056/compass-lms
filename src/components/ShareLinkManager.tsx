"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "@/lib/toast";
import { Copy, Link2, Loader2, Plus, XCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { createShareLink, revokeShareLink } from "@/lib/actions/share-links";

interface ShareLink {
  id: string;
  token: string;
  expiresAt: string;
  createdAt: string;
}

// 保護者向け閲覧専用リンクの管理カード（メンター専用）
export default function ShareLinkManager({ studentId, links }: { studentId: string; links: ShareLink[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [busyId, setBusyId] = useState<string | null>(null);

  const buildUrl = (token: string) =>
    `${typeof window !== "undefined" ? window.location.origin : ""}/share/${token}`;

  const handleCreate = () => {
    startTransition(async () => {
      const result = await createShareLink(studentId);
      if (result.success && (result as any).token) {
        try {
          await navigator.clipboard.writeText(buildUrl((result as any).token));
          toast.success("リンクを発行し、クリップボードへコピーしました");
        } catch {
          toast.success("リンクを発行しました");
        }
        router.refresh();
      } else {
        toast.error(result.error ?? "リンクの発行に失敗しました");
      }
    });
  };

  const handleCopy = async (token: string) => {
    try {
      await navigator.clipboard.writeText(buildUrl(token));
      toast.success("リンクをコピーしました");
    } catch {
      toast.error("コピーに失敗しました");
    }
  };

  const handleRevoke = (linkId: string) => {
    if (!window.confirm("このリンクを失効しますか？保護者は閲覧できなくなります。")) return;
    setBusyId(linkId);
    startTransition(async () => {
      const result = await revokeShareLink(linkId);
      setBusyId(null);
      if (result.success) {
        toast.success("リンクを失効しました");
        router.refresh();
      } else {
        toast.error(result.error ?? "失効に失敗しました");
      }
    });
  };

  const formatDate = (value: string) =>
    new Date(value).toLocaleDateString("ja-JP", { year: "numeric", month: "short", day: "numeric", timeZone: "Asia/Tokyo" });

  return (
    <Card className="border-slate-200/60 bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="flex items-center gap-2 text-sm font-black text-slate-800">
          <Link2 className="h-4 w-4 text-indigo-500" />
          保護者向け共有リンク
        </h3>
        <button
          type="button"
          onClick={handleCreate}
          disabled={isPending}
          className="inline-flex items-center gap-1.5 rounded-md border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-bold text-indigo-700 transition-colors hover:bg-indigo-100 disabled:opacity-50"
        >
          {isPending && !busyId ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
          発行
        </button>
      </div>
      <p className="mb-3 text-xs font-medium leading-5 text-slate-500">
        ログイン不要の閲覧専用ページ（進捗・スコアの要約のみ。答案や連絡先は含まれません）。有効期限90日・いつでも失効できます。
      </p>
      <ul className="space-y-2">
        {links.length === 0 && (
          <li className="rounded-md border border-dashed border-slate-200 bg-slate-50 p-3 text-center text-xs font-bold text-slate-400">
            有効なリンクはありません
          </li>
        )}
        {links.map((link) => (
          <li key={link.id} className="flex items-center justify-between gap-2 rounded-md border border-slate-100 bg-slate-50/60 px-3 py-2">
            <span className="min-w-0 truncate text-xs font-semibold text-slate-600">
              …/share/{link.token.slice(0, 8)}…
              <span className="ml-2 text-slate-400">期限 {formatDate(link.expiresAt)}</span>
            </span>
            <span className="flex shrink-0 items-center gap-1">
              <button
                type="button"
                onClick={() => handleCopy(link.token)}
                title="リンクをコピー"
                className="rounded-md p-1.5 text-slate-500 transition-colors hover:bg-slate-200"
              >
                <Copy className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => handleRevoke(link.id)}
                disabled={busyId === link.id}
                title="失効する"
                className="rounded-md p-1.5 text-red-400 transition-colors hover:bg-red-50 disabled:opacity-50"
              >
                {busyId === link.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
              </button>
            </span>
          </li>
        ))}
      </ul>
    </Card>
  );
}
