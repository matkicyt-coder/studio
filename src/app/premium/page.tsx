
"use client"

import { useEffect, useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import { useUser, useFirestore, useDoc, useMemoFirebase } from "@/firebase"
import { NavigationBar } from "@/components/navigation-bar"
import { doc, updateDoc, increment, arrayUnion, addDoc, collection } from "firebase/firestore"
import { Button } from "@/components/ui/button"
import { PremiumBadge } from "@/components/premium-badge"
import { Crown, Star, Coins, Loader2, ArrowLeft, Award, Sparkles } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

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
    if (!isUserLoading && !user) router.push("/login")
  }, [user, isUserLoading, router])

  const handleBuyPremium = async (isFree: boolean = false) => {
    if (!userDocRef || !userData) return
    if (!isFree && userData.coins < 20000) {
      toast({ variant: "destructive", title: "Ineligible", description: "You need 20,000 coins." })
      return
    }

    setIsUpdating(true)
    const updateData = {
      isPremium: true,
      coins: isFree ? userData.coins : increment(-20000),
      badges: arrayUnion("premium")
    }

    updateDoc(userDocRef, updateData).then(() => {
      addDoc(collection(db, "transactions"), {
        userId: user!.uid,
        amount: isFree ? 0 : -20000,
        type: "premium_purchase",
        createdAt: new Date().toISOString()
      })
      toast({ title: "Welcome to Premium Club!" })
    }).finally(() => setIsUpdating(false))
  }

  if (isUserLoading || !user) return null

  return (
    <main className="min-h-screen bg-background pt-24 px-4 pb-20">
      <NavigationBar />
      <div className="max-w-3xl mx-auto space-y-12 animate-fade-in">
        <div className="flex items-center gap-6">
          <Button onClick={() => router.back()} variant="ghost" size="icon" className="rounded-full"><ArrowLeft className="h-6 w-6" /></Button>
          <h1 className="text-4xl font-headline font-bold uppercase tracking-tight">Premium</h1>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="p-8 bg-card border rounded-[40px] space-y-6">
            <PremiumBadge className="h-16 w-16" />
            <h2 className="text-2xl font-headline font-bold uppercase italic">Perks</h2>
            <ul className="space-y-4">
              <li className="flex items-center gap-3"><Star className="h-5 w-5 text-primary" /><span className="text-sm">Extended Best Friend Limits</span></li>
              <li className="flex items-center gap-3"><Award className="h-5 w-5 text-primary" /><span className="text-sm">Premium Profile Badge</span></li>
              <li className="flex items-center gap-3"><Sparkles className="h-5 w-5 text-primary" /><span className="text-sm">Priority Support</span></li>
            </ul>
          </div>
          <div className="flex flex-col justify-center gap-4">
            <Button onClick={() => handleBuyPremium(false)} disabled={isUpdating} className="h-20 text-xl font-headline font-bold uppercase rounded-[24px]">20,000 Coins</Button>
            <Button variant="outline" onClick={() => handleBuyPremium(true)} disabled={isUpdating} className="h-12 font-headline font-bold uppercase rounded-[16px]">Get Free (Beta)</Button>
          </div>
        </div>
      </div>
    </main>
  )
}
