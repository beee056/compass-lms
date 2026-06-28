"use client";

import React, { useEffect, useRef, useState } from "react";
import mermaid from "mermaid";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Maximize2, ZoomIn } from "lucide-react";

mermaid.initialize({
  startOnLoad: false,
  theme: "default",
  securityLevel: "loose",
  fontFamily: "inherit",
});

export default function MermaidViewer({ chart }: { chart: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState<string>("");
  const [error, setError] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;
    
    const renderChart = async () => {
      try {
        if (!chart) return;
        // Generate a unique ID for the mermaid instance
        const id = `mermaid-${Math.random().toString(36).substr(2, 9)}`;
        const { svg } = await mermaid.render(id, chart);
        if (isMounted) {
          setSvg(svg);
          setError(false);
        }
      } catch (e) {
        console.error("Mermaid rendering failed:", e);
        if (isMounted) {
          setError(true);
        }
      }
    };

    renderChart();

    return () => {
      isMounted = false;
    };
  }, [chart]);

  if (error) {
    return (
      <div className="p-4 bg-red-50 text-red-600 rounded-md text-sm border border-red-200">
        フローチャートの描画に失敗しました。Markdownの記法を確認してください。
      </div>
    );
  }

  if (!svg) {
    return <div className="animate-pulse h-32 bg-slate-100 rounded-md w-full"></div>;
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <div className="relative group cursor-pointer my-8">
          <div 
            ref={containerRef} 
            className="flex justify-center p-6 bg-slate-50 border border-slate-200 rounded-xl shadow-inner overflow-x-auto [&>svg]:w-full [&>svg]:max-w-4xl [&>svg]:h-auto transition-all duration-200 group-hover:border-indigo-300 group-hover:shadow-md"
            dangerouslySetInnerHTML={{ __html: svg }} 
          />
          <div className="absolute top-4 right-4 p-2 bg-indigo-600 text-white rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity transform scale-95 group-hover:scale-100 flex items-center gap-2">
            <ZoomIn className="h-4 w-4" />
            <span className="text-xs font-bold pr-1">拡大表示</span>
          </div>
        </div>
      </DialogTrigger>
      
      <DialogContent 
        className="max-w-[95vw] w-[95vw] h-[90vh] flex flex-col p-6 bg-white/95 backdrop-blur-sm overflow-hidden" 
        style={{ maxWidth: '95vw', width: '95vw' }}
      >
        <DialogHeader className="mb-2 shrink-0">
          <DialogTitle className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <ZoomIn className="h-5 w-5 text-indigo-600" />
            フローチャート詳細
          </DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-auto bg-slate-50/80 rounded-xl border border-slate-200 p-8 flex items-start justify-center">
          <div 
            className="w-full min-w-[800px] flex justify-center [&>svg]:w-full [&>svg]:max-w-none [&>svg]:h-auto"
            dangerouslySetInnerHTML={{ __html: svg }} 
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
