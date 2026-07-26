'use client';

import { Trash2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/**
 * One confirm-then-delete control, shared by every surface that lists sessions.
 * Deleting the session row cascades its transcript and scores; the copy stays
 * within what actually happens.
 */
export function RemoveSessionButton({ title, onConfirm, showLabel = false, className }: {
  title: string;
  onConfirm: () => void;
  /** Rows stay icon-only; roomier surfaces can spell it out. */
  showLabel?: boolean;
  className?: string;
}) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <button
          type="button"
          aria-label={`Remove ${title}`}
          className={cn(
            buttonVariants({ variant: 'ghost', size: showLabel ? 'sm' : 'icon' }),
            'shrink-0 text-muted-foreground hover:text-destructive',
            className,
          )}
        >
          <Trash2 className="size-4" aria-hidden="true" />
          {showLabel ? 'Remove' : null}
        </button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Remove this rehearsal?</AlertDialogTitle>
          <AlertDialogDescription>
            {title} will be deleted, along with its transcript and report. This cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Keep it</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} className={cn(buttonVariants({ variant: 'destructive' }))}>
            Remove
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
