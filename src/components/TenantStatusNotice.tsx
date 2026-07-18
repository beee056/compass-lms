import { Clock, Ban } from "lucide-react";

// 承認待ち／停止中のワークスペースに表示する案内。機能は一切使えない。
export default function TenantStatusNotice({ status, workspaceName }: { status: string; workspaceName?: string }) {
  const isPending = status === "PENDING";
  const Icon = isPending ? Clock : Ban;

  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4">
      <div className="w-full max-w-lg rounded-lg border border-slate-200 bg-white p-8 text-center shadow-sm">
        <div
          className={`mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full ${
            isPending ? "bg-amber-50 text-amber-600" : "bg-red-50 text-red-500"
          }`}
        >
          <Icon className="h-8 w-8" />
        </div>
        <h1 className="text-xl font-black text-slate-800">
          {isPending ? "ワークスペースは承認待ちです" : "ワークスペースは現在停止中です"}
        </h1>
        <p className="mx-auto mt-3 max-w-md text-sm font-medium leading-7 text-slate-600">
          {isPending ? (
            <>
              {workspaceName ? `「${workspaceName}」の` : "ご登録いただいた"}利用申請を受け付けました。
              運営者の承認後にすべての機能をご利用いただけます。しばらくお待ちください。
            </>
          ) : (
            <>
              このワークスペースは現在ご利用いただけません。
              お心当たりがない場合は運営者（info@p-quest.com）へお問い合わせください。
            </>
          )}
        </p>
        <p className="mt-6 text-xs font-semibold text-slate-400">
          お問い合わせ: info@p-quest.com
        </p>
      </div>
    </div>
  );
}
