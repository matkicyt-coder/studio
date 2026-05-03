
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

  const handleBuyPremium = async (type: 'monthly' | 'lifetime', useCoins: boolean = false) => {
    if (!userDocRef || !userData || !db) return
    
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
      // Grant initial 10k monthly coins
      updateData.coins = useCoins ? increment(-20000 + 10000) : increment(10000)
    }

    updateDoc(userDocRef, updateData).then(() => {
      addDoc(collection(db, "transactions"), {
        userId: user!.uid,
        amount: useCoins ? -20000 : 0,
        type: "premium_purchase",
        createdAt: now.toISOString()
      })
      if (type === 'monthly') {
        addDoc(collection(db, "transactions"), {
          userId: user!.uid,
          amount: 10000,
          type: "premium_grant",
          createdAt: now.toISOString()
        })
      }
      toast({ title: type === 'lifetime' ? "Lifetime Membership Active!" : "Monthly Pack Activated!" })
    }).finally(() => setIsUpdating(false))
  }

  const handleCancelSubscription = async () => {
    if (!userDocRef) return
    setIsUpdating(true)
    updateDoc(userDocRef, {
      premiumStatus: 'cancelled'
    }).then(() => {
      toast({ title: "Subscription Cancelled", description: "Your perks remain until the end of the period." })
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
          <div className="space-y-1">
            <h1 className="text-4xl font-headline font-bold uppercase tracking-tight">Premium Club</h1>
            <p className="text-[10px] font-headline font-bold text-muted-foreground uppercase tracking-widest">Select your membership level</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Monthly Pack */}
          <div className={`p-8 bg-card border rounded-[40px] space-y-6 relative flex flex-col justify-between ${isMonthlyActive ? 'border-primary shadow-lg ring-1 ring-primary' : ''}`}>
            {isMonthlyActive && <Badge className="absolute -top-3 left-8 uppercase px-4 py-1">Active Pack</Badge>}
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <Calendar className="h-12 w-12 text-primary" />
                <div className="text-right">
                  <p className="text-2xl font-headline font-bold uppercase">Monthly Pack</p>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase">Renewable access</p>
                </div>
              </div>
              <ul className="space-y-4">
                <li className="flex items-center gap-3"><Coins className="h-5 w-5 text-primary" /><span className="text-sm font-bold">10,000 Monthly Coins</span></li>
                <li className="flex items-center gap-3"><Star className="h-5 w-5 text-primary" /><span className="text-sm">Extended Best Friend Limits</span></li>
                <li className="flex items-center gap-3"><Award className="h-5 w-5 text-primary" /><span className="text-sm">Premium Profile Badge</span></li>
                <li className="flex items-center gap-3"><Sparkles className="h-5 w-5 text-primary" /><span className="text-sm">Priority Support</span></li>
              </ul>
            </div>
            <div className="space-y-3 pt-6">
              {isMonthlyActive ? (
                <Button variant="outline" onClick={handleCancelSubscription} disabled={isUpdating} className="w-full h-14 font-headline font-bold uppercase rounded-2xl gap-2">
                  <XCircle className="h-5 w-5" /> Cancel Pack
                </Button>
              ) : isLifetimeActive ? (
                <Button disabled className="w-full h-14 opacity-50 font-headline font-bold uppercase rounded-2xl">Lifetime Active</Button>
              ) : (
                <>
                  <Button onClick={() => handleBuyPremium('monthly', true)} disabled={isUpdating} className="w-full h-14 font-headline font-bold uppercase rounded-2xl">20,000 Coins / Mo</Button>
                  <Button variant="outline" onClick={() => handleBuyPremium('monthly', false)} disabled={isUpdating} className="w-full h-12 font-headline font-bold uppercase rounded-xl">$0.00 / Mo</Button>
                </>
              )}
            </div>
          </div>

          {/* Lifetime Member */}
          <div className={`p-8 bg-card border rounded-[40px] space-y-6 relative flex flex-col justify-between ${isLifetimeActive ? 'border-amber-500 shadow-lg ring-1 ring-amber-500' : ''}`}>
            {isLifetimeActive && <Badge className="absolute -top-3 left-8 bg-amber-500 hover:bg-amber-600 uppercase px-4 py-1">Lifetime status</Badge>}
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <ShieldCheck className="h-12 w-12 text-amber-500" />
                <div className="text-right">
                  <p className="text-2xl font-headline font-bold uppercase">Lifetime Member</p>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase">One-time payment</p>
                </div>
              </div>
              <ul className="space-y-4">
                <li className="flex items-center gap-3"><Award className="h-5 w-5 text-amber-500" /><span className="text-sm font-bold text-amber-500 uppercase">Forever Perks</span></li>
                <li className="flex items-center gap-3"><Star className="h-5 w-5 text-amber-500" /><span className="text-sm">No Recurring Payments</span></li>
                <li className="flex items-center gap-3"><Award className="h-5 w-5 text-amber-500" /><span className="text-sm">Premium Profile Badge</span></li>
                <li className="flex items-center gap-3"><Sparkles className="h-5 w-5 text-amber-500" /><span className="text-sm">Priority Support</span></li>
              </ul>
            </div>
            <div className="space-y-3 pt-6">
              {isLifetimeActive ? (
                <div className="w-full h-14 flex items-center justify-center bg-amber-500/10 rounded-2xl border border-amber-500/20">
                  <span className="font-headline font-bold uppercase text-amber-500">Member for Life</span>
                </div>
              ) : (
                <Button onClick={() => handleBuyPremium('lifetime', false)} disabled={isUpdating} className="w-full h-20 bg-amber-500 hover:bg-amber-600 text-white text-xl font-headline font-bold uppercase rounded-3xl">
                  $0.00 One-Time
                </Button>
              )}
            </div>
          </div>
        </div>

        <div className="p-8 bg-muted/20 border border-dashed rounded-[40px] text-center">
          <p className="text-xs text-muted-foreground font-body max-w-lg mx-auto italic">
            Monthly packs grant a 10,000 coin stipend every 30 days while active. Lifetime membership does not include monthly grants but removes all subscription requirements forever.
          </p>
        </div>
      </div>
    </main>
  )
}
