"use client"

import Link from "next/link"
import { Settings } from "lucide-react"

export function NavigationBar() {
  return (
    <nav className="fixed top-0 left-0 right-0 h-16 border-b border-border/50 bg-zinc-900/80 backdrop-blur-md z-50 px-6 flex items-center">
      <div className="flex items-center w-full max-w-7xl mx-auto">
        <Link 
          href="/settings" 
          className="p-2 rounded-full hover:bg-white/10 transition-colors text-white"
          aria-label="Settings"
        >
          <Settings className="h-6 w-6" />
        </Link>
      </div>
    </nav>
  )
}
