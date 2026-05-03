
"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useUser, useFirestore, useDoc, useMemoFirebase } from "@/firebase"
import { NavigationBar } from "@/components/navigation-bar"
import { doc, updateDoc, increment, arrayUnion } from "firebase/firestore"
import { Button } from "@/components/ui/button"
import { PremiumBadge } from "@/components/premium-badge"
import { Check, Crown, Star, Coins, Loader2, ArrowLeft, Award, Sparkles, ShieldCheck } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { errorEmitter } from "@/firebase/error-emitter"
import { FirestorePermissionError } from "@/firebase/errors"
import { formatCurrency } from "@/lib/utils"

export default function PremiumPage() {
  const { user, isUserLoading } = useUser()
  const db = useFirestore()
  const router = useRouter()
  const { toast } = useToast()
  const [isUpdating, setIsUpdating] = useState(false)

  const userDocRef = useMemoFirebase(() => {
    if (!db || !user?.uid) return null
    return doc(db, "users", user.uid)
  }, [db, user?.uid])

  const { data: userData } = useDoc(userDocRef)

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push("/login")
    }
  }, [user, isUserLoading, router])

  const handleBuyPremium = async (isFree: boolean = false) => {
    if (!userDocRef || !userData) return

    if (!isFree && (userData.coins ?? 0) < 20000) {
      toast({
        variant: "destructive",
        title: "Insufficient Coins",
        description: "You need 20,000 coins to upgrade to Premium.",
      })
      return
    }

    setIsUpdating(true)
    const updateData = {
      isPremium: true,
      coins: isFree ? userData.coins : increment(-20000),
      badges: arrayUnion("premium")
    }

    updateDoc(userDocRef, updateData)
      .then(() => {
        toast({
          title: "Premium Activated",
          description: "Welcome to the Premium Club! You've earned your exclusive badge.",
        })
      })
      .catch(async (error) => {
        errorEmitter.emit("permission-error", new FirestorePermissionError({
          path: userDocRef.path,
          operation: "update",
          requestResourceData: updateData,
        }))
      })
      .finally(() => setIsUpdating(false))
  }

  if (isUserLoading || !user) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    )
  }

  const perks = [
    { icon: Star, text: "10 Best Friends", sub: "Double the standard limit" },
    { icon: Coins, text: "10K Monthly Coins", sub: "Bonus currency every month" },
    { icon: Award, text: "Elite Badge", sub: "Exclusive badge next to your name" },
    { icon: Sparkles, text: "Priority Status", sub: "Stand out in the community" },
  ]

  // Dashboard View for Premium Members
  if (userData?.isPremium) {
    return (
      <main className="min-h-screen bg-[#F2F4F5] dark:bg-black w-full pt-24 px-4 pb-20 font-body">
        <NavigationBar />
        <div className="max-w-4xl mx-auto space-y-12 animate-fade-in">
          <div className="flex items-center gap-6">
            <Button onClick={() => router.back()} variant="ghost" size="icon" className="rounded-full bg-white shadow-sm border border-border dark:bg-card">
              <ArrowLeft className="h-6 w-6" />
            </Button>
            <h1 className="text-4xl sm:text-6xl font-headline font-bold tracking-tight text-[#111] dark:text-white uppercase italic">
              Premium Dashboard
            </h1>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Status Card */}
            <div className="bg-white dark:bg-[#111] border-4 border-amber-500 p-8 rounded-[40px] shadow-xl flex flex-col items-center justify-center text-center space-y-4">
              <Crown className="h-16 w-16 text-amber-500" />
              <div>
                <p className="font-headline font-bold text-2xl uppercase italic">Lifetime Member</p>
                <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-[0.2em]">Active Forever</p>
              </div>
            </div>

            {/* Coins Card */}
            <div className="bg-white dark:bg-[#111] border-4 border-primary p-8 rounded-[40px] shadow-xl flex flex-col items-center justify-center text-center space-y-4">
              <Coins className="h-16 w-16 text-primary" />
              <div>
                <p className="font-headline font-bold text-2xl uppercase italic">{formatCurrency(userData.coins || 0)}</p>
                <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-[0.2em]">Current Balance</p>
              </div>
            </div>

            {/* Badge Card */}
            <div className="bg-white dark:bg-[#111] border-4 border-[#ddd] dark:border-[#222] p-8 rounded-[40px] shadow-xl flex flex-col items-center justify-center text-center space-y-4">
              <PremiumBadge className="h-16 w-16" />
              <div>
                <p className="font-headline font-bold text-2xl uppercase italic">Elite Status</p>
                <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-[0.2em]">Profile Badge Active</p>
              </div>
            </div>
          </div>

          {/* Perks Section */}
          <div className="bg-white dark:bg-[#111] border-4 border-[#ddd] dark:border-[#222] p-10 rounded-[40px] shadow-2xl space-y-8">
            <div className="flex items-center gap-4">
              <Sparkles className="h-8 w-8 text-amber-500" />
              <h2 className="text-3xl font-headline font-bold uppercase italic tracking-tighter">Your Active Perks</h2>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
              {perks.map((perk, i) => (
                <div key={i} className="flex items-center gap-5 p-4 rounded-3xl bg-accent/10">
                  <div className="bg-white dark:bg-black p-4 rounded-2xl shadow-sm">
                    <perk.icon className="h-8 w-8 text-primary" />
                  </div>
                  <div>
                    <p className="font-headline font-bold text-xl uppercase tracking-tight">{perk.text}</p>
                    <p className="text-[11px] text-muted-foreground uppercase font-bold tracking-widest">{perk.sub}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    )
  }

  // Standard Upgrade Page View
  return (
    <main className="min-h-screen bg-[#F2F4F5] dark:bg-black w-full pt-24 px-4 pb-20 font-body">
      <NavigationBar />
      <div className="max-w-4xl mx-auto space-y-12 animate-fade-in">
        <div className="flex items-center gap-6">
          <Button onClick={() => router.back()} variant="ghost" size="icon" className="rounded-full bg-white shadow-sm border border-border dark:bg-card">
            <ArrowLeft className="h-6 w-6" />
          </Button>
          <h1 className="text-4xl sm:text-6xl font-headline font-bold tracking-tight text-[#111] dark:text-white uppercase italic">
            Go Premium
          </h1>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-8 bg-white dark:bg-[#111] border-4 border-[#ddd] dark:border-[#222] p-8 rounded-[40px] shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 p-6 opacity-5">
              <Crown className="h-40 w-40 text-amber-500" />
            </div>
            
            <div className="flex items-center gap-4">
              <PremiumBadge className="h-16 w-16" />
              <h2 className="text-3xl font-headline font-bold uppercase italic tracking-tighter">Member Perks</h2>
            </div>

            <ul className="space-y-6 pt-4">
              {perks.map((perk, i) => (
                <li key={i} className="flex items-center gap-5">
                  <div className="bg-[#EBF5FF] dark:bg-[#1A202C] p-3 rounded-2xl">
                    <perk.icon className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <p className="font-headline font-bold text-lg uppercase tracking-tight">{perk.text}</p>
                    <p className="text-[11px] text-muted-foreground uppercase font-bold tracking-widest">{perk.sub}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div className="flex flex-col justify-center gap-6">
            <Button 
              onClick={() => handleBuyPremium(false)}
              disabled={isUpdating}
              className="h-24 bg-primary text-white text-2xl font-headline font-bold uppercase tracking-tighter rounded-[30px] shadow-[0_8px_0_0_rgba(14,165,233,0.3)] hover:translate-y-[-2px] hover:shadow-[0_10px_0_0_rgba(14,165,233,0.3)] active:translate-y-[4px] active:shadow-none transition-all"
            >
              {isUpdating ? <Loader2 className="animate-spin mr-2" /> : <Coins className="mr-3 h-8 w-8" />}
              Upgrade for 20K Coins
            </Button>
            
            <Button 
              onClick={() => handleBuyPremium(true)}
              disabled={isUpdating}
              variant="outline"
              className="h-16 bg-white dark:bg-[#111] border-4 border-[#ddd] dark:border-[#222] font-headline font-bold uppercase text-xs tracking-widest rounded-[24px] hover:bg-accent"
            >
              Free Lifetime Pass
            </Button>
            
            <p className="text-center text-[11px] text-muted-foreground font-bold uppercase tracking-[0.2em] px-8 leading-relaxed">
              Join the club and unlock all elite features forever.
            </p>
          </div>
        </div>
      </div>
    </main>
  )
}
