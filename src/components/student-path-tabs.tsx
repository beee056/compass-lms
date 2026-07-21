import Link from "next/link";
import { LayoutGrid, School } from "lucide-react";

interface UniversityTab {
  id: string;
  name: string;
  department: string;
}

interface StudentPathTabsProps {
  basePath: string;
  universities: UniversityTab[];
  selectedUniversityId: string | null;
}

export function StudentPathTabs({ basePath, universities, selectedUniversityId }: StudentPathTabsProps) {
  const tabs = [
    { id: null, label: "全体", icon: LayoutGrid },
    ...universities.map((university) => ({
      id: university.id,
      label: `${university.name} ${university.department}`,
      icon: School
    }))
  ];

  return (
    <nav aria-label="進路別表示" className="mb-8 border-b border-slate-200">
      <div className="flex gap-1 overflow-x-auto pb-px [scrollbar-width:thin]">
        {tabs.map((tab) => {
          const isSelected = tab.id === selectedUniversityId;
          const href = tab.id ? `${basePath}?university=${encodeURIComponent(tab.id)}` : basePath;
          const Icon = tab.icon;
          return (
            <Link
              key={tab.id ?? "all"}
              href={href}
              aria-current={isSelected ? "page" : undefined}
              className={`group relative inline-flex shrink-0 items-center gap-2 whitespace-nowrap px-4 py-3 text-sm font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 ${
                isSelected ? "text-indigo-700" : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <Icon className={`h-4 w-4 ${isSelected ? "text-indigo-600" : "text-slate-400 group-hover:text-slate-600"}`} />
              {tab.label}
              {isSelected && <span className="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-indigo-600" />}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
