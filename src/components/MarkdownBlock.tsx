import ReactMarkdown from 'react-markdown';

interface MarkdownBlockProps {
  content: string;
  className?: string;
}

export default function MarkdownBlock({ content, className = "" }: MarkdownBlockProps) {
  if (!content) return null;

  return (
    <div className={`prose prose-stone max-w-none prose-p:my-0 prose-headings:my-0 prose-ul:my-0 prose-li:my-0 ${className}`}>
      <ReactMarkdown
        components={{
          p: ({ children }) => <span className="block">{children}</span>,
          a: ({ node, ...props }) => (
            <a {...props} rel="ugc nofollow noreferrer" target="_blank" className="text-blue-600 hover:underline">
              {props.children}
            </a>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
