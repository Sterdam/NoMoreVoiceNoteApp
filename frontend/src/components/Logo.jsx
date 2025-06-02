import React from 'react';
import { cn } from '../lib/utils';

export function Logo({ className, size = 'md', showText = false }) {
  const sizes = {
    sm: { img: 'h-10 w-10', text: 'text-lg' },
    md: { img: 'h-16 w-16', text: 'text-xl' },
    lg: { img: 'h-20 w-20', text: 'text-2xl' }
  };

  return (
    <div className="flex items-center">
      <img 
        src="/logo.png" 
        alt="VoxKill Logo" 
        className={cn(sizes[size].img, className)}
      />
      {showText && (
        <span className={cn('ml-2 font-bold text-gray-900 dark:text-white', sizes[size].text)}>
          VoxKill
        </span>
      )}
    </div>
  );
}