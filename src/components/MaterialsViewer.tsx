"use client";

import { useState } from "react";
import { BookOpen, ChevronRight, PlayCircle, GraduationCap, ChevronDown, Lightbulb, AlertCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import MermaidViewer from "./MermaidViewer";

type Lesson = {
  id: string;
  title: string;
  content: string;
  order: number;
};

type Course = {
  id: string;
  title: string;
  description: string | null;
  lessons: Lesson[];
};

export default function MaterialsViewer({ courses, isStudent }: { courses: Course[], isStudent: boolean }) {
  const [activeCourseId, setActiveCourseId] = useState<string | null>(courses.length > 0 ? courses[0].id : null);
  const [activeLesson, setActiveLesson] = useState<Lesson | null>(courses.length > 0 && courses[0].lessons.length > 0 ? courses[0].lessons[0] : null);

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
    <div className="animate-in fade-in duration-500">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-3 tracking-tight">
          <BookOpen className="h-8 w-8 text-indigo-600" />
          学習カリキュラム
        </h1>
        <p className="text-slate-500 mt-2">
          総合型選抜合格に向けたステップバイステップの教材です。順番に進めて実践力を身につけましょう。
        </p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* 左側: カリキュラム目次 */}
        <div className="w-full lg:w-1/3 flex flex-col gap-4">
          {courses.map((course) => (
            <Card key={course.id} className="overflow-hidden border-slate-200/60 shadow-sm bg-white">
              <button 
                onClick={() => setActiveCourseId(activeCourseId === course.id ? null : course.id)}
                className="w-full flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100 transition-colors text-left"
              >
                <div className="flex flex-col">
                  <span className="font-bold text-slate-800">{course.title}</span>
                  <span className="text-xs text-slate-500 mt-1">{course.lessons.length} レッスン</span>
                </div>
                {activeCourseId === course.id ? <ChevronDown className="h-5 w-5 text-slate-400" /> : <ChevronRight className="h-5 w-5 text-slate-400" />}
              </button>
              
              {activeCourseId === course.id && (
                <div className="flex flex-col divide-y divide-slate-100 p-2">
                  {course.lessons.map((lesson, idx) => (
                    <button
                      key={lesson.id}
                      onClick={() => setActiveLesson(lesson)}
                      className={`flex items-start gap-3 p-3 rounded-lg text-left transition-colors ${
                        activeLesson?.id === lesson.id 
                          ? "bg-indigo-50 text-indigo-700 font-bold" 
                          : "text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      <PlayCircle className={`h-5 w-5 mt-0.5 flex-shrink-0 ${activeLesson?.id === lesson.id ? "text-indigo-600" : "text-slate-400"}`} />
                      <span className="text-sm leading-tight">{idx + 1}. {lesson.title}</span>
                    </button>
                  ))}
                </div>
              )}
            </Card>
          ))}
        </div>

        {/* 右側: レッスンコンテンツ */}
        <div className="w-full lg:w-2/3">
          {activeLesson ? (
            <Card className="p-6 md:p-8 border-slate-200/60 shadow-sm bg-white min-h-[600px] flex flex-col">
              <div className="border-b border-slate-100 pb-4 mb-6">
                <h2 className="text-2xl font-bold text-slate-800">{activeLesson.title}</h2>
              </div>
              
              {/* Markdownコンテンツの表示 */}
              <div className="prose prose-slate prose-indigo max-w-none flex-1">
                <ReactMarkdown 
                  remarkPlugins={[remarkGfm]}
                  components={{
                    code({ node, inline, className, children, ...props }: any) {
                      const match = /language-(\w+)/.exec(className || '');
                      if (!inline && match && match[1] === 'mermaid') {
                        return <MermaidViewer chart={String(children).replace(/\n$/, '')} />;
                      }
                      return <code className={className} {...props}>{children}</code>;
                    },
                    blockquote({ children, ...props }: any) {
                      // 簡易的にアラート記法を検知してスタイルを変える
                      const getText = (node: any): string => {
                        if (typeof node === 'string') return node;
                        if (Array.isArray(node)) return node.map(getText).join('');
                        if (node && node.props && node.props.children) return getText(node.props.children);
                        return '';
                      };
                      const text = getText(children);
                      if (text.includes("[!TIP]")) {
                        return (
                          <div className="my-6 border border-emerald-200 bg-emerald-50/50 rounded-xl overflow-hidden shadow-sm">
                            <div className="bg-emerald-100/50 px-4 py-2 flex items-center gap-2 border-b border-emerald-100 font-bold text-emerald-800">
                              <Lightbulb className="h-5 w-5" /> TIPS
                            </div>
                            <div className="px-4 py-3 text-emerald-900/90 text-sm leading-relaxed">
                              {children}
                            </div>
                          </div>
                        );
                      }
                      if (text.includes("[!IMPORTANT]") || text.includes("[!WARNING]")) {
                        return (
                          <div className="my-6 border border-amber-200 bg-amber-50/50 rounded-xl overflow-hidden shadow-sm">
                            <div className="bg-amber-100/50 px-4 py-2 flex items-center gap-2 border-b border-amber-100 font-bold text-amber-800">
                              <AlertCircle className="h-5 w-5" /> 重要 / 注意
                            </div>
                            <div className="px-4 py-3 text-amber-900/90 text-sm leading-relaxed">
                              {children}
                            </div>
                          </div>
                        );
                      }
                      return (
                        <blockquote className="border-l-4 border-indigo-200 bg-slate-50 py-1 px-4 text-slate-600 rounded-r-lg my-4" {...props}>
                          {children}
                        </blockquote>
                      );
                    }
                  }}
                >
                  {activeLesson.content.replace(/> \[!(TIP|IMPORTANT|WARNING)\]/g, "")}
                </ReactMarkdown>
              </div>

              {/* 実践（AI演習）への導線 */}
              {isStudent && (
                <div className="mt-12 pt-6 border-t border-slate-100 bg-indigo-50/50 -mx-6 md:-mx-8 -mb-6 md:-mb-8 p-6 md:p-8 rounded-b-xl flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div>
                    <h3 className="font-bold text-indigo-900 flex items-center gap-2">
                      <GraduationCap className="h-5 w-5" />
                      学んだことを実践しよう
                    </h3>
                    <p className="text-sm text-indigo-800/80 mt-1">
                      知識を定着させるにはアウトプットが最も効果的です。マイページの「AI添削」で実際に書いてみましょう。
                    </p>
                  </div>
                  <Link href="/portal">
                    <Button className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold whitespace-nowrap shadow-sm">
                      AI添削で練習する
                    </Button>
                  </Link>
                </div>
              )}
            </Card>
          ) : (
            <Card className="p-12 border-slate-200/60 shadow-sm bg-white flex flex-col items-center justify-center text-slate-500 h-[600px]">
              <BookOpen className="h-12 w-12 text-slate-200 mb-4" />
              <p>左側のメニューからレッスンを選択してください</p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
