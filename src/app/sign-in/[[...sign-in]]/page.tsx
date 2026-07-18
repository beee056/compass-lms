import Link from "next/link";
import { MonitorPlay } from "lucide-react";
import { SignIn } from "@clerk/nextjs";

export default function Page() {
  return (
    <div className="flex min-h-[calc(100vh-100px)] flex-col items-center justify-center gap-6 py-10">
      <SignIn />
      <Link
        href="/demo"
        className="inline-flex items-center gap-2 rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-600 transition-colors hover:border-indigo-300 hover:text-indigo-600"
      >
        <MonitorPlay className="h-4 w-4" />
        ログインせずに公開デモを見る
      </Link>
    </div>
  );
}
