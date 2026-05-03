
"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useUser, useFirestore, useDoc, useMemoFirebase } from "@/firebase"
import { NavigationBar } from "@/components/navigation-bar"
import { doc, updateDoc } from "firebase/firestore"
import { VerifiedBadge } from "@/components/verified-badge"
import { FriendCircles } from "@/components/friends/friend-circles"

export default function HomePage() {
  const { user, isUserLoading } = useUser()
  const db = useFirestore()
  const router = useRouter()

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

  // Track online status
  useEffect(() => {
    if (!db || !user?.uid) return
    const interval = setInterval(() => {
      updateDoc(doc(db, "users", user.uid), {
        lastSeen: new Date().toISOString()
      })
    }, 60000)
    return () => clearInterval(interval)
  }, [db, user?.uid])

  if (isUserLoading || !user) {
    return null
  }

  return (
    <main className="min-h-screen bg-background w-full pt-16">
      <NavigationBar />
      <div className="p-8 space-y-8 animate-fade-in max-w-7xl mx-auto">
        <h1 className="text-4xl font-headline font-bold tracking-tighter flex items-center gap-2">
          WELCOME, {userData?.username || "..."}
          {userData?.isVerified && (
            <VerifiedBadge className="h-7 w-7" />
          )}
          !
        </h1>

        <div className="space-y-4">
          <FriendCircles />
        </div>
      </div>
    </main>
  )
}
