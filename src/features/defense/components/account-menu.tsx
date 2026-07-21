'use client';

import { LogOut } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { buttonVariants } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

export function AccountMenu() {
  const { user, logout } = useAuth();
  const name = user?.displayName ?? user?.email ?? 'Guest';
  const initial = name.trim().charAt(0).toUpperCase() || 'G';

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="Account menu"
          className={cn(buttonVariants({ variant: 'ghost', size: 'icon' }), 'rounded-full')}
        >
          <span
            aria-hidden="true"
            className="flex size-7 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary"
          >
            {initial}
          </span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuLabel className="truncate">{name}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => void logout()}>
          <LogOut className="size-4" aria-hidden="true" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
