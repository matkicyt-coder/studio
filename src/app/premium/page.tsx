
"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useUser, useFirestore, useDoc, useMemoFirebase } from "@/firebase"
import { NavigationBar } from "@/components/navigation-bar"
import { doc, updateDoc, increment } from "firebase/firestore"
import { Button } from "@/components/ui/button"
import { PremiumBadge } from "@/components/premium-badge"
import { Check, Crown, Star, Coins, Loader2, ArrowLeft } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { errorEmitter } from "@/firebase/error-emitter"
import { FirestorePermissionError } from "@/firebase/errors"

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
        title: "Insufficient Balance",
        description: "You need 20,000 coins to upgrade to Premium.",
      })
      return
    }

    setIsUpdating(true)
    const updateData = {
      isPremium: true,
      coins: isFree ? userData.coins : increment(-20000)
    }

    updateDoc(userDocRef, updateData)
      .then(() => {
        toast({
          title: "PREMIUM ACTIVATED",
          description: "Welcome to the elite tier of the terminal.",
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

  return (
    <main className="min-h-screen bg-background w-full pt-24 px-4 pb-20">
      <NavigationBar />
      <div className="max-w-4xl mx-auto space-y-12 animate-fade-in">
        <div className="flex items-center gap-4">
          <Button onClick={() => router.back()} variant="ghost" size="icon" className="rounded-full">
            <ArrowLeft className="h-6 w-6" />
          </Button>
          <h1 className="text-3xl sm:text-5xl font-headline font-bold tracking-tighter uppercase">Premium Terminal</h1>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-6 bg-card border border-border p-8 rounded-3xl shadow-xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <Crown className="h-24 w-24 text-primary" />
            </div>
            
            <div className="flex items-center gap-3">
              <PremiumBadge className="h-12 w-12" />
              <h2 className="text-2xl font-headline font-bold uppercase">Membership Benefits</h2>
            </div>

            <ul className="space-y-4 pt-4">
              {[
                { icon: Star, text: "UP TO 10 BEST FRIENDS", sub: "Standard limit is 5" },
                { icon: Coins, text: "10,000 MONTHLY COINS", sub: "Exclusive allowance" },
                { icon: Check, text: "ELITE PREMIUM BADGE", sub: "Visible on profile & search" },
                { icon: Crown, text: "PRIORITY TERMINAL ACCESS", sub: "Special status" },
              ].map((benefit, i) => (
                <li key={i} className="flex items-start gap-3">
                  <div className="mt-1 bg-primary/10 p-1.5 rounded-full">
                    <benefit.icon className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="font-headline font-bold text-sm uppercase tracking-tight">{benefit.text}</p>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-widest">{benefit.sub}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div className="flex flex-col justify-center space-y-4">
            {userData?.isPremium ? (
              <div className="bg-primary/5 border border-primary/20 p-8 rounded-3xl text-center space-y-4">
                <Crown className="h-12 w-12 text-primary mx-auto" />
                <h3 className="text-xl font-headline font-bold uppercase">PREMIUM ACTIVE</h3>
                <p className="text-muted-foreground text-xs uppercase tracking-widest font-headline">Your status is permanent and verified.</p>
              </div>
            ) : (
              <>
                <Button 
                  onClick={() => handleBuyPremium(false)}
                  disabled={isUpdating}
                  className="h-20 bg-primary text-primary-foreground text-xl font-headline font-bold uppercase tracking-tighter rounded-2xl shadow-lg hover:scale-[1.02] transition-transform"
                >
                  {isUpdating ? <Loader2 className="animate-spin mr-2" /> : <Coins className="mr-2 h-6 w-6" />}
                  UPGRADE FOR 20K COINS
                </Button>
                <Button 
                  onClick={() => handleBuyPremium(true)}
                  disabled={isUpdating}
                  variant="outline"
                  className="h-14 font-headline font-bold uppercase text-[10px] tracking-widest rounded-xl"
                >
                  GET PERMANENT PREMIUM (FREE)
                </Button>
                <p className="text-center text-[10px] text-muted-foreground font-headline uppercase tracking-widest">
                  Unlock all features permanently. No recurring fees.
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    </main>
  )
}
