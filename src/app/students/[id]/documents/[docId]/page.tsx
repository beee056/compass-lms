import { notFound, redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/actions";
import DocumentEditor from "@/components/DocumentEditor";

export default async function MentorDocumentPage({ params }: { params: { id: string, docId: string } }) {
  const user = await getCurrentUser();
  if (user.role === "STUDENT") {
    redirect("/portal");
  }

  // 自テナントの生徒の書類のみ閲覧可能
  const document = await prisma.document.findFirst({
    where: {
      id: params.docId,
      studentProfileId: params.id,
      studentProfile: { tenantId: user.tenantId }
    }
  });

  if (!document || !document.isInternal) {
    notFound();
  }

  return (
    <div className="px-4 w-full">
      <DocumentEditor document={document} backUrl={`/students/${params.id}`} />
    </div>
  );
}
