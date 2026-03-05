import React from 'react';
import { cn } from '@/lib/utils';

export type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement>;

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <select
        className={cn(
          "flex h-10 w-full rounded-md border border-stone-200 bg-white px-3 py-2 text-sm text-stone-900",
          "ring-offset-white placeholder:text-stone-400",
          "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-500/20 focus-visible:border-amber-500",
          "disabled:cursor-not-allowed disabled:opacity-50",
          "transition-all duration-200",
          className
        )}
        ref={ref}
        {...props}
      >
        {children}
      </select>
    );
  }
);
Select.displayName = "Select";
