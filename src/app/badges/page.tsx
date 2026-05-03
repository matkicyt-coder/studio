
"use client"

import { NavigationBar } from "@/components/navigation-bar"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Users, ShieldCheck, Crown, Info } from "lucide-react"
import { useRouter } from "next/navigation"

const ALL_BADGES = [
  {
    id: "friendship",
    name: "Friendship",
    description: "Earned by making your first friend in the terminal.",
    icon: Users,
    color: "text-blue-500",
    bg: "bg-blue-500/10"
  },
  {
    id: "admin",
    name: "Administrator",
    description: "Reserved for system administrators and moderators.",
    icon: ShieldCheck,
    color: "text-primary",
    bg: "bg-primary/10"
  },
  {
    id: "premium",
    name: "Welcome to the Premium Club",
    description: "Awarded to elite users who upgrade to Premium status.",
    icon: Crown,
    color: "text-amber-500",
    bg: "bg-amber-500/10"
  }
]

export default function BadgesPage() {
  const router = useRouter()

  return (
    <main className="min-h-screen bg-background w-full pt-24 px-4 pb-20">
      <NavigationBar />
      <div className="max-w-3xl mx-auto space-y-12 animate-fade-in">
        <div className="flex items-center gap-4">
          <Button onClick={() => router.back()} variant="ghost" size="icon" className="rounded-full">
            <ArrowLeft className="h-6 w-6" />
          </Button>
          <div className="space-y-1">
            <h1 className="text-3xl sm:text-5xl font-headline font-bold tracking-tighter uppercase">Badge Registry</h1>
            <p className="text-[10px] font-headline font-bold text-muted-foreground uppercase tracking-widest">Digital Terminal Achievements</p>
          </div>
        </div>

        <div className="grid gap-6">
          <div className="p-6 bg-card border border-border rounded-3xl space-y-4">
            <div className="flex items-center gap-2 text-primary">
              <Info className="h-5 w-5" />
              <h2 className="font-headline font-bold uppercase tracking-tight">About Badges</h2>
            </div>
            <p className="text-sm text-muted-foreground font-body leading-relaxed">
              Badges represent your status and milestones within the digital portal. They are visible to others on your profile and can be earned through system interactions or granted by administrators.
            </p>
          </div>

          <div className="space-y-4">
            <h3 className="text-[10px] font-headline font-bold text-muted-foreground uppercase tracking-[0.2em] px-2">Available Badges</h3>
            <div className="grid gap-4">
              {ALL_BADGES.map((badge) => (
                <div key={badge.id} className="flex items-center gap-6 p-6 rounded-3xl bg-card border border-border shadow-sm group hover:border-primary/50 transition-all">
                  <div className={`w-16 h-16 ${badge.bg} rounded-2xl flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform`}>
                    <badge.icon className={`h-8 w-8 ${badge.color}`} />
                  </div>
                  <div className="space-y-1">
                    <h4 className="font-headline font-bold text-lg uppercase tracking-tight">{badge.name}</h4>
                    <p className="text-sm text-muted-foreground">{badge.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
