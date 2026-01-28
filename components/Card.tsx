import React from 'react';

interface CardProps {
    children: React.ReactNode;
    className?: string;
    title?: string; // Optional header title
    action?: React.ReactNode; // Optional header action
}

export function Card({ children, className = '', title, action }: CardProps) {
    return (
        <div className={`bg-white border border-gray-200 rounded-lg shadow-md flex flex-col overflow-hidden ${className}`}>
            {(title || action) && (
                <div className="px-4 py-3 bg-blue-600 text-white flex justify-between items-center">
                    {title && <h3 className="font-bold uppercase tracking-tight text-sm md:text-base">{title}</h3>}
                    {action && <div className="text-blue-100">{action}</div>}
                </div>
            )}
            <div className="p-4 flex-1 flex flex-col">
                {children}
            </div>
        </div>
    );
}
