import { getStudents, getCurrentUser, getScheduleData } from "@/lib/actions";
import MentorCommandCenter from "@/components/MentorCommandCenter";
import { redirect } from "next/navigation";

export default async function Dashboard() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/sign-in");
  }

  if (user.role === "STUDENT") {
    redirect("/portal");
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
