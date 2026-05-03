
"use client"

import { useUser, useFirestore, useDoc, useMemoFirebase, useAuth } from "@/firebase"
import { doc, updateDoc } from "firebase/firestore"
import { signOut } from "firebase/auth"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { AlertCircle, ShieldAlert, LogOut, CheckCircle2 } from "lucide-react"
import { useState, useEffect } from "react"
import { errorEmitter } from "@/firebase/error-emitter"
import { FirestorePermissionError } from "@/firebase/errors"

export function BanGate({ children }: { children: React.ReactNode }) {
  const { user, isUserLoading } = useUser()
  const db = useFirestore()
  const auth = useAuth()
  const router = useRouter()
  const [now, setNow] = useState(new Date())

  const userDocRef = useMemoFirebase(() => {
    if (!db || !user?.uid) return null
    return doc(db, "users", user.uid)
  }, [db, user?.uid])

  const { data: userData, isLoading: isUserDataLoading } = useDoc(userDocRef)

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 10000)
    return () => clearInterval(interval)
  }, [])

  if (isUserLoading || isUserDataLoading) return children

  if (!userData) return children

  const handleLogout = async () => {
    await signOut(auth)
    router.push("/login")
  }

  const handleAcceptTerms = async () => {
    if (!userDocRef) return
    updateDoc(userDocRef, { 
      needsToAcceptTerms: false,
      isBanned: false,
      banType: "none"
    }).catch(error => {
      errorEmitter.emit("permission-error", new FirestorePermissionError({
        path: userDocRef.path,
        operation: "update",
        requestResourceData: { needsToAcceptTerms: false }
      }))
    })
  }

  const isTempBanned = userData.isBanned && (userData.banType === 'temp-1' || userData.banType === 'temp-7')
  const banExpired = userData.banExpiry ? new Date(userData.banExpiry) <= now : false

  // 1. Permanent Ban
  if (userData.isBanned && userData.banType === 'perm') {
    return (
      <div className="fixed inset-0 z-[9999] bg-background flex flex-col items-center justify-center p-6 text-center animate-fade-in">
        <ShieldAlert className="h-20 w-20 text-destructive mb-6" />
        <h1 className="text-4xl font-headline font-bold mb-4 tracking-tighter uppercase">Permanent Ban</h1>
        <p className="text-muted-foreground max-w-md mb-8">
          Your account has been terminated for serious or repeated violations of the Terms of Service.
          <br /><br />
          <span className="text-foreground font-medium">Reason:</span> {userData.banReason || "No reason specified."}
        </p>
        <Button onClick={handleLogout} variant="destructive" className="font-headline font-bold uppercase tracking-widest h-12 px-8">
          <LogOut className="h-4 w-4 mr-2" /> Logout
        </Button>
      </div>
    )
  }

  // 2. Temp Ban (Active)
  if (isTempBanned && !banExpired) {
    return (
      <div className="fixed inset-0 z-[9999] bg-background flex flex-col items-center justify-center p-6 text-center animate-fade-in">
        <AlertCircle className="h-20 w-20 text-destructive mb-6" />
        <h1 className="text-4xl font-headline font-bold mb-4 tracking-tighter uppercase">
          {userData.banType === 'temp-1' ? '1 Day Ban' : '7 Day Ban'}
        </h1>
        <div className="bg-muted/30 p-6 rounded-2xl border border-border max-w-md mb-8 space-y-4">
          <div className="text-left space-y-1">
            <span className="text-[10px] font-headline font-bold text-muted-foreground uppercase tracking-widest">Offense</span>
            <p className="text-sm italic">"{userData.banOffensiveContent || "N/A"}"</p>
          </div>
          <div className="text-left space-y-1">
            <span className="text-[10px] font-headline font-bold text-muted-foreground uppercase tracking-widest">Reason</span>
            <p className="text-sm font-medium">{userData.banReason}</p>
          </div>
          <div className="pt-4 border-t border-border">
            <p className="text-xs text-muted-foreground italic">
              Expires: {new Date(userData.banExpiry!).toLocaleString()}
            </p>
          </div>
        </div>
        <Button onClick={handleLogout} variant="outline" className="font-headline font-bold uppercase tracking-widest h-12 px-8">
          <LogOut className="h-4 w-4 mr-2" /> Logout
        </Button>
      </div>
    )
  }

  // 3. Warning or Expired Temp Ban (Needs Terms Acceptance)
  if (userData.needsToAcceptTerms || (isTempBanned && banExpired)) {
    return (
      <div className="fixed inset-0 z-[9999] bg-background/95 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center animate-fade-in">
        <div className="max-w-md w-full bg-card border border-border p-8 rounded-3xl shadow-2xl space-y-8">
          <ShieldAlert className="h-16 w-16 text-primary mx-auto" />
          <div className="space-y-2">
            <h1 className="text-3xl font-headline font-bold tracking-tighter uppercase">
              {userData.banType === 'warning' ? 'Warning Issued' : 'Ban Expired'}
            </h1>
            <p className="text-muted-foreground text-sm">
              {userData.banType === 'warning' 
                ? "Your behavior has been flagged by the moderation team."
                : "Your temporary suspension has concluded."}
            </p>
          </div>

          <div className="bg-muted/50 p-6 rounded-2xl text-left space-y-4 border border-border/50">
            <div className="space-y-1">
              <span className="text-[10px] font-headline font-bold text-muted-foreground uppercase tracking-widest">Details</span>
              <p className="text-sm font-medium">{userData.banReason || "Standard behavioral warning."}</p>
            </div>
            {userData.banOffensiveContent && (
              <div className="space-y-1 pt-2 border-t border-border/30">
                <span className="text-[10px] font-headline font-bold text-muted-foreground uppercase tracking-widest">Offensive Content</span>
                <p className="text-sm italic">"{userData.banOffensiveContent}"</p>
              </div>
            )}
          </div>

          <div className="space-y-4 pt-4">
            <p className="text-[10px] font-headline font-bold uppercase tracking-tighter text-muted-foreground">
              By clicking below, you acknowledge the violation and re-agree to the Terms of Service.
            </p>
            <Button onClick={handleAcceptTerms} className="w-full h-14 font-headline font-bold uppercase tracking-widest gap-2">
              <CheckCircle2 className="h-5 w-5" /> Agree to Terms
            </Button>
            <Button onClick={handleLogout} variant="ghost" className="w-full text-muted-foreground hover:text-foreground">
              Logout
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return children
}
