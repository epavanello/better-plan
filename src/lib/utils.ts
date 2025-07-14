import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getCallbackUrl(platform: string): string {
  if (typeof window !== "undefined") {
    return `${window.location.origin}/api/integrations/${platform}/callback`
  }
  return `/api/integrations/${platform}/callback`
}
