// Toast hook backed by Sonner.
//
// This is a thin adapter that PRESERVES the existing call-site contract used
// throughout the app:
//
//   const { toast } = useToast()
//   toast({ title, description?, variant?: 'default' | 'destructive' })
//
// It delegates to the Sonner <Toaster /> mounted once at the app root
// (see src/components/providers.tsx). Nothing here renders UI itself.
'use client';

import { useCallback } from 'react';
import { toast as sonnerToast } from 'sonner';

interface ToastOptions {
  title: string;
  description?: string;
  variant?: 'default' | 'destructive';
}

// Heuristic: default-variant toasts whose title reads as a positive outcome are
// shown with Sonner's green "success" styling; everything else stays neutral.
// Destructive is always mapped to the red "error" style.
const SUCCESS_TITLE_RE =
  /\b(success|saved|created|updated|deleted|removed|added|recorded|assigned|paused|resumed|initialized|initialised|sent|published|complete|completed|done)\b/i;

export function useToast() {
  const toast = useCallback(({ title, description, variant = 'default' }: ToastOptions) => {
    const options = description ? { description } : undefined;

    if (variant === 'destructive') {
      return sonnerToast.error(title, options);
    }

    if (SUCCESS_TITLE_RE.test(title)) {
      return sonnerToast.success(title, options);
    }

    return sonnerToast(title, options);
  }, []);

  return { toast };
}
