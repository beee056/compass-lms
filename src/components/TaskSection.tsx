"use client";
import { toast } from "@/lib/toast";

import { useState, useTransition } from "react";
import { CheckCircle2, Clock, Plus, Trash2, Loader2, MessageSquare, Send } from "lucide-react";
import { createTask, toggleTaskCompletion, deleteTask, addTaskComment, createStudentTask } from "@/lib/actions";
import EditTaskDialog from "./EditTaskDialog";
import ConfirmDialog from "@/components/ui/confirm-dialog";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

interface TaskComment {
  id: string;
  content: string;
  authorName: string;
  createdAt: Date;
}

interface Task {
  id: string;
  title: string;
  dueDate: Date | null;
  completed: boolean;
  type: string;
  comments?: TaskComment[];
}

interface TaskSectionProps {
  studentId: string;
  initialTasks: Task[];
  isStudent?: boolean;
}

export default function TaskSection({ studentId, initialTasks, isStudent = false }: TaskSectionProps) {
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [sendEmail, setSendEmail] = useState(false);
  
  // コメント展開状態
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);
  const [commentInput, setCommentInput] = useState("");
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);

  const handleToggle = async (taskId: string) => {
    setTasks(prev => 
      prev.map(t => t.id === taskId ? { ...t, completed: !t.completed } : t)
    );

    const result = await toggleTaskCompletion(taskId);
    if (!result.success) {
      toast.error("タスクの更新に失敗しました: " + result.error);
      setTasks(prev => 
        prev.map(t => t.id === taskId ? { ...t, completed: !t.completed } : t)
      );
    }
  };

  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  const handleDelete = async () => {
    const taskId = deleteTargetId;
    if (!taskId) return;
    setDeleteTargetId(null);

    const originalTasks = [...tasks];
    setTasks(prev => prev.filter(t => t.id !== taskId));

    const result = await deleteTask(taskId);
    if (result.success) {
      toast.success("タスクを削除しました");
    } else {
      toast.error("タスクの削除に失敗しました: " + result.error);
      setTasks(originalTasks);
    }
  };

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    startTransition(async () => {
      let result;
      if (isStudent) {
        result = await createStudentTask(title, dueDate || undefined);
      } else {
        result = await createTask(studentId, title, dueDate || undefined, "TODO", sendEmail);
      }
      
      if (result.success) {
        toast.success("タスクを追加しました");
        setTitle("");
        setDueDate("");
        setSendEmail(false);
        setOpen(false);
      } else {
        toast.error("タスクの作成に失敗しました: " + result.error);
      }
    });
  };

  const handleAddComment = async (taskId: string) => {
    if (!commentInput.trim()) return;
    
    setIsSubmittingComment(true);
    const result = await addTaskComment(taskId, commentInput);
    if (result.success) {
      setCommentInput("");
      // 楽観的UI更新（または revalidatePath に任せるか。今回は再レンダーを待つより即時反映させる）
      setTasks(prev => prev.map(t => {
        if (t.id === taskId) {
          return {
            ...t,
            comments: [...(t.comments || []), result.comment]
          };
        }
        return t;
      }));
    } else {
      toast.error("コメントの送信に失敗しました");
    }
    setIsSubmittingComment(false);
  };

  const [prevInitialTasks, setPrevInitialTasks] = useState(initialTasks);
  if (initialTasks !== prevInitialTasks) {
    setTasks(initialTasks);
    setPrevInitialTasks(initialTasks);
  }

  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2.5 tracking-tight">
          <CheckCircle2 className="h-6 w-6 text-emerald-500" />
          直近のタスク
        </h2>
        
        {/* タスク追加ダイアログ (メンター・生徒共通) */}
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger
            render={
              <Button size="sm" variant="outline" className="flex items-center gap-1.5 border-slate-200 text-slate-600 hover:bg-slate-50 font-bold px-3 py-1.5 rounded-lg text-xs h-9">
                <Plus className="h-4 w-4" />
                タスクを追加
              </Button>
            }
          />
          <DialogContent className="sm:max-w-[425px] bg-white">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-slate-800">タスクの追加</DialogTitle>
              <DialogDescription className="text-slate-500 text-sm">
                {isStudent ? "自分がやるべきタスクを追加します。" : "今週の面談で決定したタスクを追加します。"}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleAddTask}>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="title" className="text-slate-700 font-semibold text-sm">タスク名</Label>
                  <Input 
                    id="title" 
                    value={title} 
                    onChange={(e) => setTitle(e.target.value)} 
                    placeholder="例: 志望理由書 第2稿の作成" 
                    required 
                    className="border-slate-200" 
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="dueDate" className="text-slate-700 font-semibold text-sm">期限日 (任意)</Label>
                  <div className="relative">
                    <Input 
                      id="dueDate" 
                      type="date"
                      value={dueDate} 
                      onChange={(e) => setDueDate(e.target.value)} 
                      className="border-slate-200" 
                    />
                  </div>
                </div>
                {!isStudent && (
                  <div className="flex items-center gap-2 mt-2">
                    <input 
                      type="checkbox" 
                      id="sendEmailTask" 
                      checked={sendEmail}
                      onChange={(e) => setSendEmail(e.target.checked)}
                      className="h-4 w-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500"
                    />
                    <Label htmlFor="sendEmailTask" className="text-slate-700 text-sm font-medium">生徒へメールで通知する</Label>
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setOpen(false)} className="border-slate-200 text-slate-600 font-semibold">
                  キャンセル
                </Button>
                <Button type="submit" disabled={isPending} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold min-w-[100px]">
                  {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "追加する"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* 進捗バー */}
      {tasks.length > 0 && (
        <div className="mb-6 bg-white p-4 rounded-xl border border-slate-200/60 shadow-sm">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-bold text-slate-700">全体進捗</span>
            <span className="text-sm font-bold text-emerald-600">
              {Math.round((tasks.filter(t => t.completed).length / tasks.length) * 100)}%
            </span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
            <div 
              className="bg-emerald-500 h-2.5 rounded-full transition-all duration-500 ease-out" 
              style={{ width: `${(tasks.filter(t => t.completed).length / tasks.length) * 100}%` }}
            ></div>
          </div>
          <div className="mt-2 text-xs text-slate-500 font-medium text-right">
            {tasks.filter(t => t.completed).length} / {tasks.length} 完了
          </div>
        </div>
      )}
      
      <div className="space-y-3">
        {tasks.length === 0 ? (
          <div className="p-8 text-center text-slate-400 font-semibold text-sm bg-white border border-slate-200/60 rounded-xl">
            タスクはまだありません。
          </div>
        ) : (
          tasks.map((task) => (
            <div key={task.id} className="bg-white border border-slate-200/60 rounded-xl shadow-[0_2px_10px_rgba(0,0,0,0.02)] overflow-hidden transition-all hover:border-emerald-200">
              <div 
                className={`p-4 flex items-center justify-between group ${task.completed ? 'bg-slate-50/50 opacity-70' : ''}`}
              >
                <div className="flex gap-4 items-start flex-1 mr-4">
                  <button 
                    onClick={() => handleToggle(task.id)}
                    className={`mt-0.5 flex-shrink-0 w-5 h-5 rounded border-2 ${
                      task.completed 
                        ? 'border-emerald-500 bg-emerald-500 text-white' 
                        : 'border-slate-300 hover:border-emerald-400'
                    } flex items-center justify-center transition-colors`}
                  >
                    {task.completed && <CheckCircle2 className="h-4 w-4" />}
                  </button>
                  <div>
                    <h4 className={`text-sm font-bold text-slate-800 ${task.completed ? 'line-through text-slate-400 font-normal' : ''}`}>
                      {task.title}
                    </h4>
                    <div className="flex items-center gap-3 mt-1.5">
                      {task.dueDate && (
                        <div className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600 bg-emerald-50/70 px-2 py-0.5 rounded-sm inline-flex">
                          <Clock className="h-3 w-3" />
                          <span>期限: {new Date(task.dueDate).toLocaleDateString("ja-JP", { timeZone: "Asia/Tokyo" })}</span>
                        </div>
                      )}
                      <button 
                        onClick={() => setExpandedTaskId(expandedTaskId === task.id ? null : task.id)}
                        className={`flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-sm inline-flex transition-colors ${expandedTaskId === task.id ? "bg-indigo-100 text-indigo-700" : "bg-slate-100 text-slate-500 hover:bg-slate-200"}`}
                      >
                        <MessageSquare className="h-3 w-3" />
                        コメント {task.comments?.length || 0}
                      </button>
                    </div>
                  </div>
                </div>
                {!isStudent && (
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <EditTaskDialog task={task} />
                    <button
                      onClick={() => setDeleteTargetId(task.id)}
                      className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors focus:opacity-100"
                      title="タスクを削除"
                      aria-label="タスクを削除"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>

              {/* コメントセクション展開部分 */}
              {expandedTaskId === task.id && (
                <div className="bg-slate-50 border-t border-slate-100 p-4 animate-in slide-in-from-top-2 duration-200">
                  <div className="space-y-3 mb-4 max-h-48 overflow-y-auto pr-2">
                    {(!task.comments || task.comments.length === 0) ? (
                      <div className="text-xs text-center text-slate-400 py-2 font-medium">コメントはありません</div>
                    ) : (
                      task.comments.map((comment: any) => (
                        <div key={comment.id} className="bg-white p-2.5 rounded-lg border border-slate-100 shadow-sm text-sm">
                          <div className="flex justify-between items-center mb-1">
                            <span className="font-bold text-xs text-indigo-700">{comment.authorName}</span>
                            <span className="text-[10px] text-slate-400 font-medium">
                              {new Date(comment.createdAt).toLocaleString("ja-JP", { timeZone: "Asia/Tokyo", month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <p className="text-slate-700 text-sm whitespace-pre-wrap">{comment.content}</p>
                        </div>
                      ))
                    )}
                  </div>
                  
                  <div className="flex gap-2">
                    <Input 
                      value={commentInput}
                      onChange={(e) => setCommentInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleAddComment(task.id);
                        }
                      }}
                      placeholder="メッセージを入力..."
                      className="text-sm bg-white border-slate-200"
                    />
                    <Button 
                      size="icon" 
                      onClick={() => handleAddComment(task.id)}
                      disabled={!commentInput.trim() || isSubmittingComment}
                      className="bg-indigo-600 hover:bg-indigo-700 shrink-0"
                    >
                      {isSubmittingComment ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      <ConfirmDialog
        open={deleteTargetId !== null}
        onOpenChange={(o) => { if (!o) setDeleteTargetId(null); }}
        title="タスクを削除しますか？"
        description="このタスクと、ひも付くコメントが削除されます。この操作は取り消せません。"
        confirmLabel="削除する"
        destructive
        onConfirm={handleDelete}
      />
    </section>
  );
}
