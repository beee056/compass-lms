import prisma from "@/lib/prisma";
import CourseBrowser from "@/components/interactive-lms/CourseBrowser";
import { getCurrentUser } from "@/lib/actions";

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
    <div className="bg-slate-50 min-h-[calc(100vh-80px)] p-4 md:p-8">
      <CourseBrowser courses={courses} studentProfileId={studentProfileId} />
    </div>
  );
}
