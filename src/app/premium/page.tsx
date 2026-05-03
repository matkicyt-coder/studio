
"use client"

import { useEffect, useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import { useUser, useFirestore, useDoc, useMemoFirebase } from "@/firebase"
import { NavigationBar } from "@/components/navigation-bar"
import { doc, updateDoc, increment, arrayUnion } from "firebase/firestore"
import { Button } from "@/components/ui/button"
import { PremiumBadge } from "@/components/premium-badge"
import { Check, Crown, Star, Coins, Loader2, ArrowLeft, Award, Sparkles, ShieldAlert } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { errorEmitter } from "@/firebase/error-emitter"
import { FirestorePermissionError } from "@/firebase/errors"
import { formatCurrency, calculateAge } from "@/lib/utils"

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

  const age = useMemo(() => calculateAge(userData?.dateOfBirth), [userData?.dateOfBirth])
  const isParentalMode = age > 0 && age < 18

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push("/login")
    }
  }, [user, isUserLoading, router])

  const handleBuyPremium = async (isFree: boolean = false) => {
    if (!userDocRef || !userData) return

    if (isParentalMode) {
      toast({
        variant: "destructive",
        title: "Action Restricted",
        description: "Accounts under 18 are not permitted to process upgrades.",
      })
      return
    }

    if (!isFree && (userData.coins ?? 0) < 20000) {
      toast({
        variant: "destructive",
        title: "Need more coins",
        description: "You need 20,000 coins to get your membership.",
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
          title: "Welcome aboard!",
          description: "You are now a member! Check your new badge.",
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
    { icon: Star, text: "10 Best Friends", sub: "Standard limit is 5" },
    { icon: Coins, text: "10K Monthly Coins", sub: "Free bonus every month" },
    { icon: Award, text: "Elite Badge", sub: "Visible on your profile" },
    { icon: Sparkles, text: "Priority Status", sub: "Stand out in the community" },
  ]

  if (userData?.isPremium) {
    return (
      <main className="min-h-screen bg-[#F2F4F5] dark:bg-black w-full pt-24 px-4 pb-20 font-body">
        <NavigationBar />
        <div className="max-w-4xl mx-auto space-y-12 animate-fade-in">
          <div className="flex items-center gap-6">
            <Button onClick={() => router.back()} variant="ghost" size="icon" className="rounded-full bg-white shadow-sm border border-border dark:bg-card">
              <ArrowLeft className="h-6 w-6" />
            </Button>
            <h1 className="text-4xl sm:text-7xl font-headline font-bold tracking-tight text-[#111] dark:text-white uppercase italic">
              Dashboard
            </h1>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white dark:bg-[#111] border-4 border-amber-500 p-8 rounded-[40px] shadow-xl flex flex-col items-center justify-center text-center space-y-4">
              <Crown className="h-16 w-16 text-amber-500" />
              <div>
                <p className="font-headline font-bold text-2xl uppercase italic">Lifetime</p>
                <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-[0.2em]">Always Active</p>
              </div>
            </div>

            <div className="bg-white dark:bg-[#111] border-4 border-primary p-8 rounded-[40px] shadow-xl flex flex-col items-center justify-center text-center space-y-4">
              <Coins className="h-16 w-16 text-primary" />
              <div>
                <p className="font-headline font-bold text-2xl uppercase italic">{formatCurrency(userData.coins || 0)}</p>
                <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-[0.2em]">Your Balance</p>
              </div>
            </div>

            <div className="bg-white dark:bg-[#111] border-4 border-[#ddd] dark:border-[#222] p-8 rounded-[40px] shadow-xl flex flex-col items-center justify-center text-center space-y-4">
              <PremiumBadge className="h-16 w-16" />
              <div>
                <p className="font-headline font-bold text-2xl uppercase italic">Elite</p>
                <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-[0.2em]">Badge Enabled</p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-[#111] border-4 border-[#ddd] dark:border-[#222] p-10 rounded-[40px] shadow-2xl space-y-8">
            <div className="flex items-center gap-4">
              <Sparkles className="h-8 w-8 text-amber-500" />
              <h2 className="text-3xl font-headline font-bold uppercase italic tracking-tighter">Active Benefits</h2>
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

  return (
    <main className="min-h-screen bg-[#F2F4F5] dark:bg-black w-full pt-24 px-4 pb-20 font-body">
      <NavigationBar />
      <div className="max-w-4xl mx-auto space-y-12 animate-fade-in">
        <div className="flex items-center gap-6">
          <Button onClick={() => router.back()} variant="ghost" size="icon" className="rounded-full bg-white shadow-sm border border-border dark:bg-card">
            <ArrowLeft className="h-6 w-6" />
          </Button>
          <h1 className="text-4xl sm:text-8xl font-headline font-bold tracking-tight text-[#111] dark:text-white uppercase italic">
            Premium
          </h1>
        </div>

        {isParentalMode && (
          <div className="bg-primary/10 border-2 border-primary/20 p-6 rounded-[30px] flex items-center gap-4 animate-fade-in">
            <ShieldAlert className="h-8 w-8 text-primary shrink-0" />
            <p className="text-sm font-headline font-bold text-primary uppercase tracking-tight">
              Parental Mode is active. Purchases and upgrades are restricted for your account.
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-8 bg-white dark:bg-[#111] border-4 border-[#ddd] dark:border-[#222] p-8 rounded-[40px] shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 p-6 opacity-5">
              <Crown className="h-40 w-40 text-amber-500" />
            </div>
            
            <div className="flex items-center gap-4">
              <PremiumBadge className="h-16 w-16" />
              <h2 className="text-3xl font-headline font-bold uppercase italic tracking-tighter">Membership</h2>
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
              disabled={isUpdating || isParentalMode}
              className="h-24 bg-primary text-white text-3xl font-headline font-bold uppercase tracking-tighter rounded-[30px] shadow-[0_8px_0_0_rgba(14,165,233,0.3)] hover:translate-y-[-2px] hover:shadow-[0_10px_0_0_rgba(14,165,233,0.3)] active:translate-y-[4px] active:shadow-none transition-all disabled:opacity-50 disabled:hover:translate-y-0 disabled:shadow-[0_8px_0_0_rgba(14,165,233,0.3)]"
            >
              {isUpdating ? <Loader2 className="animate-spin mr-2" /> : <Coins className="mr-3 h-8 w-8" />}
              20K Coins
            </Button>
            
            <Button 
              onClick={() => handleBuyPremium(true)}
              disabled={isUpdating || isParentalMode}
              variant="outline"
              className="h-16 bg-white dark:bg-[#111] border-4 border-[#ddd] dark:border-[#222] font-headline font-bold uppercase text-xs tracking-widest rounded-[24px] hover:bg-accent disabled:opacity-50"
            >
              Get it Free
            </Button>
          </div>
        </div>
      </div>
    </main>
  )
}
