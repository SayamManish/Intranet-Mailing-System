import React from 'react';

export default function SkeletonLoader({ count = 5, type = 'mail' }) {
  return (
    <div className="divide-y divide-slate-100 dark:divide-slate-800/60 animate-pulse">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 px-4 py-3.5">
          {type === 'mail' && (
            <>
              <div className="w-4 h-4 bg-slate-200 dark:bg-slate-800 rounded"></div>
              <div className="w-4 h-4 bg-slate-200 dark:bg-slate-800 rounded-full"></div>
              <div className="w-9 h-9 bg-slate-200 dark:bg-slate-800 rounded-full shrink-0"></div>
              <div className="w-36 h-4 bg-slate-200 dark:bg-slate-800 rounded"></div>
              <div className="flex-1 h-4 bg-slate-200 dark:bg-slate-800 rounded"></div>
              <div className="w-16 h-3 bg-slate-200 dark:bg-slate-800 rounded"></div>
            </>
          )}
          {type === 'card' && (
            <div className="w-full space-y-2 p-2">
              <div className="w-1/3 h-5 bg-slate-200 dark:bg-slate-800 rounded"></div>
              <div className="w-full h-4 bg-slate-200 dark:bg-slate-800 rounded"></div>
              <div className="w-2/3 h-3 bg-slate-200 dark:bg-slate-800 rounded"></div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
