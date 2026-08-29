"use client";

/**
 * Single client boundary for the app's shared context.
 *
 * Order matters: AuthProvider and CompareProvider both call `useToast`, so
 * ToastProvider must wrap them.
 *
 * Keeping this in one file means the root layout stays a Server Component —
 * only this subtree is client-side.
 */

import type { ReactNode } from "react";
import { ToastProvider } from "@/components/providers/ToastProvider";
import { AuthProvider } from "@/components/providers/AuthProvider";
import { CompareProvider } from "@/components/providers/CompareProvider";

export default function AppProviders({ children }: { children: ReactNode }) {
  return (
    <ToastProvider>
      <AuthProvider>
        <CompareProvider>{children}</CompareProvider>
      </AuthProvider>
    </ToastProvider>
  );
}
