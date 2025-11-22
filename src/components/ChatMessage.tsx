import React from 'react';
import { Agent, GroundingSource } from '../../types';
import { UserIcon, OrchestratorIcon, AgentIcon } from '../../components/icons';

interface ChatMessageProps {
    agent: Agent;
    content: string | React.ReactNode;
    sources?: GroundingSource[];
}

export const ChatMessage: React.FC<ChatMessageProps> = ({ agent, content, sources }) => {
    const isUser = agent === Agent.User;

    return (
        <div className={`group flex items-start gap-4 ${isUser ? 'flex-row-reverse' : 'flex-row'} animate-fade-in`}>
            <div className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${isUser ? 'bg-[var(--accent-color)] text-white' : 'bg-[var(--bg-tertiary-color)] text-[var(--text-color)]'}`}>
                {isUser ? <UserIcon className="w-5 h-5" /> : <OrchestratorIcon className="w-5 h-5" />}
            </div>
            <div className={`relative w-full max-w-3xl ${isUser ? 'text-right' : 'text-left'}`}>
                <div className={`prose prose-invert max-w-none ${isUser ? 'ml-auto bg-[var(--bg-tertiary-color)] p-3 rounded-2xl rounded-tr-sm inline-block text-left rtl:text-right' : ''}`}>
                    {typeof content === 'string' ? <p className="whitespace-pre-wrap mb-0">{content}</p> : content}
                </div>

                {sources && sources.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                        {sources.map((source, index) => (
                            <a key={index} href={source.uri} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 px-2 py-1 bg-[var(--bg-tertiary-color)] hover:bg-[var(--hover-bg-color)] border border-[var(--border-color)] rounded-md text-xs text-[var(--text-secondary-color)] hover:text-[var(--text-color)] transition-colors no-underline">
                                <AgentIcon agent={source.agent} className="w-3 h-3" />
                                <span className="truncate max-w-[150px]">{source.title}</span>
                            </a>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};
