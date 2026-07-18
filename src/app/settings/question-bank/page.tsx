import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, BookOpen } from "lucide-react";
import { getCurrentUser } from "@/lib/actions";
import { getQuestionBankAdminList } from "@/lib/actions/question-bank";
import QuestionBankManager from "@/components/QuestionBankManager";

export const dynamic = "force-dynamic";

export default async function QuestionBankAdminPage() {
  const user = await getCurrentUser();
  if (user.role === "STUDENT") {
    redirect("/portal");
  }

  const { questions } = await getQuestionBankAdminList();

  return (
    <div className="w-full animate-in fade-in duration-500 pb-20">
      <div className="mb-8 flex items-start gap-4">
        <Link
          href="/settings"
          className="mt-1 rounded-full border border-slate-200/60 bg-white p-2.5 text-slate-500 shadow-sm transition-colors hover:bg-slate-50"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="flex items-center gap-3 text-2xl font-bold text-slate-800">
            <BookOpen className="h-6 w-6 text-indigo-600" />
            問題バンク管理
          </h1>
          <p className="mt-2 text-sm font-medium text-slate-500">
            演習問題の承認・編集・アーカイブを行います。共通問題（運営提供）は編集できませんが、コピーして自分の問題として調整できます。
          </p>
        </div>
      </div>

      <QuestionBankManager questions={questions} />
    </div>
  );
}
