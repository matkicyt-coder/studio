
import { cn } from "@/lib/utils"

export function PremiumBadge({ className }: { className?: string }) {
  return (
    <svg 
      viewBox="0 0 100 100" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className={cn("shrink-0", className)}
    >
      <circle cx="50" cy="50" r="40" fill="#F59E0B"/>
      <path 
        d="M30 40L40 60L50 40L60 60L70 40V70H30V40Z" 
        fill="white"
      />
      <circle cx="30" cy="35" r="4" fill="white"/>
      <circle cx="50" cy="35" r="4" fill="white"/>
      <circle cx="70" cy="35" r="4" fill="white"/>
    </svg>
  )
}
