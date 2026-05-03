"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useUser, useFirestore, useDoc, useMemoFirebase, useAuth } from "@/firebase"
import { NavigationBar } from "@/components/navigation-bar"
import { doc, updateDoc, increment } from "firebase/firestore"
import { updatePassword, signOut } from "firebase/auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Pencil, LogOut, Loader2, Lock, User, ShieldAlert, Sun, Moon } from "lucide-react"
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
import { Switch } from "@/components/ui/switch"
import { errorEmitter } from "@/firebase/error-emitter"
import { FirestorePermissionError } from "@/firebase/errors"
import Link from "next/link"

export default function SettingsPage() {
  const { user, isUserLoading } = useUser()
  const auth = useAuth()
  const db = useFirestore()
  const router = useRouter()
  const { toast } = useToast()

  const [newUsername, setNewUsername] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [isUpdating, setIsUpdating] = useState(false)
  const [isUsernameDialogOpen, setIsUsernameDialogOpen] = useState(false)
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false)
  const [theme, setTheme] = useState<"light" | "dark">("light")

  const userDocRef = useMemoFirebase(() => {
    if (!db || !user?.uid) return null
    return doc(db, "users", user.uid)
  }, [db, user?.uid])

  const { data: userData } = useDoc(userDocRef)

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
        <h1 className="text-4xl font-headline font-bold tracking-tighter">
          Settings
        </h1>

        <div className="space-y-8 bg-card p-8 rounded-2xl border border-border">
          {/* Username Section */}
          <div className="flex items-center justify-between group">
            <div className="space-y-1">
              <p className="text-xs font-headline font-bold text-muted-foreground tracking-widest">Username</p>
              <h2 className="text-xl font-medium">{userData?.username || "..."}</h2>
            </div>
            <Dialog open={isUsernameDialogOpen} onOpenChange={setIsUsernameDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full transition-fluid">
                  <Pencil className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-background border-border">
                <DialogHeader>
                  <DialogTitle className="font-headline font-bold">Change Username</DialogTitle>
                  <DialogDescription className="text-muted-foreground">
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
                    className="bg-primary text-primary-foreground hover:bg-primary/90 w-full h-12 font-headline font-bold"
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
              <p className="text-xs font-headline font-bold text-muted-foreground tracking-widest">Password</p>
              <h2 className="text-xl font-medium tracking-widest">••••••••</h2>
            </div>
            <Dialog open={isPasswordDialogOpen} onOpenChange={setIsPasswordDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full transition-fluid">
                  <Pencil className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-background border-border">
                <DialogHeader>
                  <DialogTitle className="font-headline font-bold">Change Password</DialogTitle>
                  <DialogDescription className="text-muted-foreground">
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
                    className="bg-primary text-primary-foreground hover:bg-primary/90 w-full h-12 font-headline font-bold"
                  >
                    {isUpdating ? <Loader2 className="h-4 w-4 animate-spin" /> : "Update Password"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {/* Theme Switch Section */}
          <div className="flex items-center justify-between pt-4 border-t border-border">
            <div className="space-y-1">
              <p className="text-xs font-headline font-bold text-muted-foreground tracking-widest">Visual Mode</p>
              <div className="flex items-center gap-2">
                {theme === "light" ? <Sun className="h-5 w-5 text-primary" /> : <Moon className="h-5 w-5 text-primary" />}
                <span className="text-sm font-medium">{theme === "light" ? "White Mode" : "Black Mode"}</span>
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
                  className="w-full h-12 bg-secondary/50 border-border font-headline font-bold gap-2"
                >
                  <ShieldAlert className="h-5 w-5 text-destructive" />
                  Admin Panel
                </Button>
              </Link>
            </div>
          )}
        </div>

        <div className="pt-12">
          <Button 
            onClick={handleLogout}
            variant="destructive"
            className="w-full h-14 font-headline font-bold text-lg flex items-center justify-center gap-3 transition-fluid"
          >
            <LogOut className="h-5 w-5" />
            Logout
          </Button>
        </div>
      </div>
    </main>
  )
}
