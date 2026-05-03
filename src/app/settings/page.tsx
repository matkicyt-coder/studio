
"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useUser, useFirestore, useDoc, useMemoFirebase, useAuth } from "@/firebase"
import { NavigationBar } from "@/components/navigation-bar"
import { doc, updateDoc, increment, arrayUnion, collection, addDoc } from "firebase/firestore"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { 
  Pencil, 
  RefreshCw, 
  Moon, 
  Sun, 
  ShieldCheck, 
  LogOut, 
  ShieldAlert
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { sendPasswordResetEmail } from "firebase/auth"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"

export default function SettingsPage() {
  const { user, userDocId, isUserLoading } = useUser()
  const db = useFirestore()
  const auth = useAuth()
  const router = useRouter()
  const { toast } = useToast()

  const [isUpdating, setIsUpdating] = useState(false)
  const [isDarkMode, setIsDarkMode] = useState(false)
  
  // Field editing states
  const [editField, setEditField] = useState<string | null>(null)
  const [editValue, setEditValue] = useState("")

  const userDocRef = useMemoFirebase(() => {
    if (!db || !userDocId) return null
    return doc(db, "users", userDocId)
  }, [db, userDocId])
  const { data: userData } = useDoc(userDocRef)

  useEffect(() => {
    if (!isUserLoading && !user) router.push("/login")
  }, [user, isUserLoading, router])

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsDarkMode(document.documentElement.classList.contains('dark'))
    }
  }, [])

  const toggleTheme = () => {
    const newMode = !isDarkMode
    setIsDarkMode(newMode)
    if (newMode) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }

  const handleUpdateField = async () => {
    if (!userDocRef || !editField) return
    setIsUpdating(true)
    
    const updateData: any = {}
    if (editField === "username") {
      updateData.username = editValue
      updateData.coins = increment(-1000)
      updateData.pastUsernames = arrayUnion(userData?.username)
    } else if (editField === "phoneNumber") {
      updateData.phoneNumber = editValue
    } else if (editField === "dob") {
      updateData.dateOfBirth = editValue
    }

    try {
      await updateDoc(userDocRef, updateData)
      if (editField === "username") {
        await addDoc(collection(db!, "transactions"), { 
          userId: userDocId, 
          amount: -1000, 
          type: "username_change", 
          createdAt: new Date().toISOString() 
        })
      }
      toast({ title: "Updated", description: "Your settings have been saved." })
      setEditField(null)
    } catch (e: any) {
      toast({ variant: "destructive", title: "Error", description: e.message })
    } finally {
      setIsUpdating(false)
    }
  }

  const handlePasswordReset = async () => {
    if (!user?.email) return
    setIsUpdating(true)
    try {
      await sendPasswordResetEmail(auth, user.email)
      toast({ title: "Reset Email Sent", description: "Check your inbox." })
    } catch (e: any) {
      toast({ variant: "destructive", title: "Error", description: e.message })
    } finally {
      setIsUpdating(false)
    }
  }

  if (isUserLoading || !user) return null

  return (
    <main className="min-h-screen bg-background pt-24 px-4 pb-20 overflow-x-hidden">
      <NavigationBar />
      
      <div className="max-w-2xl mx-auto space-y-8 animate-fade-in">
        <div className="bg-card border rounded-[32px] p-8 md:p-12 space-y-12 shadow-2xl">
          
          {/* IDENTITY SECTION */}
          <section className="space-y-8">
            <div className="space-y-1">
              <h2 className="text-[10px] font-headline font-bold uppercase tracking-[0.2em] text-muted-foreground/60 border-b pb-4">Identity</h2>
            </div>

            {/* Username Row */}
            <div className="flex items-center justify-between group">
              <div className="space-y-1">
                <p className="text-[10px] font-headline font-bold uppercase tracking-widest text-muted-foreground/80">Username</p>
                <p className="text-2xl font-headline font-bold">{userData?.username || "..."}</p>
              </div>
              <Button 
                variant="ghost" 
                size="icon" 
                className="rounded-full opacity-60 hover:opacity-100 hover:bg-accent"
                onClick={() => { setEditField("username"); setEditValue(userData?.username || ""); }}
              >
                <Pencil className="h-4 w-4" />
              </Button>
            </div>

            {/* Password Row */}
            <div className="flex items-center justify-between group">
              <div className="space-y-1">
                <p className="text-[10px] font-headline font-bold uppercase tracking-widest text-muted-foreground/80">Password</p>
                <p className="text-2xl font-headline font-bold">••••••••</p>
              </div>
              <Button 
                variant="ghost" 
                size="icon" 
                className="rounded-full opacity-60 hover:opacity-100 hover:bg-accent"
                onClick={handlePasswordReset}
              >
                <Pencil className="h-4 w-4" />
              </Button>
            </div>

            {/* Email Row */}
            <div className="flex items-center justify-between group">
              <div className="space-y-1">
                <p className="text-[10px] font-headline font-bold uppercase tracking-widest text-muted-foreground/80">Email Address</p>
                <p className="text-2xl font-headline font-bold">{user.email}</p>
                <button onClick={handlePasswordReset} className="flex items-center gap-1.5 text-[10px] font-headline font-bold uppercase text-blue-500 hover:text-blue-400 transition-colors">
                  <RefreshCw className="h-3 w-3" /> Resend Link
                </button>
              </div>
              <Button variant="ghost" size="icon" className="rounded-full opacity-60 hover:opacity-100 hover:bg-accent" disabled>
                <Pencil className="h-4 w-4" />
              </Button>
            </div>

            {/* Phone Row */}
            <div className="flex items-center justify-between group">
              <div className="space-y-1">
                <p className="text-[10px] font-headline font-bold uppercase tracking-widest text-muted-foreground/80">Phone Number</p>
                <p className="text-2xl font-headline font-bold text-muted-foreground/40">{userData?.phoneNumber || "Not linked"}</p>
              </div>
              <Button 
                variant="ghost" 
                size="icon" 
                className="rounded-full opacity-60 hover:opacity-100 hover:bg-accent"
                onClick={() => { setEditField("phoneNumber"); setEditValue(userData?.phoneNumber || ""); }}
              >
                <Pencil className="h-4 w-4" />
              </Button>
            </div>
          </section>

          {/* HUB DISPLAY SECTION */}
          <section className="space-y-8">
            <div className="space-y-1">
              <h2 className="text-[10px] font-headline font-bold uppercase tracking-[0.2em] text-muted-foreground/60 border-b pb-4">Hub Display</h2>
            </div>

            {/* Birth Date Row */}
            <div className="flex items-center justify-between group">
              <div className="space-y-1">
                <p className="text-[10px] font-headline font-bold uppercase tracking-widest text-muted-foreground/80">Birth Date</p>
                <div className="flex items-center gap-3">
                  <p className="text-2xl font-headline font-bold uppercase">{userData?.dateOfBirth || "NOT SET"}</p>
                  <Badge variant="outline" className="bg-blue-500/10 text-blue-500 border-blue-500/20 text-[8px] font-headline font-bold gap-1 px-2 py-0.5">
                    <ShieldCheck className="h-3 w-3" /> Parental Mode Active
                  </Badge>
                </div>
              </div>
              <Button 
                variant="ghost" 
                size="icon" 
                className="rounded-full opacity-60 hover:opacity-100 hover:bg-accent"
                onClick={() => { setEditField("dob"); setEditValue(userData?.dateOfBirth || ""); }}
              >
                <Pencil className="h-4 w-4" />
              </Button>
            </div>

            {/* Visual Mode Row */}
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-[10px] font-headline font-bold uppercase tracking-widest text-muted-foreground/80">Visual Mode</p>
                <div className="flex items-center gap-2">
                  {isDarkMode ? <Moon className="h-5 w-5 text-blue-500" /> : <Sun className="h-5 w-5 text-yellow-500" />}
                  <span className="text-xs font-headline font-bold uppercase tracking-tight">{isDarkMode ? "Dark Mode" : "Light Mode"}</span>
                </div>
              </div>
              <Switch checked={isDarkMode} onCheckedChange={toggleTheme} className="data-[state=checked]:bg-blue-500" />
            </div>
          </section>

          {/* ADMIN ACTION */}
          {userData?.isAdmin && (
            <div className="pt-8 border-t border-dashed">
              <Link href="/admin">
                <Button variant="outline" className="w-full h-16 rounded-[20px] border-primary/40 text-primary hover:bg-primary/5 hover:border-primary font-headline font-bold uppercase tracking-widest gap-2">
                  <ShieldCheck className="h-5 w-5" /> Admin Terminal Access
                </Button>
              </Link>
            </div>
          )}

          <div className="pt-4 text-center">
            <Button 
              variant="ghost" 
              className="text-[10px] font-headline font-bold uppercase tracking-[0.3em] text-destructive hover:text-destructive hover:bg-destructive/10 px-8 h-12 rounded-full"
              onClick={() => auth.signOut()}
            >
              <LogOut className="h-3 w-3 mr-2" /> Termination (Logout)
            </Button>
          </div>
        </div>
      </div>

      {/* Edit Dialog */}
      <Dialog open={!!editField} onOpenChange={(open) => !open && setEditField(null)}>
        <DialogContent className="rounded-[32px] sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-headline font-bold uppercase tracking-tight">Update {editField === 'dob' ? 'Birth Date' : editField === 'phoneNumber' ? 'Phone' : editField}</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Input 
              type={editField === "dob" ? "date" : "text"}
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              className="h-12 rounded-xl bg-muted/50 border-none font-medium"
              placeholder={`Enter new ${editField}...`}
            />
            {editField === "username" && (
              <p className="text-[9px] font-headline font-bold text-muted-foreground mt-2 uppercase tracking-widest px-1">
                Note: Identity changes cost 1,000 COINS.
              </p>
            )}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setEditField(null)} className="rounded-xl">Cancel</Button>
            <Button onClick={handleUpdateField} disabled={isUpdating} className="rounded-xl px-8">
              Apply Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  )
}
