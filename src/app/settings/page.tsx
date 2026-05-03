
"use client"

import { useEffect, useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import { useUser, useFirestore, useDoc, useMemoFirebase, useAuth, useCollection } from "@/firebase"
import { NavigationBar } from "@/components/navigation-bar"
import { doc, updateDoc, increment, arrayUnion, collection, query, where, addDoc } from "firebase/firestore"
import { updatePassword, verifyBeforeUpdateEmail } from "firebase/auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Pencil, Loader2, Lock, User, ShieldAlert, Sun, Moon, Calendar, ShieldCheck, Mail, RefreshCw, Check, Star, Wifi } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { calculateAge } from "@/lib/utils"
import Link from "next/link"
import { cn } from "@/lib/utils"

export default function SettingsPage() {
  const { user, isUserLoading } = useUser()
  const db = useFirestore()
  const auth = useAuth()
  const router = useRouter()
  const { toast } = useToast()

  const [newUsername, setNewUsername] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [newDob, setNewDob] = useState("")
  const [isUpdating, setIsUpdating] = useState(false)
  const [theme, setTheme] = useState<"light" | "dark">("light")

  const userDocRef = useMemoFirebase(() => {
    if (!db || !user?.uid) return null
    return doc(db, "users", user.uid)
  }, [db, user?.uid])
  const { data: userData } = useDoc(userDocRef)

  // Followers count for verification check
  const followersQuery = useMemoFirebase(() => {
    if (!db || !user?.uid) return null
    return query(collection(db, "follows"), where("followingId", "==", user.uid))
  }, [db, user?.uid])
  const { data: followers } = useCollection(followersQuery)
  const followerCount = followers?.length || 0

  useEffect(() => {
    const savedTheme = localStorage.getItem("theme") as "light" | "dark" | null
    const initialTheme = savedTheme || "light"
    setTheme(initialTheme)
    document.documentElement.classList.toggle("dark", initialTheme === "dark")
  }, [])

  const handleVerificationRequest = async () => {
    if (!db || !user || !userData) return
    if (followerCount < 10000) {
      toast({ variant: "destructive", title: "Ineligible", description: "You need 10,000 followers to request verification." })
      return
    }
    
    setIsUpdating(true)
    const reqData = {
      userId: user.uid,
      username: userData.username,
      status: "pending",
      requestedAt: new Date().toISOString()
    }
    
    addDoc(collection(db, "verificationRequests"), reqData)
      .then(() => {
        toast({ title: "Request Sent", description: "An admin will review your eligibility." })
      })
      .finally(() => setIsUpdating(false))
  }

  const handleUpdateUsername = async () => {
    if (!userDocRef || !userData || !newUsername) return
    if (userData.coins < 1000) {
      toast({ variant: "destructive", title: "Insufficient coins" })
      return
    }
    setIsUpdating(true)
    const updateData = {
      username: newUsername,
      coins: increment(-1000),
      pastUsernames: arrayUnion(userData.username)
    }
    updateDoc(userDocRef, updateData).then(() => {
      addDoc(collection(db, "transactions"), { userId: user!.uid, amount: -1000, type: "username_change", createdAt: new Date().toISOString() })
      toast({ title: "Username updated" })
      setNewUsername("")
    }).finally(() => setIsUpdating(false))
  }

  if (isUserLoading || !user) return null

  return (
    <main className="min-h-screen bg-background w-full pt-24 px-6 pb-20">
      <NavigationBar />
      <div className="max-w-xl mx-auto space-y-12 animate-fade-in">
        <h1 className="text-4xl font-headline font-bold tracking-tighter uppercase">Settings</h1>

        <div className="space-y-8 bg-card p-8 rounded-3xl border border-border shadow-sm">
          <div className="space-y-6">
            <p className="text-[10px] font-headline font-bold text-muted-foreground uppercase tracking-widest border-b pb-2">Identity</p>
            
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-headline font-bold text-muted-foreground uppercase tracking-widest">Username</p>
                <h2 className="text-xl font-medium">{userData?.username}</h2>
              </div>
              <Dialog>
                <DialogTrigger asChild><Button variant="ghost" size="icon" className="rounded-full"><Pencil className="h-4 w-4" /></Button></DialogTrigger>
                <DialogContent className="rounded-3xl">
                  <DialogHeader><DialogTitle>Change Username</DialogTitle><DialogDescription>Costs 1,000 coins.</DialogDescription></DialogHeader>
                  <Input placeholder="New username" value={newUsername} onChange={(e) => setNewUsername(e.target.value)} />
                  <DialogFooter><Button onClick={handleUpdateUsername} disabled={isUpdating}>Confirm</Button></DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

            <div className="flex items-center justify-between pt-4 border-t">
              <div className="space-y-1">
                <p className="text-[10px] font-headline font-bold text-muted-foreground uppercase tracking-widest">Verification Status</p>
                <div className="flex items-center gap-2">
                  <Wifi className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">{followerCount.toLocaleString()} Followers</span>
                </div>
              </div>
              <Button 
                onClick={handleVerificationRequest} 
                disabled={isUpdating || followerCount < 10000 || userData?.isVerified}
                variant={userData?.isVerified ? "outline" : "default"}
                className="font-headline font-bold uppercase text-[10px] tracking-widest h-10 px-6 rounded-full"
              >
                {userData?.isVerified ? "Verified" : "Request Follower Badge"}
              </Button>
            </div>
          </div>

          <div className="pt-8 border-t space-y-4">
            <p className="text-[10px] font-headline font-bold text-muted-foreground uppercase tracking-widest">System</p>
            {userData?.isAdmin && (
              <Link href="/admin">
                <Button variant="outline" className="w-full h-12 bg-primary/10 border-primary/20 font-headline font-bold uppercase text-xs tracking-widest gap-2">
                  <ShieldCheck className="h-5 w-5" /> Admin Terminal
                </Button>
              </Link>
            )}
            <Button variant="ghost" className="w-full text-destructive font-bold uppercase text-[10px]" onClick={() => auth.signOut()}>Log Out</Button>
          </div>
        </div>
      </div>
    </main>
  )
}
