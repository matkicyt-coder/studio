
"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useUser, useFirestore, useDoc, useMemoFirebase, useAuth, useCollection } from "@/firebase"
import { NavigationBar } from "@/components/navigation-bar"
import { doc, updateDoc, increment, arrayUnion, collection, query, where, addDoc } from "firebase/firestore"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Pencil, ShieldCheck, Wifi, Settings as SettingsIcon, LogOut, ArrowLeft } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import Link from "next/link"

export default function SettingsPage() {
  const { user, userDocId, isUserLoading } = useUser()
  const db = useFirestore()
  const auth = useAuth()
  const router = useRouter()
  const { toast } = useToast()

  const [newUsername, setNewUsername] = useState("")
  const [isUpdating, setIsUpdating] = useState(false)

  const userDocRef = useMemoFirebase(() => {
    if (!db || !userDocId) return null
    return doc(db, "users", userDocId)
  }, [db, userDocId])
  const { data: userData } = useDoc(userDocRef)

  const followersQuery = useMemoFirebase(() => {
    if (!db || !userDocId) return null
    return query(collection(db, "follows"), where("followingId", "==", userDocId))
  }, [db, userDocId])
  const { data: followers } = useCollection(followersQuery)
  const followerCount = followers?.length || 0

  useEffect(() => {
    if (!isUserLoading && !user) router.push("/login")
  }, [user, isUserLoading, router])

  const handleVerificationRequest = async () => {
    if (!db || !userDocId || !userData) return
    if (followerCount < 10000) {
      toast({ 
        variant: "destructive", 
        title: "INELIGIBLE", 
        description: "YOU NEED AT LEAST 10,000 FOLLOWERS TO REQUEST VERIFICATION." 
      })
      return
    }
    setIsUpdating(true)
    addDoc(collection(db, "verificationRequests"), { 
      userId: userDocId, 
      username: userData.username, 
      status: "pending", 
      requestedAt: new Date().toISOString() 
    }).then(() => {
      toast({ title: "REQUEST SENT", description: "ADMINISTRATORS WILL REVIEW YOUR DOSSIER." })
    }).finally(() => setIsUpdating(false))
  }

  const handleUpdateUsername = async () => {
    if (!userDocRef || !userData || !newUsername) return
    if (userData.coins < 1000) {
      toast({ variant: "destructive", title: "INSUFFICIENT BALANCE", description: "USERNAME CHANGES COST 1,000 COINS." })
      return
    }
    setIsUpdating(true)
    updateDoc(userDocRef, { 
      username: newUsername, 
      coins: increment(-1000), 
      pastUsernames: arrayUnion(userData.username) 
    }).then(() => {
      addDoc(collection(db, "transactions"), { 
        userId: userDocId, 
        amount: -1000, 
        type: "username_change", 
        createdAt: new Date().toISOString() 
      })
      toast({ title: "IDENTITY UPDATED", description: `YOU ARE NOW KNOWN AS ${newUsername}.` })
      setNewUsername("")
    }).finally(() => setIsUpdating(false))
  }

  if (isUserLoading || !user) return null

  return (
    <main className="min-h-screen bg-background pt-24 px-4 pb-20">
      <NavigationBar />
      <div className="max-w-xl mx-auto space-y-8 animate-fade-in">
        <div className="flex items-center gap-4">
          <Button onClick={() => router.push("/home")} variant="ghost" size="icon" className="rounded-full"><ArrowLeft className="h-6 w-6" /></Button>
          <h1 className="text-3xl font-headline font-bold uppercase tracking-tight">Settings</h1>
        </div>

        <div className="p-6 bg-card border rounded-3xl space-y-6 shadow-sm">
          <div className="space-y-4">
            <h2 className="text-[10px] font-headline font-bold uppercase tracking-widest text-muted-foreground">Change Username (1,000 Coins)</h2>
            <div className="flex gap-2">
              <Input 
                placeholder="New username..." 
                value={newUsername} 
                onChange={(e) => setNewUsername(e.target.value)}
                className="rounded-xl"
              />
              <Button onClick={handleUpdateUsername} disabled={isUpdating} className="rounded-xl px-6">Apply</Button>
            </div>
          </div>

          <div className="pt-6 border-t space-y-4">
            <h2 className="text-[10px] font-headline font-bold uppercase tracking-widest text-muted-foreground">Verification</h2>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Wifi className="h-4 w-4 text-primary" />
                <span className="text-sm font-bold">{followerCount} / 10,000 Followers</span>
              </div>
              <Button 
                onClick={handleVerificationRequest} 
                disabled={isUpdating || followerCount < 10000 || userData?.isVerified} 
                size="sm" 
                variant="outline"
                className="rounded-full"
              >
                {userData?.isVerified ? "Verified" : "Request Badge"}
              </Button>
            </div>
          </div>

          {userData?.isAdmin && (
            <div className="pt-6 border-t">
              <Link href="/admin">
                <Button variant="outline" className="w-full rounded-xl border-primary text-primary hover:bg-primary/10">
                  <ShieldCheck className="h-4 w-4 mr-2" /> Admin Terminal
                </Button>
              </Link>
            </div>
          )}

          <div className="pt-6 border-t">
            <Button 
              variant="destructive" 
              className="w-full rounded-xl font-bold uppercase text-[10px] tracking-widest"
              onClick={() => auth.signOut()}
            >
              <LogOut className="h-4 w-4 mr-2" /> Logout
            </Button>
          </div>
        </div>
      </div>
    </main>
  )
}
