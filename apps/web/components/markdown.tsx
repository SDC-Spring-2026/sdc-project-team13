"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export function Markdown({ children }: { children: string }) {
  return (
    <div className="prose prose-sm max-w-none dark:prose-invert prose-headings:scroll-mt-24 prose-p:leading-relaxed prose-li:leading-relaxed prose-pre:rounded-lg prose-pre:border prose-pre:bg-muted/20 prose-code:rounded prose-code:bg-muted/30 prose-code:px-1 prose-code:py-0.5">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{children}</ReactMarkdown>
    </div>
  );
}

