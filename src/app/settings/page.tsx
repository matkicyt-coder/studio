"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useUser, useFirestore, useDoc, useMemoFirebase, useAuth, useCollection } from "@/firebase"
import { NavigationBar } from "@/components/navigation-bar"
import { doc, updateDoc, increment, arrayUnion, collection, query, where, addDoc } from "firebase/firestore"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { 
  Pencil, 
  ShieldCheck, 
  Wifi, 
  Settings as SettingsIcon, 
  LogOut, 
  ArrowLeft,
  Award,
  ChevronRight,
  User as UserIcon
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog"
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
      <div className="max-w-2xl mx-auto space-y-10 animate-fade-in">
        <div className="flex items-center gap-4">
          <Button onClick={() => router.push("/home")} variant="ghost" size="icon" className="rounded-full">
            <ArrowLeft className="h-6 w-6" />
          </Button>
          <div className="space-y-1">
            <h1 className="text-3xl font-headline font-bold uppercase tracking-tight">Terminal Settings</h1>
            <p className="text-[10px] font-headline font-bold text-muted-foreground uppercase tracking-widest italic">User Configuration ID: {userData?.sequentialId}</p>
          </div>
        </div>

        <div className="space-y-6">
          <section className="bg-card border rounded-[32px] overflow-hidden shadow-sm">
            <div className="p-6 border-b bg-muted/10">
              <h2 className="text-[10px] font-headline font-bold uppercase tracking-[0.2em] text-muted-foreground">Identity & Identity History</h2>
            </div>
            <div className="p-8 space-y-8">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-[10px] font-bold uppercase text-muted-foreground">Current Username</p>
                  <h3 className="text-xl font-bold flex items-center gap-2">
                    {userData?.username}
                    {userData?.isVerified && <ShieldCheck className="h-4 w-4 text-primary" />}
                  </h3>
                </div>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm" className="rounded-full gap-2 font-bold uppercase text-[10px]">
                      <Pencil className="h-3.5 w-3.5" /> Change
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="rounded-[40px]">
                    <DialogHeader>
                      <DialogTitle className="text-xl font-headline font-bold uppercase">Change Identity</DialogTitle>
                      <DialogDescription className="text-xs uppercase font-bold text-muted-foreground">
                        Modifying your username costs <span className="text-primary">1,000 coins</span>.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="py-4 space-y-4">
                      <Input 
                        placeholder="Enter new identity..." 
                        value={newUsername} 
                        onChange={(e) => setNewUsername(e.target.value)}
                        className="h-14 rounded-2xl"
                      />
                      <p className="text-[10px] text-muted-foreground italic px-2">
                        Your previous username will be stored in your identity history.
                      </p>
                    </div>
                    <DialogFooter>
                      <Button onClick={handleUpdateUsername} disabled={isUpdating} className="w-full h-12 rounded-2xl font-bold uppercase">
                        Confirm Identity Update
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>

              <div className="flex items-center justify-between pt-6 border-t">
                <div className="space-y-1">
                  <p className="text-[10px] font-bold uppercase text-muted-foreground">Follower Badge Status</p>
                  <div className="flex items-center gap-2">
                    <Wifi className="h-4 w-4 text-primary" />
                    <span className="font-bold">{followerCount.toLocaleString()} / 10,000</span>
                  </div>
                </div>
                <Button 
                  onClick={handleVerificationRequest} 
                  disabled={isUpdating || followerCount < 10000 || userData?.isVerified} 
                  size="sm" 
                  variant={userData?.isVerified ? "ghost" : "default"}
                  className="rounded-full font-bold uppercase text-[10px]"
                >
                  {userData?.isVerified ? "Verified" : "Request Badge"}
                </Button>
              </div>
            </div>
          </section>

          <section className="bg-card border rounded-[32px] overflow-hidden shadow-sm">
            <div className="p-6 border-b bg-muted/10">
              <h2 className="text-[10px] font-headline font-bold uppercase tracking-[0.2em] text-muted-foreground">Resources & Rewards</h2>
            </div>
            <div className="divide-y">
              <Link href="/badges" className="flex items-center justify-between p-8 hover:bg-muted/50 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center">
                    <Award className="h-5 w-5 text-blue-500" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm uppercase">Badge Registry</h3>
                    <p className="text-[10px] text-muted-foreground uppercase">View your digital achievements</p>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </Link>
              
              {userData?.isAdmin && (
                <Link href="/admin" className="flex items-center justify-between p-8 hover:bg-primary/5 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
                      <ShieldCheck className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-bold text-sm uppercase text-primary">Admin Terminal</h3>
                      <p className="text-[10px] text-primary/70 uppercase">Manage portal security and reports</p>
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-primary" />
                </Link>
              )}
            </div>
          </section>

          <div className="pt-4 px-2 flex flex-col gap-4">
            <Button 
              variant="outline" 
              className="w-full h-14 rounded-2xl border-destructive text-destructive hover:bg-destructive/10 font-bold uppercase text-[10px] tracking-widest"
              onClick={() => auth.signOut()}
            >
              <LogOut className="h-4 w-4 mr-2" /> Terminate Session (Logout)
            </Button>
            <p className="text-center text-[10px] font-bold text-muted-foreground uppercase tracking-widest opacity-50">
              Portal Version 2.5.0-ID-SYNC
            </p>
          </div>
        </div>
      </div>
    </main>
  )
}
