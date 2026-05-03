
import { cn } from "@/lib/utils"

export function VerifiedBadge({ className }: { className?: string }) {
  return (
    <svg 
      viewBox="0 0 100 100" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className={cn("shrink-0", className)}
    >
      <circle cx="50" cy="50" r="40" fill="#0EA5E9"/>
      <path 
        d="M35 52L46 63L68 38" 
        stroke="white" 
        strokeWidth="7" 
        strokeLinecap="round" 
        strokeLinejoin="round"
      />
    </svg>
  )
}
