import { UserPlus, FolderOpen, LayoutGrid, LogIn } from "lucide-react";
import { SignedIn, SignedOut, UserButton, SignInButton } from "@clerk/nextjs";

export default function Header() {
  return (
    <header className="flex h-16 items-center justify-between border-b border-slate-200 px-6 bg-white shadow-sm">
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-600 text-white font-bold">
          C
        </div>
        <span className="text-lg font-bold text-slate-800">スカラ・コンパス</span>
      </div>

      <div className="flex items-center gap-6">
        <SignedIn>
          <div className="flex items-center gap-2 rounded-full bg-indigo-50 px-4 py-1.5">
            <span className="text-sm font-semibold text-indigo-600">TEST</span>
            <span className="text-sm text-indigo-400">さんの指導</span>
          </div>

          <div className="flex items-center gap-5 text-slate-500 mr-4">
            <button className="hover:text-indigo-600 transition-colors">
              <UserPlus className="h-5 w-5" />
            </button>
            <button className="hover:text-indigo-600 transition-colors">
              <FolderOpen className="h-5 w-5" />
            </button>
            <button className="hover:text-indigo-600 transition-colors">
              <LayoutGrid className="h-5 w-5" />
            </button>
          </div>
          <UserButton afterSignOutUrl="/" />
        </SignedIn>
        
        <SignedOut>
          <SignInButton mode="modal">
            <button className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-indigo-700 transition-colors">
              <LogIn className="h-4 w-4" />
              ログイン
            </button>
          </SignInButton>
        </SignedOut>
      </div>
    </header>
  );
}
