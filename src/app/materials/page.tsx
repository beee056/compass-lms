import prisma from "@/lib/prisma";
import CourseBrowser from "@/components/interactive-lms/CourseBrowser";
import { getCurrentUser } from "@/lib/actions";
import GuidedPracticeLibrary from "@/components/GuidedPracticeLibrary";

export const dynamic = "force-dynamic";
export const maxDuration = 60; // サーバーアクションのタイムアウトを60秒に延長（Vercel用）

export default async function MaterialsPage() {
  const user = await getCurrentUser();
  const studentProfileId = user.studentProfile?.id || "";
  
  const [courses, questionBank] = await Promise.all([
    prisma.course.findMany({
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
    }),
    prisma.questionBank.findMany({
      where: {
        status: "ACTIVE",
        OR: [
          { tenantId: null },
          { tenantId: user.tenantId }
        ]
      },
      take: 400,
      orderBy: [
        { category: "asc" },
        { createdAt: "desc" }
      ],
      select: {
        id: true,
        category: true,
        title: true,
        university: true,
        fieldCategory: true
      }
    })
  ]);

  return (
    <div className="min-h-[calc(100vh-80px)] bg-[#f7f8f4] p-4 md:p-8">
      <GuidedPracticeLibrary
        questions={questionBank}
        practiceHref={user.studentProfile ? "/portal" : null}
      />
      {courses.length > 0 && (
        <div className="mx-auto mt-12 max-w-5xl border-t border-[#d8dee4] pt-10">
          <CourseBrowser courses={courses} studentProfileId={studentProfileId} />
        </div>
      )}
    </div>
  );
}
