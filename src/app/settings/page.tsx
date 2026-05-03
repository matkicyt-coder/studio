
"use client"

import { useEffect, useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import { useUser, useFirestore, useDoc, useMemoFirebase, useAuth } from "@/firebase"
import { NavigationBar } from "@/components/navigation-bar"
import { doc, updateDoc, increment, arrayUnion } from "firebase/firestore"
import { updatePassword, signOut } from "firebase/auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Pencil, LogOut, Loader2, Lock, User, ShieldAlert, Sun, Moon, Calendar, ShieldCheck } from "lucide-react"
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Switch } from "@/components/ui/switch"
import { errorEmitter } from "@/firebase/error-emitter"
import { FirestorePermissionError } from "@/firebase/errors"
import { calculateAge } from "@/lib/utils"
import Link from "next/link"

export default function SettingsPage() {
  const { user, isUserLoading } = useUser()
  const auth = useAuth()
  const db = useFirestore()
  const router = useRouter()
  const { toast } = useToast()

  const [newUsername, setNewUsername] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [newDob, setNewDob] = useState("")
  const [isUpdating, setIsUpdating] = useState(false)
  
  const [isUsernameDialogOpen, setIsUsernameDialogOpen] = useState(false)
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false)
  const [isDobDialogOpen, setIsDobDialogOpen] = useState(false)
  const [isParentalLockConfirmOpen, setIsParentalLockConfirmOpen] = useState(false)
  
  const [theme, setTheme] = useState<"light" | "dark">("light")

  const userDocRef = useMemoFirebase(() => {
    if (!db || !user?.uid) return null
    return doc(db, "users", user.uid)
  }, [db, user?.uid])

  const { data: userData } = useDoc(userDocRef)

  const currentAge = useMemo(() => calculateAge(userData?.dateOfBirth), [userData?.dateOfBirth])
  const isParentalMode = currentAge < 18

  useEffect(() => {
    const savedTheme = localStorage.getItem("theme") as "light" | "dark" | null
    const initialTheme = savedTheme || "light"
    setTheme(initialTheme)
    document.documentElement.classList.toggle("dark", initialTheme === "dark")
  }, [])

  const toggleTheme = () => {
    const newTheme = theme === "light" ? "dark" : "light"
    setTheme(newTheme)
    localStorage.setItem("theme", newTheme)
    document.documentElement.classList.toggle("dark", newTheme === "dark")
  }

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push("/login")
    }
  }, [user, isUserLoading, router])

  const handleUpdateUsername = async () => {
    if (!userDocRef || !userData || !newUsername) return

    const currentCoins = userData.coins ?? 0
    if (currentCoins < 1000) {
      toast({
        variant: "destructive",
        title: "Insufficient Coins",
        description: "You need 1,000 coins to change your username.",
      })
      setIsUsernameDialogOpen(false)
      return
    }

    setIsUpdating(true)
    const updateData = {
      username: newUsername,
      coins: increment(-1000),
      pastUsernames: arrayUnion(userData.username)
    }

    updateDoc(userDocRef, updateData)
      .then(() => {
        toast({
          title: "Success",
          description: "Username updated successfully for 1000 coins.",
        })
        setNewUsername("")
        setIsUsernameDialogOpen(false)
      })
      .catch(async (error) => {
        errorEmitter.emit("permission-error", new FirestorePermissionError({
          path: userDocRef.path,
          operation: "update",
          requestResourceData: updateData,
        }))
      })
      .finally(() => setIsUpdating(false))
  }

  const handleUpdatePassword = async () => {
    if (!user || !newPassword) return
    if (newPassword.length < 8) {
      toast({
        variant: "destructive",
        title: "Weak Password",
        description: "Password must be at least 8 characters long.",
      })
      return
    }

    setIsUpdating(true)
    try {
      await updatePassword(user, newPassword)
      toast({
        title: "Success",
        description: "Password updated successfully.",
      })
      setNewPassword("")
      setIsPasswordDialogOpen(false)
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Update Failed",
        description: error.message || "Please re-login to change your password.",
      })
    } finally {
      setIsUpdating(false)
    }
  }

  const handleDobUpdateAttempt = () => {
    if (isParentalMode) {
      toast({
        variant: "destructive",
        title: "Action Restricted",
        description: "You cannot change your age while Parental Mode is active.",
      })
      return
    }

    const newAge = calculateAge(newDob)
    if (newAge < 18) {
      setIsParentalLockConfirmOpen(true)
    } else {
      applyDobUpdate()
    }
  }

  const applyDobUpdate = async () => {
    if (!userDocRef || !newDob) return
    setIsUpdating(true)
    
    updateDoc(userDocRef, { dateOfBirth: newDob })
      .then(() => {
        toast({ title: "Birth Date Updated" })
        setIsDobDialogOpen(false)
        setIsParentalLockConfirmOpen(false)
      })
      .catch(async (error) => {
        errorEmitter.emit("permission-error", new FirestorePermissionError({
          path: userDocRef.path,
          operation: "update",
          requestResourceData: { dateOfBirth: newDob },
        }))
      })
      .finally(() => setIsUpdating(false))
  }

  const handleLogout = async () => {
    await signOut(auth)
    router.push("/login")
  }

  if (isUserLoading || !user) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <main className="min-h-screen bg-background w-full pt-16 flex flex-col">
      <NavigationBar />
      
      <div className="max-w-xl mx-auto w-full p-6 space-y-12 animate-fade-in">
        <h1 className="text-4xl font-headline font-bold tracking-tighter uppercase">
          Settings
        </h1>

        <div className="space-y-8 bg-card p-8 rounded-2xl border border-border shadow-sm">
          {/* Username Section */}
          <div className="flex items-center justify-between group">
            <div className="space-y-1">
              <p className="text-[10px] font-headline font-bold text-muted-foreground uppercase tracking-widest">Username</p>
              <h2 className="text-xl font-medium">{userData?.username || "..."}</h2>
            </div>
            <Dialog open={isUsernameDialogOpen} onOpenChange={setIsUsernameDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full transition-fluid">
                  <Pencil className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-background border-border sm:rounded-3xl">
                <DialogHeader>
                  <DialogTitle className="font-headline font-bold text-xl uppercase">Change Username</DialogTitle>
                  <DialogDescription className="font-headline text-[10px] uppercase tracking-widest text-muted-foreground">
                    This operation costs <span className="text-yellow-600 font-bold">1,000 coins</span>. 
                  </DialogDescription>
                </DialogHeader>
                <div className="py-4 space-y-4">
                  <div className="relative">
                    <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="New Username"
                      value={newUsername}
                      onChange={(e) => setNewUsername(e.target.value)}
                      className="pl-10 h-12"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button 
                    onClick={handleUpdateUsername} 
                    disabled={isUpdating || !newUsername}
                    className="bg-primary text-primary-foreground hover:bg-primary/90 w-full h-12 font-headline font-bold uppercase text-xs"
                  >
                    {isUpdating ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirm Change"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {/* Password Section */}
          <div className="flex items-center justify-between group">
            <div className="space-y-1">
              <p className="text-[10px] font-headline font-bold text-muted-foreground uppercase tracking-widest">Password</p>
              <h2 className="text-xl font-medium tracking-widest">••••••••</h2>
            </div>
            <Dialog open={isPasswordDialogOpen} onOpenChange={setIsPasswordDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full transition-fluid">
                  <Pencil className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-background border-border sm:rounded-3xl">
                <DialogHeader>
                  <DialogTitle className="font-headline font-bold text-xl uppercase">Change Password</DialogTitle>
                  <DialogDescription className="font-headline text-[10px] uppercase tracking-widest text-muted-foreground">
                    Secure your account with a new password.
                  </DialogDescription>
                </DialogHeader>
                <div className="py-4 space-y-4">
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="password"
                      placeholder="New Password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="pl-10 h-12"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button 
                    onClick={handleUpdatePassword} 
                    disabled={isUpdating || !newPassword}
                    className="bg-primary text-primary-foreground hover:bg-primary/90 w-full h-12 font-headline font-bold uppercase text-xs"
                  >
                    {isUpdating ? <Loader2 className="h-4 w-4 animate-spin" /> : "Update Password"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {/* Age Section */}
          <div className="flex items-center justify-between pt-4 border-t border-border">
            <div className="space-y-1">
              <p className="text-[10px] font-headline font-bold text-muted-foreground uppercase tracking-widest">Age</p>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-medium">{currentAge} YEARS OLD</h2>
                {isParentalMode && (
                  <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-primary/10 border border-primary/20">
                    <ShieldCheck className="h-3 w-3 text-primary" />
                    <span className="text-[8px] font-headline font-bold uppercase text-primary tracking-widest">Parental Mode Active</span>
                  </div>
                )}
              </div>
            </div>
            <Dialog open={isDobDialogOpen} onOpenChange={setIsDobDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full transition-fluid">
                  <Pencil className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-background border-border sm:rounded-3xl">
                <DialogHeader>
                  <DialogTitle className="font-headline font-bold text-xl uppercase">Update Birth Date</DialogTitle>
                  <DialogDescription className="font-headline text-[10px] uppercase tracking-widest text-muted-foreground">
                    {isParentalMode 
                      ? "Age changes are locked while Parental Mode is active." 
                      : "Warning: Setting age under 18 will activate permanent Parental Mode."}
                  </DialogDescription>
                </DialogHeader>
                <div className="py-4 space-y-4">
                  <div className="relative">
                    <Calendar className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="date"
                      value={newDob}
                      onChange={(e) => setNewDob(e.target.value)}
                      className="pl-10 h-12"
                      disabled={isParentalMode}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button 
                    onClick={handleDobUpdateAttempt} 
                    disabled={isUpdating || !newDob || isParentalMode}
                    className="bg-primary text-primary-foreground hover:bg-primary/90 w-full h-12 font-headline font-bold uppercase text-xs"
                  >
                    {isUpdating ? <Loader2 className="h-4 w-4 animate-spin" /> : "Verify & Save"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {/* Theme Switch Section */}
          <div className="flex items-center justify-between pt-4 border-t border-border">
            <div className="space-y-1">
              <p className="text-[10px] font-headline font-bold text-muted-foreground uppercase tracking-widest">Visual Mode</p>
              <div className="flex items-center gap-2">
                {theme === "light" ? <Sun className="h-5 w-5 text-primary" /> : <Moon className="h-5 w-5 text-primary" />}
                <span className="text-sm font-medium font-headline uppercase tracking-tight">{theme === "light" ? "White Mode" : "Black Mode"}</span>
              </div>
            </div>
            <Switch 
              checked={theme === "dark"} 
              onCheckedChange={toggleTheme}
            />
          </div>

          {/* Admin Panel Button */}
          {userData?.isAdmin && (
            <div className="pt-4 border-t border-border">
              <Link href="/admin">
                <Button 
                  variant="outline" 
                  className="w-full h-12 bg-secondary/50 border-border font-headline font-bold gap-2 uppercase text-xs tracking-widest"
                >
                  <ShieldAlert className="h-5 w-5 text-destructive" />
                  Admin Terminal
                </Button>
              </Link>
            </div>
          )}
        </div>

        <div className="pt-12">
          <Button 
            onClick={handleLogout}
            variant="destructive"
            className="w-full h-14 font-headline font-bold text-lg flex items-center justify-center gap-3 transition-fluid uppercase tracking-tighter"
          >
            <LogOut className="h-5 w-5" />
            Sign Out
          </Button>
        </div>
      </div>

      <AlertDialog open={isParentalLockConfirmOpen} onOpenChange={setIsParentalLockConfirmOpen}>
        <AlertDialogContent className="bg-background border-border sm:rounded-3xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-headline font-bold text-xl uppercase text-destructive flex items-center gap-2">
              <ShieldAlert className="h-6 w-6" /> Irreversible Action
            </AlertDialogTitle>
            <AlertDialogDescription className="font-headline text-xs uppercase tracking-tight text-muted-foreground leading-relaxed">
              Changing your age to under 18 will activate **Parental Mode**.
              <br /><br />
              - All purchases will be permanently locked.
              <br />
              - You will NOT be able to change your age back.
              <br /><br />
              Are you sure you want to proceed?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel className="font-headline font-bold uppercase text-[10px] tracking-widest h-12">Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={applyDobUpdate}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 font-headline font-bold uppercase text-[10px] tracking-widest h-12"
            >
              Confirm Parental Mode
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  )
}
