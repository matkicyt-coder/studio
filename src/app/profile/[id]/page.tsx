"use client"

import { useParams, useRouter } from "next/navigation"
import { useUser, useFirestore, useCollection, useMemoFirebase } from "@/firebase"
import { NavigationBar } from "@/components/navigation-bar"
import { collection, query, where, limit, addDoc } from "firebase/firestore"
import { 
  User, 
  ShieldCheck, 
  Flag, 
  Clock, 
  ArrowLeft, 
  Loader2,
  AlertCircle
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { useState } from "react"
import { useToast } from "@/hooks/use-toast"
import { errorEmitter } from "@/firebase/error-emitter"
import { FirestorePermissionError } from "@/firebase/errors"

export default function ProfilePage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useUser()
  const db = useFirestore()
  const { toast } = useToast()
  
  const [reportReason, setReportReason] = useState("")
  const [isReporting, setIsReporting] = useState(false)
  const [isReportDialogOpen, setIsReportDialogOpen] = useState(false)

  const sequentialId = parseInt(params.id as string)

  const userQuery = useMemoFirebase(() => {
    if (!db || isNaN(sequentialId)) return null
    return query(
      collection(db, "users"), 
      where("sequentialId", "==", sequentialId),
      limit(1)
    )
  }, [db, sequentialId])

  const { data: userDataList, isLoading } = useCollection(userQuery)
  const profileUser = userDataList?.[0]

  const handleReport = async () => {
    if (!db || !user || !profileUser || !reportReason) return

    setIsReporting(true)
    const reportData = {
      reporterId: user.uid,
      reporterUsername: user.displayName || "Anonymous",
      targetUserId: profileUser.id,
      targetUsername: profileUser.username,
      reason: reportReason,
      createdAt: new Date().toISOString()
    }

    const reportsRef = collection(db, "reports")
    addDoc(reportsRef, reportData)
      .then(() => {
        toast({
          title: "Report Submitted",
          description: "Thank you. Our moderation team will review this report.",
        })
        setIsReportDialogOpen(false)
        setReportReason("")
      })
      .catch(async (error) => {
        errorEmitter.emit("permission-error", new FirestorePermissionError({
          path: reportsRef.path,
          operation: "create",
          requestResourceData: reportData,
        }))
      })
      .finally(() => setIsReporting(false))
  }

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    )
  }

  if (!profileUser) {
    return (
      <main className="min-h-screen bg-background w-full pt-24 px-6">
        <NavigationBar />
        <div className="max-w-xl mx-auto text-center space-y-6">
          <AlertCircle className="h-16 w-16 text-muted-foreground mx-auto" />
          <h1 className="text-3xl font-headline font-bold">User Not Found</h1>
          <Button onClick={() => router.push("/home")} variant="outline" className="gap-2">
            <ArrowLeft className="h-4 w-4" /> Back Home
          </Button>
        </div>
      </main>
    )
  }

  const joinDate = profileUser.createdAt 
    ? new Date(profileUser.createdAt).toLocaleDateString('en-US', {
        month: 'long',
        year: 'numeric'
      })
    : "Recently"

  return (
    <main className="min-h-screen bg-background w-full pt-24 pb-20 px-6">
      <NavigationBar />
      
      <div className="max-w-2xl mx-auto space-y-12 animate-fade-in">
        <div className="flex items-center">
          <Button 
            onClick={() => router.back()} 
            variant="ghost" 
            size="icon" 
            className="rounded-full hover:bg-accent"
          >
            <ArrowLeft className="h-6 w-6" />
          </Button>
        </div>

        <div className="space-y-10 text-center">
          <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center mx-auto border-2 border-primary/20">
            <User className="h-12 w-12 text-primary" />
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center justify-center gap-3">
              <h1 className="text-5xl font-headline font-bold tracking-tighter">
                {profileUser.username}
              </h1>
              {profileUser.isAdmin && (
                <div className="p-2 bg-primary/10 text-primary border border-primary/20 rounded-full" title="Administrator">
                  <ShieldCheck className="h-5 w-5" />
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between p-8 rounded-3xl bg-card border border-border gap-6">
          <div className="flex flex-col items-center sm:items-start gap-2">
            <span className="text-xs font-headline font-bold text-muted-foreground uppercase tracking-widest">Member Since</span>
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              <span className="text-xl font-medium">{joinDate}</span>
            </div>
          </div>

          <Dialog open={isReportDialogOpen} onOpenChange={setIsReportDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="ghost" className="text-muted-foreground hover:text-destructive gap-2 font-headline text-xs font-bold uppercase tracking-widest">
                <Flag className="h-4 w-4" /> Report User
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-background border-border">
              <DialogHeader>
                <DialogTitle className="font-headline font-bold text-2xl">Report Misconduct</DialogTitle>
                <DialogDescription>
                  Help us keep the terminal safe. Explain what happened with {profileUser.username}.
                </DialogDescription>
              </DialogHeader>
              <div className="py-6">
                <Textarea
                  placeholder="Describe the issue..."
                  value={reportReason}
                  onChange={(e) => setReportReason(e.target.value)}
                  className="min-h-[120px] bg-muted/20"
                />
              </div>
              <DialogFooter>
                <Button 
                  onClick={handleReport}
                  disabled={isReporting || !reportReason}
                  variant="destructive"
                  className="w-full h-12 font-headline font-bold"
                >
                  {isReporting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Submit Report"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <div className="pt-12 text-center">
          <p className="text-muted-foreground text-sm font-body max-w-sm mx-auto opacity-60">
            Profile registered at {profileUser.createdAt ? new Date(profileUser.createdAt).toLocaleTimeString() : "unknown time"}
          </p>
        </div>
      </div>
    </main>
  )
}
