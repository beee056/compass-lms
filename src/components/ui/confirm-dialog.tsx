"use client";

// 破壊的操作の確認に使う共通ダイアログ。native confirm() の置き換え。
// 制御コンポーネント: open / onOpenChange で開閉し、確定時に onConfirm を呼ぶ。

import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  loading?: boolean;
  onConfirm: () => void;
  // 第3の選択肢（例: 「アーカイブする」）を主ボタンとして出す場合
  primaryAction?: {
    label: string;
    onClick: () => void;
  };
}

export default function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "実行する",
  cancelLabel = "キャンセル",
  destructive = false,
  loading = false,
  onConfirm,
  primaryAction
}: ConfirmDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[440px] bg-white">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold text-slate-800">{title}</DialogTitle>
          {description && (
            <DialogDescription className="text-sm leading-6 text-slate-600">
              {description}
            </DialogDescription>
          )}
        </DialogHeader>
        <DialogFooter className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
            className="border-slate-200 text-slate-600 font-semibold"
          >
            {cancelLabel}
          </Button>
          {primaryAction && (
            <Button
              type="button"
              onClick={primaryAction.onClick}
              disabled={loading}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
            >
              {primaryAction.label}
            </Button>
          )}
          <Button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={
              destructive
                ? "bg-red-600 hover:bg-red-700 text-white font-bold min-w-[110px]"
                : "bg-indigo-600 hover:bg-indigo-700 text-white font-bold min-w-[110px]"
            }
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
