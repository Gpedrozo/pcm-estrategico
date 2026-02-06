import { useState } from 'react';
import { Search, Command } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface GlobalSearchProps {
  onOpen: () => void;
}

export function GlobalSearch({ onOpen }: GlobalSearchProps) {
  return (
    <Button
      variant="outline"
      className={cn(
        'relative h-9 w-full justify-start rounded-md bg-background text-sm text-muted-foreground sm:pr-12 md:w-40 lg:w-64'
      )}
      onClick={onOpen}
    >
      <Search className="mr-2 h-4 w-4" />
      <span className="hidden lg:inline-flex">Buscar...</span>
      <span className="inline-flex lg:hidden">Buscar...</span>
      <kbd className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
        <span className="text-xs">⌘</span>K
      </kbd>
    </Button>
  );
}
