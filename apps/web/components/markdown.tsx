"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";

type MdNode = {
  type?: string;
  value?: string;
  url?: string;
  children?: MdNode[];
};

function isMentionToken(tok: string) {
  // Discord-ish handles: @letters/numbers/_- (avoid emails)
  if (!tok.startsWith("@")) return false;
  const h = tok.slice(1);
  if (!h) return false;
  if (!/^[a-z0-9][a-z0-9_-]{1,31}$/i.test(h)) return false;
  return true;
}

function remarkMentions() {
  return (tree: MdNode) => {
    const walk = (node: MdNode) => {
      if (!node) return;
      const kids = node.children;
      if (!kids?.length) return;

      const next: MdNode[] = [];
      for (const ch of kids) {
        if (ch?.type === "text" && typeof ch.value === "string") {
          const parts = ch.value.split(/(\B@[a-z0-9][a-z0-9_-]{1,31}\b)/gi);
          for (const part of parts) {
            if (part && isMentionToken(part.replace(/^\B/, ""))) {
              // Note: split keeps \B marker out; normalize just in case.
              const token = part.replace(/^\B/, "");
              next.push({
                type: "link",
                url: `mention:${token.slice(1)}`,
                children: [{ type: "text", value: token }]
              });
            } else if (part) {
              next.push({ type: "text", value: part });
            }
          }
        } else {
          next.push(ch);
          if (ch?.children?.length) walk(ch);
        }
      }
      node.children = next;
    };

    walk(tree);
  };
}

export function Markdown({
  children,
  streaming = false
}: {
  children: string;
  streaming?: boolean;
}) {
  return (
    <div className="prose max-w-none dark:prose-invert prose-p:leading-relaxed prose-li:leading-relaxed prose-pre:rounded-xl prose-pre:border prose-pre:bg-muted/20 prose-pre:p-3 prose-code:rounded prose-code:bg-muted/30 prose-code:px-1 prose-code:py-0.5 prose-strong:text-foreground prose-headings:scroll-mt-24 prose-h2:mt-5 prose-h2:border-b prose-h2:border-border prose-h2:pb-1 prose-h2:text-base prose-h2:font-semibold prose-h3:text-sm prose-h3:font-semibold prose-ul:my-2 prose-ul:list-disc prose-ul:pl-5 prose-ol:my-2 prose-ol:list-decimal prose-ol:pl-5 prose-li:my-1">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkBreaks, remarkMentions]}
        components={{
          h2: ({ children, ...props }) => (
            <h2 {...props} className="text-base font-semibold tracking-tight">
              {children}
            </h2>
          ),
          h3: ({ children, ...props }) => (
            <h3 {...props} className="text-sm font-semibold tracking-tight">
              {children}
            </h3>
          ),
          strong: ({ children, ...props }) => (
            <strong {...props} className="font-semibold text-foreground">
              {children}
            </strong>
          ),
          ul: ({ children, ...props }) => (
            <ul {...props} className="my-2 list-disc space-y-1 pl-5">
              {children}
            </ul>
          ),
          ol: ({ children, ...props }) => (
            <ol {...props} className="my-2 list-decimal space-y-1 pl-5">
              {children}
            </ol>
          ),
          li: ({ children, ...props }) => (
            <li {...props} className="leading-relaxed">
              {children}
            </li>
          ),
          a: ({ children, href, ...props }) => {
            if (typeof href === "string" && href.startsWith("mention:")) {
              return (
                <span
                  {...props}
                  className="inline-flex items-center rounded-md bg-[#5865F2]/15 px-1.5 py-0.5 font-medium text-[#4752C4] ring-1 ring-inset ring-[#5865F2]/25 dark:bg-[#5865F2]/25 dark:text-[#C9CDFB] dark:ring-[#5865F2]/35"
                >
                  {children}
                </span>
              );
            }
            return (
              <a
                {...props}
                href={href}
                className="font-medium text-primary underline underline-offset-2 decoration-primary/40 hover:decoration-primary"
              >
                {children}
              </a>
            );
          }
        }}
      >
        {children}
      </ReactMarkdown>
      {streaming ? (
        <span className="ml-1 inline-block h-3 w-2 animate-pulse rounded-sm bg-primary/70 align-baseline" />
      ) : null}
    </div>
  );
}
