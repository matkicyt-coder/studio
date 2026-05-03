
"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useUser, useFirestore, useDoc, useMemoFirebase, useAuth } from "@/firebase"
import { NavigationBar } from "@/components/navigation-bar"
import { doc, updateDoc, increment } from "firebase/firestore"
import { updatePassword, signOut } from "firebase/auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Pencil, LogOut, Loader2, Lock, User } from "lucide-react"
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
import { errorEmitter } from "@/firebase/error-emitter"
import { FirestorePermissionError } from "@/firebase/errors"

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
      <div className="flex h-screen w-full items-center justify-center bg-black">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <main className="min-h-screen bg-black w-full pt-16 flex flex-col">
      <NavigationBar />
      
      <div className="max-w-xl mx-auto w-full p-6 space-y-12 animate-fade-in">
        <h1 className="text-4xl font-headline font-bold text-white tracking-tighter">
          Settings
        </h1>

        <div className="space-y-8 bg-zinc-900/50 p-8 rounded-2xl border border-white/5">
          {/* Username Section */}
          <div className="flex items-center justify-between group">
            <div className="space-y-1">
              <p className="text-xs font-headline font-bold text-zinc-500 tracking-widest">Username</p>
              <h2 className="text-xl text-white font-medium">{userData?.username || "..."}</h2>
            </div>
            <Dialog open={isUsernameDialogOpen} onOpenChange={setIsUsernameDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="ghost" size="icon" className="text-zinc-400 hover:text-white hover:bg-white/10 rounded-full transition-fluid">
                  <Pencil className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-zinc-900 border-white/10 text-white">
                <DialogHeader>
                  <DialogTitle className="font-headline font-bold">Change Username</DialogTitle>
                  <DialogDescription className="text-zinc-400">
                    This operation costs <span className="text-yellow-500 font-bold">1,000 coins</span>. 
                  </DialogDescription>
                </DialogHeader>
                <div className="py-4 space-y-4">
                  <div className="relative">
                    <User className="absolute left-3 top-3 h-4 w-4 text-zinc-500" />
                    <Input
                      placeholder="New Username"
                      value={newUsername}
                      onChange={(e) => setNewUsername(e.target.value)}
                      className="bg-black border-white/10 pl-10 h-12"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button 
                    onClick={handleUpdateUsername} 
                    disabled={isUpdating || !newUsername}
                    className="bg-blue-600 hover:bg-blue-700 w-full h-12 font-headline font-bold"
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
              <p className="text-xs font-headline font-bold text-zinc-500 tracking-widest">Password</p>
              <h2 className="text-xl text-white font-medium tracking-widest">••••••••</h2>
            </div>
            <Dialog open={isPasswordDialogOpen} onOpenChange={setIsPasswordDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="ghost" size="icon" className="text-zinc-400 hover:text-white hover:bg-white/10 rounded-full transition-fluid">
                  <Pencil className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-zinc-900 border-white/10 text-white">
                <DialogHeader>
                  <DialogTitle className="font-headline font-bold">Change Password</DialogTitle>
                  <DialogDescription className="text-zinc-400">
                    Secure your account with a new password.
                  </DialogDescription>
                </DialogHeader>
                <div className="py-4 space-y-4">
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-zinc-500" />
                    <Input
                      type="password"
                      placeholder="New Password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="bg-black border-white/10 pl-10 h-12"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button 
                    onClick={handleUpdatePassword} 
                    disabled={isUpdating || !newPassword}
                    className="bg-blue-600 hover:bg-blue-700 w-full h-12 font-headline font-bold"
                  >
                    {isUpdating ? <Loader2 className="h-4 w-4 animate-spin" /> : "Update Password"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
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
