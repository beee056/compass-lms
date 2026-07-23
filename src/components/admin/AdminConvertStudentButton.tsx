"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "@/lib/toast";
import { Loader2, UserCog } from "lucide-react";
import { adminConvertStudentToMentor } from "@/lib/actions/admin";

// 生徒アカウントをメンターへ転換（卒業生が講師になるケース）。運営者専用。
export default function AdminConvertStudentButton({ userId, name }: { userId: string; name: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handle = () => {
    if (
      !window.confirm(
        `${name} さんをメンターに転換しますか？\n\n・この生徒プロフィールは卒業（アーカイブ）扱いになり、ログインは外れます（学習データは塾に残ります）\n・本人は「未割当メンター」になり、メンター名簿から塾へ割り当てできます`
      )
    ) {
      return;
    }
    startTransition(async () => {
      const res = await adminConvertStudentToMentor(userId);
      if (res.success) {
        toast.success("メンターに転換しました（メンター名簿に表示されます）");
        router.refresh();
      } else {
        toast.error(res.error ?? "転換に失敗しました");
      }
    });
  };

  return (
    <button
      onClick={handle}
      disabled={isPending}
      className="inline-flex items-center gap-1 rounded-md border border-indigo-200 bg-white px-2.5 py-1 text-[11px] font-bold text-indigo-600 transition-colors hover:bg-indigo-50 disabled:opacity-50"
      title="メンターに転換"
    >
      {isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <UserCog className="h-3 w-3" />}
      メンターに転換
    </button>
  );
}
