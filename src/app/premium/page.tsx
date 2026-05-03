
"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useUser, useFirestore, useDoc, useMemoFirebase } from "@/firebase"
import { NavigationBar } from "@/components/navigation-bar"
import { doc, updateDoc, increment, arrayUnion, addDoc, collection } from "firebase/firestore"
import { Button } from "@/components/ui/button"
import { PremiumBadge } from "@/components/premium-badge"
import { Crown, Star, Coins, Loader2, ArrowLeft, Award, Sparkles, Calendar, ShieldCheck } from "lucide-react"
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
      toast({ 
        variant: "destructive", 
        title: "Insufficient Balance", 
        description: "You need at least 20,000 coins to activate the Monthly Pack." 
      })
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
      // Grant initial 10k coins if it's a monthly pack
      updateData.coins = useCoins ? increment(-20000 + 10000) : increment(10000)
    }

    updateDoc(userDocRef, updateData).then(() => {
      addDoc(collection(db, "transactions"), { 
        userId: userDocId, 
        amount: useCoins ? -20000 : 0, 
        type: "premium_purchase", 
        createdAt: now.toISOString() 
      })
      if (type === 'monthly') {
        addDoc(collection(db, "transactions"), { 
          userId: userDocId, 
          amount: 10000, 
          type: "premium_grant", 
          createdAt: now.toISOString() 
        })
      }
      toast({ title: "Membership Active!", description: "Welcome to the elite terminal." })
    }).finally(() => setIsUpdating(false))
  }

  const handleCancelSubscription = async () => {
    if (!userDocRef) return
    setIsUpdating(true)
    updateDoc(userDocRef, {
      premiumStatus: 'cancelled'
    }).then(() => {
      toast({ title: "Subscription Cancelled", description: "You will retain perks until the current period ends." })
    }).finally(() => setIsUpdating(false))
  }

  if (isUserLoading || !user) return null

  const isMonthlyActive = userData?.premiumType === 'monthly' && userData?.premiumStatus === 'active'
  const isMonthlyCancelled = userData?.premiumType === 'monthly' && userData?.premiumStatus === 'cancelled'
  const isLifetimeActive = userData?.premiumType === 'lifetime'

  return (
    <main className="min-h-screen bg-background pt-24 px-4 pb-20">
      <NavigationBar />
      <div className="max-w-4xl mx-auto space-y-12 animate-fade-in">
        <div className="flex items-center gap-6">
          <Button onClick={() => router.back()} variant="ghost" size="icon" className="rounded-full">
            <ArrowLeft className="h-6 w-6" />
          </Button>
          <div className="space-y-1">
            <h1 className="text-4xl font-headline font-bold uppercase tracking-tight">Premium Club</h1>
            <p className="text-[10px] font-headline font-bold text-muted-foreground uppercase tracking-widest">Select your terminal level</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className={`p-8 bg-card border rounded-[40px] flex flex-col justify-between space-y-6 transition-all ${isMonthlyActive ? 'border-primary shadow-lg ring-1 ring-primary' : 'hover:border-primary/50'}`}>
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <Calendar className="h-12 w-12 text-primary" />
                <div className="text-right">
                  <p className="text-2xl font-headline font-bold uppercase">Monthly Pack</p>
                  {isMonthlyActive && <Badge className="bg-primary/10 text-primary border-primary/20 text-[8px] uppercase font-bold">ACTIVE</Badge>}
                </div>
              </div>
              <ul className="space-y-4">
                <li className="flex items-center gap-3 text-sm font-medium">
                  <Coins className="h-5 w-5 text-primary" /> 10,000 Monthly Coin Stipend
                </li>
                <li className="flex items-center gap-3 text-sm font-medium">
                  <Star className="h-5 w-5 text-primary" /> Pin up to 10 Best Friends
                </li>
                <li className="flex items-center gap-3 text-sm font-medium">
                  <Award className="h-5 w-5 text-primary" /> Premium Club Badge
                </li>
              </ul>
            </div>
            
            <div className="space-y-3 pt-6 border-t border-border/50">
              {isMonthlyActive ? (
                <Button onClick={handleCancelSubscription} disabled={isUpdating} variant="outline" className="w-full h-14 border-destructive text-destructive hover:bg-destructive/10 font-bold uppercase rounded-2xl">
                  Cancel Subscription
                </Button>
              ) : isMonthlyCancelled ? (
                <div className="text-center p-4 bg-muted/30 rounded-2xl">
                  <p className="text-[10px] font-bold uppercase text-muted-foreground">Ends on {userData?.premiumExpiry ? new Date(userData.premiumExpiry).toLocaleDateString() : '...'}</p>
                </div>
              ) : (
                <div className="grid gap-3">
                  <Button 
                    onClick={() => handleBuyPremium('monthly', true)} 
                    disabled={isUpdating || isLifetimeActive} 
                    className="w-full h-14 font-bold uppercase rounded-2xl gap-2"
                  >
                    <Coins className="h-4 w-4" /> 20,000 Coins / Mo
                  </Button>
                  <Button 
                    onClick={() => handleBuyPremium('monthly', false)} 
                    disabled={isUpdating || isLifetimeActive} 
                    variant="outline" 
                    className="w-full h-14 font-bold uppercase rounded-2xl"
                  >
                    $0.00 / Month
                  </Button>
                </div>
              )}
            </div>
          </div>

          <div className={`p-8 bg-card border rounded-[40px] flex flex-col justify-between space-y-6 transition-all ${isLifetimeActive ? 'border-amber-500 shadow-lg ring-1 ring-amber-500' : 'hover:border-amber-500/50'}`}>
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <ShieldCheck className="h-12 w-12 text-amber-500" />
                <div className="text-right">
                  <p className="text-2xl font-headline font-bold uppercase">Lifetime Member</p>
                  {isLifetimeActive && <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/20 text-[8px] uppercase font-bold">ETERNAL</Badge>}
                </div>
              </div>
              <ul className="space-y-4">
                <li className="flex items-center gap-3 text-sm font-medium">
                  <Sparkles className="h-5 w-5 text-amber-500" /> Permanent Premium Access
                </li>
                <li className="flex items-center gap-3 text-sm font-medium">
                  <Star className="h-5 w-5 text-amber-500" /> 10 Best Friend Slots Forever
                </li>
                <li className="flex items-center gap-3 text-sm font-medium">
                  <Award className="h-5 w-5 text-amber-500" /> Golden Premium Badge
                </li>
              </ul>
            </div>
            
            <div className="pt-6 border-t border-border/50">
              <Button 
                onClick={() => handleBuyPremium('lifetime', false)} 
                disabled={isUpdating || isLifetimeActive} 
                className="w-full h-20 bg-amber-500 hover:bg-amber-600 text-white font-bold uppercase rounded-3xl text-lg shadow-lg shadow-amber-500/20"
              >
                {isLifetimeActive ? "Already Eternal" : "$0.00 One-Time"}
              </Button>
            </div>
          </div>
        </div>

        <div className="p-6 bg-muted/20 rounded-3xl border border-dashed border-border text-center">
          <p className="text-[10px] font-headline font-bold text-muted-foreground uppercase tracking-widest leading-relaxed">
            Subscriptions are managed internally within the digital portal terminal. <br />
            Monthly packs grant 10k coins every 30 days of active membership.
          </p>
        </div>
      </div>
    </main>
  )
}
