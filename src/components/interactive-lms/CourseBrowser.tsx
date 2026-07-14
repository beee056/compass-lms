"use client";

import { useState } from "react";
import { BookOpen, ChevronRight, PlayCircle, GraduationCap } from "lucide-react";
import { Card } from "@/components/ui/card";
import LessonWizard, { LessonData } from "./LessonWizard";

type Course = {
  id: string;
  title: string;
  description: string | null;
  lessons: LessonData[];
};

export default function CourseBrowser({ courses, studentProfileId }: { courses: Course[], studentProfileId: string }) {
  const [activeLesson, setActiveLesson] = useState<LessonData | null>(null);

  if (activeLesson) {
    return (
      <div>
        <button 
          onClick={() => setActiveLesson(null)}
          className="mb-6 text-sm font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
        >
          ← カリキュラム一覧に戻る
        </button>
        <LessonWizard lesson={activeLesson} studentProfileId={studentProfileId} />
      </div>
    );
  }

  if (courses.length === 0) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center rounded-xl border border-slate-200 bg-white p-12 text-center shadow-sm">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-indigo-50 text-indigo-600">
          <BookOpen className="h-7 w-7" />
        </div>
        <p className="text-lg font-bold text-slate-800">教材はまだ準備中です</p>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          カリキュラムが公開されると、ここに順番に並びます。もうしばらくお待ちください。
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto animate-in fade-in duration-500">
      <div className="mb-10 text-center">
        <div className="inline-flex items-center justify-center p-3 bg-indigo-100 rounded-full mb-4">
          <BookOpen className="h-8 w-8 text-indigo-600" />
        </div>
        <h1 className="text-3xl font-bold text-slate-800 tracking-tight">
          実践指導カリキュラム
        </h1>
        <p className="text-slate-500 mt-3 max-w-2xl mx-auto">
          対話型ウィザードを通じて、AIメンターからフィードバックを受けながら思考を深めていきます。順番に進めて実践力を身につけましょう。
        </p>
      </div>

      <div className="flex flex-col gap-8">
        {courses.map((course) => (
          <div key={course.id} className="flex flex-col gap-4">
            <h2 className="text-xl font-bold text-slate-800 border-b-2 border-indigo-100 pb-2 inline-block self-start">
              {course.title}
            </h2>
            {course.description && (
              <p className="text-sm text-slate-600 bg-white p-4 rounded-lg shadow-sm border border-slate-100">
                {course.description}
              </p>
            )}
            
            <div className="grid gap-3">
              {course.lessons.map((lesson, idx) => (
                <Card 
                  key={lesson.id} 
                  className="group hover:border-indigo-300 hover:shadow-md transition-all cursor-pointer bg-white"
                  onClick={() => setActiveLesson(lesson)}
                >
                  <div className="p-4 sm:p-6 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-full bg-slate-100 group-hover:bg-indigo-100 flex items-center justify-center transition-colors">
                        <PlayCircle className="h-5 w-5 text-slate-400 group-hover:text-indigo-600" />
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-800 group-hover:text-indigo-700 transition-colors">
                          {lesson.title}
                        </h3>
                        <p className="text-xs text-slate-500 mt-1">
                          全 {lesson.steps.length} ステップの対話型ワーク
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-slate-300 group-hover:text-indigo-500 transform group-hover:translate-x-1 transition-all" />
                  </div>
                </Card>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
