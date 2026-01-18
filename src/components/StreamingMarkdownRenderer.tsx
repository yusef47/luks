import React, { useMemo } from 'react';
import { marked } from 'marked';

interface StreamingMarkdownRendererProps {
    content: string;
}

// Configure marked to open links in new tabs
const renderer = new marked.Renderer();
const originalLink = renderer.link.bind(renderer);
renderer.link = function (data) {
    const html = originalLink(data);
    // Add target="_blank" to the generated link
    return html.replace('<a ', '<a target="_blank" rel="noopener noreferrer" ');
};

marked.setOptions({
    renderer: renderer,
    gfm: true,
    breaks: true
});

export const StreamingMarkdownRenderer: React.FC<StreamingMarkdownRendererProps> = ({ content }) => {
    const html = useMemo(() => {
        return marked.parse(content);
    }, [content]);

    return (
        <div
            className="prose prose-sm max-w-none text-left rtl:text-right dark:prose-invert"
            dangerouslySetInnerHTML={{ __html: html as string }}
        />
    );
};
