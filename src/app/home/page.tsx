
"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useUser, useFirestore, useDoc, useMemoFirebase } from "@/firebase"
import { NavigationBar } from "@/components/navigation-bar"
import { doc } from "firebase/firestore"
import { CheckCircle2 } from "lucide-react"

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

  if (isUserLoading || !user) {
    return null
  }

  return (
    <main className="min-h-screen bg-background w-full pt-16">
      <NavigationBar />
      <div className="p-8 animate-fade-in">
        <h1 className="text-4xl font-headline font-bold tracking-tighter flex items-center gap-2">
          Welcome, {userData?.username || "..."}
          {userData?.isVerified && (
            <CheckCircle2 className="h-6 w-6 text-primary fill-primary/10" />
          )}
          !
        </h1>
      </div>
    </main>
  )
}
