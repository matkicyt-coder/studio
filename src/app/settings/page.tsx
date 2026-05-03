
"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useUser, useFirestore, useDoc, useMemoFirebase, useAuth, useCollection } from "@/firebase"
import { NavigationBar } from "@/components/navigation-bar"
import { doc, updateDoc, increment, arrayUnion, collection, query, where, addDoc } from "firebase/firestore"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Pencil, ShieldCheck, Wifi, Settings, LogOut } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
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

  const handleVerificationRequest = async () => {
    if (!db || !userDocId || !userData) return
    if (followerCount < 10000) {
      toast({ variant: "destructive", title: "Ineligible", description: "10K followers required." })
      return
    }
    setIsUpdating(true)
    addDoc(collection(db, "verificationRequests"), { userId: userDocId, username: userData.username, status: "pending", requestedAt: new Date().toISOString() })
      .then(() => toast({ title: "Request Sent" }))
      .finally(() => setIsUpdating(false))
  }

  const handleUpdateUsername = async () => {
    if (!userDocRef || !userData || !newUsername) return
    if (userData.coins < 1000) {
      toast({ variant: "destructive", title: "Insufficient coins" })
      return
    }
    setIsUpdating(true)
    updateDoc(userDocRef, { username: newUsername, coins: increment(-1000), pastUsernames: arrayUnion(userData.username) }).then(() => {
      addDoc(collection(db, "transactions"), { userId: userDocId, amount: -1000, type: "username_change", createdAt: new Date().toISOString() })
      toast({ title: "Username updated" })
      setNewUsername("")
    }).finally(() => setIsUpdating(false))
  }

  if (isUserLoading || !user) return null

  return (
    <main className="min-h-screen bg-background pt-24 px-6 pb-20">
      <NavigationBar />
      <div className="max-w-xl mx-auto space-y-12">
        <h1 className="text-4xl font-headline font-bold uppercase">Settings</h1>
        <div className="space-y-8 bg-card p-8 rounded-3xl border shadow-sm">
          <div className="flex items-center justify-between">
            <div><p className="text-[10px] font-bold uppercase opacity-50">Username</p><h2 className="text-xl">{userData?.username}</h2></div>
            <Dialog>
              <DialogTrigger asChild><Button variant="ghost" size="icon"><Pencil className="h-4 w-4" /></Button></DialogTrigger>
              <DialogContent><DialogHeader><DialogTitle>Change Username</DialogTitle><DialogDescription>Costs 1,000 coins.</DialogDescription></DialogHeader>
              <Input placeholder="New username" value={newUsername} onChange={(e) => setNewUsername(e.target.value)} />
              <DialogFooter><Button onClick={handleUpdateUsername} disabled={isUpdating}>Confirm</Button></DialogFooter></DialogContent>
            </Dialog>
          </div>
          <div className="flex items-center justify-between pt-4 border-t">
            <div><p className="text-[10px] font-bold uppercase opacity-50">Follower Badge</p><div className="flex items-center gap-2"><Wifi className="h-4 w-4 text-primary" /> {followerCount.toLocaleString()}</div></div>
            <Button onClick={handleVerificationRequest} disabled={isUpdating || followerCount < 10000 || userData?.isVerified} size="sm" className="rounded-full">Request Badge</Button>
          </div>
          {userData?.isAdmin && <Link href="/admin"><Button variant="outline" className="w-full gap-2"><ShieldCheck className="h-5 w-5" /> Admin Terminal</Button></Link>}
          <Button variant="ghost" className="w-full text-destructive uppercase text-[10px] font-bold" onClick={() => auth.signOut()}>Log Out</Button>
        </div>
      </div>
    </main>
  )
}
