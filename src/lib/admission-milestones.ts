interface AdmissionScheduleUniversity {
  id: string;
  name: string;
  department: string;
  applicationDeadline?: Date | string | null;
  mentorSubmissionDueDate?: Date | string | null;
  deadlineType?: string | null;
}

interface DerivedAdmissionMilestone {
  id: string;
  title: string;
  date: Date;
  status: "TODO";
  type: "出願締切" | "塾内締切";
  universityId: string;
  sourceKind: "ADMISSION";
  sourceKey: string;
  deadlineRule: string | null;
  notes: null;
}

export function buildDerivedAdmissionMilestones(
  universities: AdmissionScheduleUniversity[],
  existingSourceKeys: Iterable<string | null | undefined> = []
): DerivedAdmissionMilestone[] {
  const existingKeys = new Set(Array.from(existingSourceKeys).filter((key): key is string => Boolean(key)));

  return universities.flatMap((university) => {
    const universityLabel = `${university.name} ${university.department}`;
    const milestones: DerivedAdmissionMilestone[] = [];
    const applicationSourceKey = `university:${university.id}:applicationDeadline`;
    const mentorSourceKey = `university:${university.id}:mentorSubmissionDueDate`;

    if (university.applicationDeadline && !existingKeys.has(applicationSourceKey)) {
      milestones.push({
        id: `admission-${university.id}`,
        title: `【${universityLabel}】出願締切`,
        date: new Date(university.applicationDeadline),
        status: "TODO",
        type: "出願締切",
        universityId: university.id,
        sourceKind: "ADMISSION",
        sourceKey: applicationSourceKey,
        deadlineRule: university.deadlineType ?? null,
        notes: null
      });
    }

    if (university.mentorSubmissionDueDate && !existingKeys.has(mentorSourceKey)) {
      milestones.push({
        id: `mentor-submission-${university.id}`,
        title: `【${universityLabel}】講師への書類提出`,
        date: new Date(university.mentorSubmissionDueDate),
        status: "TODO",
        type: "塾内締切",
        universityId: university.id,
        sourceKind: "ADMISSION",
        sourceKey: mentorSourceKey,
        deadlineRule: null,
        notes: null
      });
    }

    return milestones;
  });
}
