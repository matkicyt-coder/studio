
"use client"

import { useEffect, useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import { useUser, useFirestore, useDoc, useMemoFirebase, useAuth } from "@/firebase"
import { NavigationBar } from "@/components/navigation-bar"
import { doc, updateDoc, increment, arrayUnion } from "firebase/firestore"
import { 
  updatePassword, 
  sendEmailVerification, 
  verifyBeforeUpdateEmail,
  linkWithPhoneNumber, 
  RecaptchaVerifier,
  ConfirmationResult
} from "firebase/auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Pencil, Loader2, Lock, User, ShieldAlert, Sun, Moon, Calendar, ShieldCheck, Smartphone, CheckCircle2, Mail, RefreshCw, Check } from "lucide-react"
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
  const [newPhone, setNewPhone] = useState("")
  const [newEmail, setNewEmail] = useState("")
  const [phoneVerificationCode, setPhoneVerificationCode] = useState("")
  const [isUpdating, setIsUpdating] = useState(false)
  
  const [isUsernameDialogOpen, setIsUsernameDialogOpen] = useState(false)
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false)
  const [isDobDialogOpen, setIsDobDialogOpen] = useState(false)
  const [isPhoneDialogOpen, setIsPhoneDialogOpen] = useState(false)
  const [isEmailDialogOpen, setIsEmailDialogOpen] = useState(false)
  
  const [phoneStep, setPhoneStep] = useState<'input' | 'verify'>('input')
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null)
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

  const censorEmail = (email: string | null | undefined) => {
    if (!email) return "Not linked"
    const [name, domain] = email.split("@")
    if (!domain) return email
    const censoredName = name.length > 2 ? name.substring(0, 2) + "***" : name + "***"
    return `${censoredName}@${domain}`
  }

  const handleUpdateUsername = async () => {
    if (!userDocRef || !userData || !newUsername) return

    const currentCoins = userData.coins ?? 0
    if (currentCoins < 1000) {
      toast({
        variant: "destructive",
        title: "Insufficient coins",
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
          description: "Username updated for 1000 coins.",
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
        title: "Weak password",
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
        title: "Update failed",
        description: error.message || "Please re-login to change your password.",
      })
    } finally {
      setIsUpdating(false)
    }
  }

  const handleSendPhoneCode = async () => {
    if (!newPhone || !user) return
    setIsUpdating(true)
    
    try {
      const recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
        'size': 'invisible'
      })
      
      const result = await linkWithPhoneNumber(user, newPhone, recaptchaVerifier)
      setConfirmationResult(result)
      setPhoneStep('verify')
      toast({
        title: "Code sent",
        description: `A verification code has been sent to ${newPhone}.`,
      })
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Failed to send code",
        description: error.message,
      })
    } finally {
      setIsUpdating(false)
    }
  }

  const handleVerifyAndLinkPhone = async () => {
    if (!userDocRef || !confirmationResult || !phoneVerificationCode) return
    
    setIsUpdating(true)
    try {
      await confirmationResult.confirm(phoneVerificationCode)
      const updateData = { phoneNumber: newPhone }
      await updateDoc(userDocRef, updateData)
      
      toast({ title: "Phone linked successfully!" })
      setNewPhone("")
      setPhoneVerificationCode("")
      setPhoneStep('input')
      setConfirmationResult(null)
      setIsPhoneDialogOpen(false)
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Invalid code",
        description: "The verification code you entered is incorrect.",
      })
    } finally {
      setIsUpdating(false)
    }
  }

  const handleUpdateEmail = async () => {
    if (!user || !newEmail || !userDocRef) return
    setIsUpdating(true)
    
    try {
      // Modern method that sends a link to the NEW email
      await verifyBeforeUpdateEmail(user, newEmail)
      
      toast({
        title: "Verification sent",
        description: `We've sent a link to ${newEmail}. Click it to confirm and update your address.`,
      })
      setIsEmailDialogOpen(false)
    } catch (error: any) {
      // Handle the specific "operation-not-allowed" error with clear instructions
      if (error.code === 'auth/operation-not-allowed') {
        toast({
          variant: "destructive",
          title: "Console Setup Required",
          description: "Please enable 'Email address change' in your Firebase Console (Authentication > Settings > User actions).",
        })
      } else {
        toast({
          variant: "destructive",
          title: "Update failed",
          description: error.message || "Please re-login to update your email.",
        })
      }
    } finally {
      setIsUpdating(false)
    }
  }

  const handleResendEmailVerification = async () => {
    if (!user) return
    setIsUpdating(true)
    try {
      await sendEmailVerification(user)
      toast({
        title: "Verification Resent",
        description: "Check your inbox for the new confirmation link.",
      })
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      })
    } finally {
      setIsUpdating(false)
    }
  }

  const handleDobUpdateAttempt = () => {
    if (isParentalMode) {
      toast({
        variant: "destructive",
        title: "Action restricted",
        description: "You cannot change your birth date while parental mode is active.",
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
        toast({ title: "Birth date updated" })
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

  if (isUserLoading || !user) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    )
  }

  const isEmailVerified = user.emailVerified

  return (
    <main className="min-h-screen bg-background w-full pt-16 flex flex-col">
      <NavigationBar />
      
      <div id="recaptcha-container"></div>

      <div className="max-w-xl mx-auto w-full p-6 space-y-12 animate-fade-in">
        <h1 className="text-4xl font-headline font-bold tracking-tighter uppercase">
          Settings
        </h1>

        <div className="space-y-8 bg-card p-8 rounded-2xl border border-border shadow-sm">
          <div className="space-y-6">
            <p className="text-[10px] font-headline font-bold text-muted-foreground uppercase tracking-widest border-b border-border pb-2">Identity</p>
            
            <div className="flex items-center justify-between group">
              <div className="space-y-1">
                <p className="text-[10px] font-headline font-bold text-muted-foreground uppercase tracking-widest">Username</p>
                <h2 className="text-xl font-medium">{userData?.username || "..."}</h2>
              </div>
              <Dialog open={isUsernameDialogOpen} onOpenChange={setIsUsernameDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="ghost" size="icon" className="rounded-full transition-all">
                    <Pencil className="h-4 w-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-background border-border sm:rounded-3xl">
                  <DialogHeader>
                    <DialogTitle className="font-headline font-bold text-xl uppercase">Change username</DialogTitle>
                    <DialogDescription className="font-headline text-[10px] uppercase tracking-widest text-muted-foreground">
                      This costs <span className="text-yellow-600 font-bold">1,000 coins</span>. 
                    </DialogDescription>
                  </DialogHeader>
                  <div className="py-4 space-y-4">
                    <div className="relative">
                      <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="New username"
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
                      {isUpdating ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirm change"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

            <div className="flex items-center justify-between group">
              <div className="space-y-1">
                <p className="text-[10px] font-headline font-bold text-muted-foreground uppercase tracking-widest">Password</p>
                <h2 className="text-xl font-medium tracking-widest">••••••••</h2>
              </div>
              <Dialog open={isPasswordDialogOpen} onOpenChange={setIsPasswordDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="ghost" size="icon" className="rounded-full transition-all">
                    <Pencil className="h-4 w-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-background border-border sm:rounded-3xl">
                  <DialogHeader>
                    <DialogTitle className="font-headline font-bold text-xl uppercase">Change password</DialogTitle>
                    <DialogDescription className="font-headline text-[10px] uppercase tracking-widest text-muted-foreground">
                      Secure your account with a new password.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="py-4 space-y-4">
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        type="password"
                        placeholder="New password"
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
                      {isUpdating ? <Loader2 className="h-4 w-4 animate-spin" /> : "Update password"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

            <div className="flex items-center justify-between group">
              <div className="space-y-1">
                <p className="text-[10px] font-headline font-bold text-muted-foreground uppercase tracking-widest">Email address</p>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-medium truncate max-w-[200px]">
                    {isEmailVerified ? censorEmail(user.email) : (user.email || "Not linked")}
                  </h2>
                  {isEmailVerified && <CheckCircle2 className="h-5 w-5 text-primary" />}
                </div>
                {!isEmailVerified && user.email && (
                  <div className="flex gap-2 mt-1">
                    <Button variant="link" onClick={handleResendEmailVerification} className="h-auto p-0 text-[10px] uppercase font-bold text-primary gap-1">
                      <RefreshCw className={cn("h-3 w-3", isUpdating && "animate-spin")} /> Resend link
                    </Button>
                  </div>
                )}
              </div>
              <Dialog open={isEmailDialogOpen} onOpenChange={setIsEmailDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="ghost" size="icon" className="rounded-full transition-all">
                    <Pencil className="h-4 w-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-background border-border sm:rounded-3xl">
                  <DialogHeader>
                    <DialogTitle className="font-headline font-bold text-xl uppercase">
                      {user.email ? "Update email" : "Link email"}
                    </DialogTitle>
                    <DialogDescription className="font-headline text-[10px] uppercase tracking-widest text-muted-foreground leading-relaxed">
                      We'll send an email to confirm your address. Click the link in your inbox to verify.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="py-4 space-y-4">
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        type="email"
                        placeholder="your@email.com"
                        value={newEmail}
                        onChange={(e) => setNewEmail(e.target.value)}
                        className="pl-10 h-12"
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button 
                      onClick={handleUpdateEmail} 
                      disabled={isUpdating || !newEmail}
                      className="bg-primary text-primary-foreground hover:bg-primary/90 w-full h-12 font-headline font-bold uppercase text-xs"
                    >
                      {isUpdating ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send confirmation link"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

            <div className="flex items-center justify-between group">
              <div className="space-y-1">
                <p className="text-[10px] font-headline font-bold text-muted-foreground uppercase tracking-widest">Phone number</p>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-medium">{userData?.phoneNumber || "Not linked"}</h2>
                  {userData?.phoneNumber && <CheckCircle2 className="h-5 w-5 text-primary" />}
                </div>
              </div>
              <Dialog open={isPhoneDialogOpen} onOpenChange={(open) => {
                setIsPhoneDialogOpen(open)
                if (!open) {
                  setPhoneStep('input')
                  setPhoneVerificationCode("")
                  setConfirmationResult(null)
                }
              }}>
                <DialogTrigger asChild>
                  <Button variant="ghost" size="icon" className="rounded-full transition-all">
                    <Pencil className="h-4 w-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-background border-border sm:rounded-3xl">
                  <DialogHeader>
                    <DialogTitle className="font-headline font-bold text-xl uppercase">
                      {phoneStep === 'input' ? "Link phone number" : "Verify code"}
                    </DialogTitle>
                    <DialogDescription className="font-headline text-[10px] uppercase tracking-widest text-muted-foreground leading-relaxed">
                      {phoneStep === 'input' 
                        ? "Enter your mobile number to receive a verification code via SMS." 
                        : `Type the 6-digit code sent to ${newPhone}.`}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="py-4 space-y-4">
                    {phoneStep === 'input' ? (
                      <div className="relative">
                        <Smartphone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="e.g. +1234567890"
                          value={newPhone}
                          onChange={(e) => setNewPhone(e.target.value)}
                          className="pl-10 h-12"
                        />
                      </div>
                    ) : (
                      <div className="relative">
                        <Check className="absolute left-3 top-3 h-4 w-4 text-primary" />
                        <Input
                          placeholder="6-digit code"
                          value={phoneVerificationCode}
                          onChange={(e) => setPhoneVerificationCode(e.target.value)}
                          maxLength={6}
                          className="pl-10 h-12 tracking-[0.5em] text-center font-bold"
                        />
                      </div>
                    )}
                  </div>
                  <DialogFooter>
                    {phoneStep === 'input' ? (
                      <Button 
                        onClick={handleSendPhoneCode} 
                        disabled={isUpdating || !newPhone}
                        className="bg-primary text-primary-foreground hover:bg-primary/90 w-full h-12 font-headline font-bold uppercase text-xs"
                      >
                        {isUpdating ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send SMS code"}
                      </Button>
                    ) : (
                      <Button 
                        onClick={handleVerifyAndLinkPhone} 
                        disabled={isUpdating || !phoneVerificationCode}
                        className="bg-primary text-primary-foreground hover:bg-primary/90 w-full h-12 font-headline font-bold uppercase text-xs"
                      >
                        {isUpdating ? <Loader2 className="h-4 w-4 animate-spin" /> : "Verify code"}
                      </Button>
                    )}
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          <div className="space-y-6 pt-4 border-t border-border">
             <p className="text-[10px] font-headline font-bold text-muted-foreground uppercase tracking-widest border-b border-border pb-2">Hub display</p>
             
             <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-[10px] font-headline font-bold text-muted-foreground uppercase tracking-widest">Birth date</p>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-medium uppercase">{userData?.dateOfBirth || "NOT SET"}</h2>
                  {isParentalMode && (
                    <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-primary/10 border border-primary/20">
                      <ShieldCheck className="h-3 w-3 text-primary" />
                      <span className="text-[8px] font-headline font-bold uppercase text-primary tracking-widest">Parental mode active</span>
                    </div>
                  )}
                </div>
              </div>
              <Dialog open={isDobDialogOpen} onOpenChange={setIsDobDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="ghost" size="icon" className="rounded-full transition-all">
                    <Pencil className="h-4 w-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-background border-border sm:rounded-3xl">
                  <DialogHeader>
                    <DialogTitle className="font-headline font-bold text-xl uppercase">Update birth date</DialogTitle>
                    <DialogDescription className="font-headline text-[10px] uppercase tracking-widest text-muted-foreground">
                      {isParentalMode 
                        ? "Birth date is locked in parental mode." 
                        : "Note: Setting a date under 18 will activate parental mode."}
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
                      {isUpdating ? <Loader2 className="h-4 w-4 animate-spin" /> : "Verify & save"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-[10px] font-headline font-bold text-muted-foreground uppercase tracking-widest">Visual mode</p>
                <div className="flex items-center gap-2">
                  {theme === "light" ? <Sun className="h-5 w-5 text-primary" /> : <Moon className="h-5 w-5 text-primary" />}
                  <span className="text-sm font-medium font-headline uppercase tracking-tight">{theme === "light" ? "Light Mode" : "Dark Mode"}</span>
                </div>
              </div>
              <Switch 
                checked={theme === "dark"} 
                onCheckedChange={toggleTheme}
              />
            </div>
          </div>

          {userData?.isAdmin && (
            <div className="pt-4 border-t border-border">
              <Link href="/admin">
                <Button 
                  variant="outline" 
                  className="w-full h-12 bg-secondary/50 border-border font-headline font-bold gap-2 uppercase text-xs tracking-widest"
                >
                  <ShieldAlert className="h-5 w-5 text-destructive" />
                  Admin panel
                </Button>
              </Link>
            </div>
          )}
        </div>
      </div>

      <AlertDialog open={isParentalLockConfirmOpen} onOpenChange={setIsParentalLockConfirmOpen}>
        <AlertDialogContent className="bg-background border-border sm:rounded-3xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-headline font-bold text-xl uppercase text-destructive flex items-center gap-2">
              <ShieldAlert className="h-6 w-6" /> Safety warning
            </AlertDialogTitle>
            <AlertDialogDescription className="font-headline text-xs uppercase tracking-tight text-muted-foreground leading-relaxed">
              Activating **Parental Mode** is irreversible.
              <br /><br />
              - Purchases will be locked.
              <br />
              - Age changes will be disabled.
              <br /><br />
              Proceed with activation?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel className="font-headline font-bold uppercase text-[10px] tracking-widest h-12">Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={applyDobUpdate}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 font-headline font-bold uppercase text-[10px] tracking-widest h-12"
            >
              Confirm activation
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  )
}
