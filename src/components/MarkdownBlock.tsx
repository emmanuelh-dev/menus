import ReactMarkdown from 'react-markdown';

interface MarkdownBlockProps {
  content: string;
  className?: string;
}

export default function MarkdownBlock({ content, className = "" }: MarkdownBlockProps) {
  if (!content) return null;

  return (
    <div className={`prose prose-stone max-w-none ${className}`}>
      <ReactMarkdown>{content}</ReactMarkdown>
    </div>
  );
}
