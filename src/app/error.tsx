"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="p-10 bg-red-50 text-red-900 h-screen w-full flex flex-col gap-4">
      <h2 className="text-2xl font-bold">Something went wrong!</h2>
      <pre className="bg-white p-4 rounded overflow-auto whitespace-pre-wrap font-mono text-sm border border-red-200">
        {error.message}
        {"\n"}
        {error.stack}
      </pre>
      <button
        className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 w-fit"
        onClick={() => reset()}
      >
        Try again
      </button>
    </div>
  );
}
