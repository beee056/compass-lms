import prisma from "@/lib/prisma";
import CourseBrowser from "@/components/interactive-lms/CourseBrowser";
import { getCurrentUser } from "@/lib/actions";
import NotebookLmHub from "@/components/NotebookLmHub";

const NOTEBOOK_LM_URL = "https://notebooklm.google.com/notebook/21cc08b9-f621-4264-9c94-271cba9f55cf";

export const dynamic = "force-dynamic";
export const maxDuration = 60; // サーバーアクションのタイムアウトを60秒に延長（Vercel用）

export default async function MaterialsPage() {
  const user = await getCurrentUser();
  const studentProfileId = user.studentProfile?.id || "";
  
  // コース、レッスン、およびステップを取得
  const courses = await prisma.course.findMany({
    orderBy: { order: "asc" },
    include: {
      lessons: {
        orderBy: { order: "asc" },
        include: {
          steps: {
            orderBy: { order: "asc" }
          }
        }
      }
    }
  });

  return (
    <div className="min-h-[calc(100vh-80px)] bg-[#f7f8f4] p-4 md:p-8">
      <NotebookLmHub notebookUrl={NOTEBOOK_LM_URL} />
      {courses.length > 0 && (
        <div className="mx-auto mt-12 max-w-5xl border-t border-[#d8dee4] pt-10">
          <CourseBrowser courses={courses} studentProfileId={studentProfileId} />
        </div>
      )}
    </div>
  );
}
