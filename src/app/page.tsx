import { getStudents, getCurrentUser, getScheduleData } from "@/lib/actions";
import MentorCommandCenter from "@/components/MentorCommandCenter";
import TenantStatusNotice from "@/components/TenantStatusNotice";
import { redirect } from "next/navigation";

export default async function Dashboard() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/sign-in");
  }

  if (user.role === "STUDENT") {
    redirect("/portal");
  }

  // 承認待ち・停止中のワークスペースは、運営者以外は機能を使えない
  const tenantStatus = (user.tenant as { status?: string } | null)?.status;
  if (!user.isOperator && tenantStatus && tenantStatus !== "ACTIVE") {
    return <TenantStatusNotice status={tenantStatus} workspaceName={user.tenant?.name} />;
  }

  const students = await getStudents();
  const { milestones, tasks } = await getScheduleData();

  return (
    <MentorCommandCenter
      students={students}
      tasks={tasks}
      milestones={milestones}
      workspaceName={user.tenant?.name}
    />
  );
}
