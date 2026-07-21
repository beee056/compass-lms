import { notFound, redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/actions";
import DocumentEditor from "@/components/DocumentEditor";

export default async function StudentDocumentPage({ params }: { params: { docId: string } }) {
  const user = await getCurrentUser();
  if (user.role !== "STUDENT") {
    redirect("/");
  }

  const studentProfile = await prisma.studentProfile.findUnique({
    where: { userId: user.id }
  });

  if (!studentProfile) {
    notFound();
  }

  const document = await prisma.document.findUnique({
    where: { id: params.docId, studentProfileId: studentProfile.id },
    include: { revisions: { orderBy: { revisionNumber: "desc" }, include: { reviews: { orderBy: { createdAt: "desc" } } } } }
  });

  if (!document || !document.isInternal) {
    notFound();
  }

  return (
    <div className="px-4 w-full">
      <DocumentEditor document={document} backUrl={`/portal`} isMentorView={false} />
    </div>
  );
}
