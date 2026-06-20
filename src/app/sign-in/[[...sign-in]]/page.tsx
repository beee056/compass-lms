import { SignIn } from "@clerk/nextjs";

export default function Page() {
  return (
    <div className="flex min-h-[calc(100vh-100px)] items-center justify-center">
      <SignIn />
    </div>
  );
}
