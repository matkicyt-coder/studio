import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(value: number): string {
  const absValue = Math.abs(value);
  const sign = value < 0 ? '-' : '';
  
  if (absValue >= 1000000) {
    return sign + (absValue / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
  }
  if (absValue >= 1000) {
    return sign + (absValue / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
  }
  return value.toString();
}

export function calculateAge(dobString: string | undefined): number {
  if (!dobString) return 0;
  const birthDate = new Date(dobString);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
}
