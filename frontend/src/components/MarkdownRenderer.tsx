"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export default function MarkdownRenderer({ content, className = "" }: MarkdownRendererProps) {
  return (
    <div className={`markdown-content ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // 标题
          h1: ({ children }) => <h1 className="md-h1">{children}</h1>,
          h2: ({ children }) => <h2 className="md-h2">{children}</h2>,
          h3: ({ children }) => <h3 className="md-h3">{children}</h3>,
          h4: ({ children }) => <h4 className="md-h4">{children}</h4>,
          // 段落
          p: ({ children }) => <p className="md-p">{children}</p>,
          // 列表
          ul: ({ children }) => <ul className="md-ul">{children}</ul>,
          ol: ({ children }) => <ol className="md-ol">{children}</ol>,
          li: ({ children }) => <li className="md-li">{children}</li>,
          // 强调
          strong: ({ children }) => <strong className="md-strong">{children}</strong>,
          em: ({ children }) => <em className="md-em">{children}</em>,
          // 代码
          code: ({ className: codeClassName, children, ...props }) => {
            const isInline = !codeClassName;
            if (isInline) {
              return <code className="md-code-inline" {...props}>{children}</code>;
            }
            return <code className={`md-code-block ${codeClassName || ""}`} {...props}>{children}</code>;
          },
          pre: ({ children }) => <pre className="md-pre">{children}</pre>,
          // 引用
          blockquote: ({ children }) => <blockquote className="md-blockquote">{children}</blockquote>,
          // 分隔线
          hr: () => <hr className="md-hr" />,
          // 链接
          a: ({ href, children }) => (
            <a href={href} className="md-link" target="_blank" rel="noopener noreferrer">
              {children}
            </a>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
