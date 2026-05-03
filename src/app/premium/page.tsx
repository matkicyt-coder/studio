
"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useUser, useFirestore, useDoc, useMemoFirebase } from "@/firebase"
import { NavigationBar } from "@/components/navigation-bar"
import { doc, updateDoc, increment, arrayUnion, addDoc, collection } from "firebase/firestore"
import { Button } from "@/components/ui/button"
import { PremiumBadge } from "@/components/premium-badge"
import { Crown, Star, Coins, Loader2, ArrowLeft, Award, Sparkles, XCircle, Calendar, ShieldCheck } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { Badge } from "@/components/ui/badge"

export default function PremiumPage() {
  const { user, userDocId, isUserLoading } = useUser()
  const db = useFirestore()
  const router = useRouter()
  const { toast } = useToast()
  const [isUpdating, setIsUpdating] = useState(false)

  const userDocRef = useMemoFirebase(() => {
    if (!db || !userDocId) return null
    return doc(db, "users", userDocId)
  }, [db, userDocId])
  const { data: userData } = useDoc(userDocRef)

  useEffect(() => {
    if (!isUserLoading && !user) router.push("/login")
  }, [user, isUserLoading, router])

  const handleBuyPremium = async (type: 'monthly' | 'lifetime', useCoins: boolean = false) => {
    if (!userDocRef || !userData || !db || !userDocId) return
    if (useCoins && userData.coins < 20000) {
      toast({ variant: "destructive", title: "Ineligible", description: "You need 20,000 coins." })
      return
    }

    setIsUpdating(true)
    const now = new Date()
    const expiry = new Date()
    expiry.setDate(now.getDate() + 30)

    const updateData: any = {
      isPremium: true,
      premiumType: type,
      premiumStatus: 'active',
      coins: useCoins ? increment(-20000) : userData.coins,
      badges: arrayUnion("premium")
    }

    if (type === 'monthly') {
      updateData.premiumExpiry = expiry.toISOString()
      updateData.lastPremiumGrant = now.toISOString()
      updateData.coins = useCoins ? increment(-20000 + 10000) : increment(10000)
    }

    updateDoc(userDocRef, updateData).then(() => {
      addDoc(collection(db, "transactions"), { userId: userDocId, amount: useCoins ? -20000 : 0, type: "premium_purchase", createdAt: now.toISOString() })
      if (type === 'monthly') addDoc(collection(db, "transactions"), { userId: userDocId, amount: 10000, type: "premium_grant", createdAt: now.toISOString() })
      toast({ title: "Membership Active!" })
    }).finally(() => setIsUpdating(false))
  }

  if (isUserLoading || !user) return null

  const isMonthlyActive = userData?.premiumType === 'monthly' && userData?.premiumStatus === 'active'
  const isLifetimeActive = userData?.premiumType === 'lifetime'

  return (
    <main className="min-h-screen bg-background pt-24 px-4 pb-20">
      <NavigationBar />
      <div className="max-w-4xl mx-auto space-y-12 animate-fade-in">
        <div className="flex items-center gap-6">
          <Button onClick={() => router.back()} variant="ghost" size="icon" className="rounded-full"><ArrowLeft className="h-6 w-6" /></Button>
          <h1 className="text-4xl font-headline font-bold uppercase">Premium Club</h1>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className={`p-8 bg-card border rounded-[40px] space-y-6 ${isMonthlyActive ? 'border-primary shadow-lg ring-1 ring-primary' : ''}`}>
            <div className="flex items-center justify-between"><Calendar className="h-12 w-12 text-primary" /><p className="text-2xl font-headline font-bold">Monthly Pack</p></div>
            <ul className="space-y-4">
              <li className="flex items-center gap-3"><Coins className="h-5 w-5 text-primary" /> 10,000 Monthly Coins</li>
              <li className="flex items-center gap-3"><Star className="h-5 w-5 text-primary" /> Extended Limits</li>
            </ul>
            <Button onClick={() => handleBuyPremium('monthly', true)} disabled={isUpdating || isMonthlyActive || isLifetimeActive} className="w-full h-14 font-bold uppercase rounded-2xl">20,000 Coins / Mo</Button>
          </div>
          <div className={`p-8 bg-card border rounded-[40px] space-y-6 ${isLifetimeActive ? 'border-amber-500 shadow-lg ring-1 ring-amber-500' : ''}`}>
            <div className="flex items-center justify-between"><ShieldCheck className="h-12 w-12 text-amber-500" /><p className="text-2xl font-headline font-bold">Lifetime Member</p></div>
            <Button onClick={() => handleBuyPremium('lifetime', false)} disabled={isUpdating || isLifetimeActive} className="w-full h-20 bg-amber-500 text-white font-bold uppercase rounded-3xl">$0.00 One-Time</Button>
          </div>
        </div>
      </div>
    </main>
  )
}
