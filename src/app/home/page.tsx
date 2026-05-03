
"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useUser, useFirestore, useDoc, useMemoFirebase } from "@/firebase"
import { NavigationBar } from "@/components/navigation-bar"
import { doc, updateDoc, arrayUnion, increment, collection, addDoc } from "firebase/firestore"
import { VerifiedBadge } from "@/components/verified-badge"
import { PremiumBadge } from "@/components/premium-badge"
import { FriendCircles } from "@/components/friends/friend-circles"
import { ShieldCheck } from "lucide-react"

export default function HomePage() {
  const { user, userDocId, isUserLoading } = useUser()
  const db = useFirestore()
  const router = useRouter()

  const userDocRef = useMemoFirebase(() => {
    if (!db || !userDocId) return null
    return doc(db, "users", userDocId)
  }, [db, userDocId])

  const { data: userData } = useDoc(userDocRef)

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push("/login")
    }
  }, [user, isUserLoading, router])

  // Track online status
  useEffect(() => {
    if (!db || !userDocId) return
    const interval = setInterval(() => {
      updateDoc(doc(db, "users", userDocId), {
        lastSeen: new Date().toISOString()
      })
    }, 60000)
    return () => clearInterval(interval)
  }, [db, userDocId])

  // Monthly Premium Grant Logic
  useEffect(() => {
    if (!db || !userDocId || !userData || !userDocRef) return
    
    if (userData.premiumType === 'monthly' && userData.premiumStatus === 'active') {
      const now = new Date()
      const lastGrant = userData.lastPremiumGrant ? new Date(userData.lastPremiumGrant) : null
      
      if (userData.premiumExpiry) {
        const expiryDate = new Date(userData.premiumExpiry)
        if (now > expiryDate) {
          updateDoc(userDocRef, {
            isPremium: false,
            premiumStatus: 'none',
            premiumType: 'none'
          })
          return
        }
      }

      if (lastGrant) {
        const diffInDays = (now.getTime() - lastGrant.getTime()) / (1000 * 3600 * 24)
        if (diffInDays >= 30) {
          updateDoc(userDocRef, {
            coins: increment(10000),
            lastPremiumGrant: now.toISOString(),
            premiumExpiry: new Date(now.getTime() + (30 * 24 * 60 * 60 * 1000)).toISOString()
          }).then(() => {
            addDoc(collection(db, "transactions"), {
              userId: userDocId,
              amount: 10000,
              type: "premium_grant",
              createdAt: now.toISOString()
            })
          })
        }
      }
    }
  }, [db, userDocId, userData, userDocRef])

  // Sync missing badges
  useEffect(() => {
    if (!db || !userDocId || !userData) return
    const missingBadges = []
    if (userData.isAdmin && !userData.badges?.includes('admin')) missingBadges.push('admin')
    if (userData.isPremium && !userData.badges?.includes('premium')) missingBadges.push('premium')
    
    if (missingBadges.length > 0) {
      updateDoc(doc(db, "users", userDocId), {
        badges: arrayUnion(...missingBadges)
      })
    }
  }, [db, userDocId, userData])

  if (isUserLoading || !user) return null

  const renderWelcomeBadge = () => {
    if (userData?.isAdmin) return <ShieldCheck className="h-7 w-7 text-primary" />
    if (userData?.isVerified) return <VerifiedBadge className="h-7 w-7" />
    if (userData?.isPremium) return <PremiumBadge className="h-7 w-7" />
    return null
  }

  return (
    <main className="min-h-screen bg-background w-full pt-16">
      <NavigationBar />
      <div className="p-8 space-y-8 animate-fade-in max-w-7xl mx-auto">
        <h1 className="text-4xl font-headline font-bold tracking-tighter flex items-center gap-2">
          Welcome, {userData?.username || "..."}
          {renderWelcomeBadge()}
          !
        </h1>
        <div className="space-y-4">
          <FriendCircles />
        </div>
      </div>
    </main>
  )
}
