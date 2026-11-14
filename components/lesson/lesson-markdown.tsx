import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { AlertTriangle, Lightbulb } from "lucide-react";

// Minimal hast shape we read from react-markdown's `node` prop.
interface HastNode {
  type: string;
  value?: string;
  children?: HastNode[];
}

function textOf(node: HastNode | undefined): string {
  if (!node) return "";
  if (node.type === "text") return node.value ?? "";
  return (node.children ?? []).map(textOf).join("");
}

const components: Components = {
  h2: ({ children }) => <h2 className="mb-3 mt-10 text-lg first:mt-0 md:text-xl">{children}</h2>,
  h3: ({ children }) => <h3 className="mb-2 mt-8 text-lg">{children}</h3>,
  p: ({ children }) => <p className="my-4">{children}</p>,
  ul: ({ children }) => <ul className="my-4 list-disc space-y-2 pl-6 marker:text-ink-muted">{children}</ul>,
  ol: ({ children }) => <ol className="my-4 list-decimal space-y-2 pl-6 marker:font-mono marker:text-sm marker:text-ink-muted">{children}</ol>,
  li: ({ children }) => <li className="pl-1">{children}</li>,
  strong: ({ children }) => <strong className="font-semibold text-ink">{children}</strong>,
  a: ({ children, href }) => (
    <a href={href} className="font-medium text-brand underline underline-offset-4" rel="noopener noreferrer" target="_blank">
      {children}
    </a>
  ),
  code: ({ children }) => (
    <code className="break-all rounded-sm border border-line bg-paper px-1.5 py-0.5 font-mono text-[0.85em]">{children}</code>
  ),
  table: ({ children }) => (
    <div className="my-6 overflow-x-auto rounded-md border border-line">
      <table className="w-full min-w-[480px] border-collapse text-sm">{children}</table>
    </div>
  ),
  thead: ({ children }) => <thead className="bg-paper">{children}</thead>,
  th: ({ children }) => <th className="border-b border-line px-3 py-2 text-left font-semibold">{children}</th>,
  td: ({ children }) => <td className="border-b border-line px-3 py-2 align-top last:border-b-0">{children}</td>,
  // "> **Warning** — ..." and "> **Tip** — ..." become callouts.
  blockquote: ({ children, node }) => {
    const text = textOf(node as HastNode | undefined).trim();
    const warning = text.startsWith("Warning");
    const tip = text.startsWith("Tip");
    if (!warning && !tip) {
      return <blockquote className="my-6 border-l-2 border-line pl-4 text-ink-muted">{children}</blockquote>;
    }
    const Icon = warning ? AlertTriangle : Lightbulb;
    return (
      <aside
        role="note"
        className={
          warning
            ? "my-6 flex gap-3 rounded-md border border-danger/30 bg-danger-soft p-4 [&_p]:my-0"
            : "my-6 flex gap-3 rounded-md border border-brand/20 bg-brand-soft p-4 [&_p]:my-0"
        }
      >
        <Icon aria-hidden className={warning ? "mt-1 h-5 w-5 shrink-0 text-danger" : "mt-1 h-5 w-5 shrink-0 text-brand"} />
        <div>{children}</div>
      </aside>
    );
  },
};

export function LessonMarkdown({ content }: { content: string }) {
  return (
    <div className="text-base leading-[1.7] text-ink/90">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {content}
      </ReactMarkdown>
    </div>
  );
}
