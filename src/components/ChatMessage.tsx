/**
 * ChatMessage Component - Manus Style
 * Clean, document-like message styling
 */

import React from 'react';
import { Agent, GroundingSource } from '../../types';

interface ChatMessageProps {
    agent: Agent;
    content: string | React.ReactNode;
    sources?: GroundingSource[];
}

export const ChatMessage: React.FC<ChatMessageProps> = ({ agent, content, sources }) => {
    const isUser = agent === Agent.User;

    return (
        <div className={`relative w-full ${isUser ? 'max-w-3xl ml-auto' : 'max-w-3xl mx-auto'}`}>
            {/* Message Content */}
            <div className={`prose max-w-none ${isUser
                ? 'ml-auto bg-[var(--bg-tertiary-color)] px-5 py-3 rounded-3xl rounded-tr-md inline-block text-left rtl:text-right shadow-sm border border-[var(--border-color)]'
                : 'w-full px-1' /* Document style for AI - no background, centered layout */
                }`}>
                {typeof content === 'string' ? <p className="whitespace-pre-wrap mb-0">{content}</p> : content}
            </div>

            {/* Sources */}
            {sources && sources.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2">
                    {sources.map((source, index) => (
                        <a
                            key={index}
                            href={source.uri}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--bg-tertiary-color)] hover:bg-[var(--hover-bg-color)] rounded-lg text-xs text-[var(--text-secondary-color)] hover:text-[var(--text-color)] transition-colors no-underline"
                        >
                            <span className="truncate max-w-[200px]">{source.title}</span>
                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                                <polyline points="15 3 21 3 21 9" />
                                <line x1="10" y1="14" x2="21" y2="3" />
                            </svg>
                        </a>
                    ))}
                </div>
            )}
        </div>

    );
};
