import React, { useMemo } from 'react';
import { marked } from 'marked';

interface StreamingMarkdownRendererProps {
    content: string;
}

export const StreamingMarkdownRenderer: React.FC<StreamingMarkdownRendererProps> = ({ content }) => {
    const html = useMemo(() => {
        return marked.parse(content, { gfm: true, breaks: true });
    }, [content]);

    return (
        <div
            className="prose prose-sm max-w-none text-left rtl:text-right dark:prose-invert"
            dangerouslySetInnerHTML={{ __html: html as string }}
        />
    );
};
