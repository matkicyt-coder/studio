
"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useUser, useFirestore, useDoc, useMemoFirebase, useAuth } from "@/firebase"
import { NavigationBar } from "@/components/navigation-bar"
import { doc, updateDoc, increment, arrayUnion, collection, addDoc } from "firebase/firestore"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ShieldCheck, LogOut, ArrowLeft, Mail, Calendar, Lock } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import Link from "next/link"
import { calculateAge } from "@/lib/utils"
import { sendPasswordResetEmail } from "firebase/auth"

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

  useEffect(() => {
    if (!isUserLoading && !user) router.push("/login")
  }, [user, isUserLoading, router])

  const handlePasswordReset = async () => {
    if (!user?.email) return
    setIsUpdating(true)
    try {
      await sendPasswordResetEmail(auth, user.email)
      toast({ 
        title: "RESET EMAIL SENT", 
        description: "CHECK YOUR INBOX TO UPDATE YOUR PASSWORD." 
      })
    } catch (e: any) {
      toast({ 
        variant: "destructive", 
        title: "ERROR", 
        description: e.message 
      })
    } finally {
      setIsUpdating(false)
    }
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

  const age = calculateAge(userData?.dateOfBirth)

  return (
    <main className="min-h-screen bg-background pt-24 px-4 pb-20">
      <NavigationBar />
      <div className="max-w-xl mx-auto space-y-8 animate-fade-in">
        <div className="flex items-center gap-4">
          <Button onClick={() => router.push("/home")} variant="ghost" size="icon" className="rounded-full">
            <ArrowLeft className="h-6 w-6" />
          </Button>
          <h1 className="text-3xl font-headline font-bold uppercase tracking-tight">Settings</h1>
        </div>

        <div className="p-6 bg-card border rounded-3xl space-y-8 shadow-sm">
          {/* Account Identity Section */}
          <div className="space-y-4">
            <h2 className="text-[10px] font-headline font-bold uppercase tracking-widest text-muted-foreground">Account Info</h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-muted/30 rounded-xl">
                <div className="flex items-center gap-3">
                  <Mail className="h-4 w-4 text-primary" />
                  <span className="text-xs font-bold uppercase">Email</span>
                </div>
                <span className="text-xs text-muted-foreground">{user.email}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-muted/30 rounded-xl">
                <div className="flex items-center gap-3">
                  <Calendar className="h-4 w-4 text-primary" />
                  <span className="text-xs font-bold uppercase">Age</span>
                </div>
                <span className="text-xs text-muted-foreground">{age} ({userData?.dateOfBirth})</span>
              </div>
            </div>
          </div>

          {/* Security Section */}
          <div className="space-y-4 pt-6 border-t">
            <h2 className="text-[10px] font-headline font-bold uppercase tracking-widest text-muted-foreground">Security</h2>
            <Button 
              onClick={handlePasswordReset} 
              disabled={isUpdating} 
              variant="outline" 
              className="w-full h-12 rounded-xl font-bold uppercase text-[10px] tracking-widest"
            >
              <Lock className="h-4 w-4 mr-2" /> Reset Password Via Email
            </Button>
          </div>

          {/* Username Change Section */}
          <div className="space-y-4 pt-6 border-t">
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
