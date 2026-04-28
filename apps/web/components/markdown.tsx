"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";

export function Markdown({
  children,
  streaming = false
}: {
  children: string;
  streaming?: boolean;
}) {
  return (
    <div className="prose prose-sm max-w-none dark:prose-invert prose-headings:scroll-mt-24 prose-p:leading-relaxed prose-li:leading-relaxed prose-pre:rounded-lg prose-pre:border prose-pre:bg-muted/20 prose-code:rounded prose-code:bg-muted/30 prose-code:px-1 prose-code:py-0.5">
      <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]}>
        {children}
      </ReactMarkdown>
      {streaming ? (
        <span className="ml-1 inline-block h-3 w-2 animate-pulse rounded-sm bg-primary/70 align-baseline" />
      ) : null}
    </div>
  );
}
