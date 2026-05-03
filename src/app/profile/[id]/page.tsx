
"use client"

import { useParams, useRouter } from "next/navigation"
import { useUser, useFirestore, useCollection, useMemoFirebase } from "@/firebase"
import { NavigationBar } from "@/components/navigation-bar"
import { collection, query, where, limit, addDoc, doc, updateDoc } from "firebase/firestore"
import { 
  User, 
  ShieldCheck, 
  Flag, 
  Clock, 
  ArrowLeft, 
  Loader2,
  AlertCircle,
  Pencil,
  Check,
  X
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { useState, useEffect } from "react"
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
  const [reportTarget, setReportTarget] = useState<"username" | "description">("username")
  const [reportCategory, setReportCategory] = useState<"sexual" | "inappropriate" | "other">("other")
  const [isReporting, setIsReporting] = useState(false)
  const [isReportDialogOpen, setIsReportDialogOpen] = useState(false)

  const [isEditingDescription, setIsEditingDescription] = useState(false)
  const [newDescription, setNewDescription] = useState("")
  const [isSavingDescription, setIsSavingDescription] = useState(false)

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

  useEffect(() => {
    if (profileUser) {
      setNewDescription(profileUser.description || "")
    }
  }, [profileUser])

  const handleUpdateDescription = async () => {
    if (!db || !user || !profileUser || user.uid !== profileUser.id) return
    setIsSavingDescription(true)
    const userRef = doc(db, "users", profileUser.id)
    updateDoc(userRef, { description: newDescription })
      .then(() => {
        toast({ title: "Description updated" })
        setIsEditingDescription(false)
      })
      .catch(error => {
        errorEmitter.emit("permission-error", new FirestorePermissionError({
          path: userRef.path,
          operation: "update",
          requestResourceData: { description: newDescription }
        }))
      })
      .finally(() => setIsSavingDescription(false))
  }

  const handleReport = async () => {
    if (!db || !user || !profileUser || !reportReason) return

    setIsReporting(true)
    const reportData = {
      reporterId: user.uid,
      reporterUsername: user.displayName || "Anonymous",
      targetUserId: profileUser.id,
      targetUsername: profileUser.username,
      reportTarget,
      category: reportCategory,
      reason: reportReason,
      status: "pending",
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

  const isOwnProfile = user?.uid === profileUser.id
  const joinDate = profileUser.createdAt 
    ? new Date(profileUser.createdAt).toLocaleDateString('en-US', {
        month: 'long',
        year: 'numeric'
      })
    : "Recently"

  return (
    <main className="min-h-screen bg-background w-full pt-24 pb-20 px-6">
      <NavigationBar />
      
      <div className="max-w-2xl mx-auto space-y-8 animate-fade-in">
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

        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center border-2 border-primary/20">
              <User className="h-8 w-8 text-primary" />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <h1 className="text-4xl font-headline font-bold tracking-tighter">
                  {profileUser.username}
                </h1>
                {profileUser.isAdmin && (
                  <ShieldCheck className="h-5 w-5 text-primary" />
                )}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-start justify-between">
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2">
                  <h3 className="text-xs font-headline font-bold text-muted-foreground uppercase tracking-widest">Description</h3>
                  {isOwnProfile && !isEditingDescription && (
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-6 w-6 rounded-full"
                      onClick={() => setIsEditingDescription(true)}
                    >
                      <Pencil className="h-3 w-3" />
                    </Button>
                  )}
                </div>
                
                {isEditingDescription ? (
                  <div className="space-y-3">
                    <Textarea 
                      value={newDescription}
                      onChange={(e) => setNewDescription(e.target.value)}
                      placeholder="Write something about yourself..."
                      className="min-h-[100px] bg-card border-primary/20"
                    />
                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        onClick={handleUpdateDescription}
                        disabled={isSavingDescription}
                        className="font-headline font-bold text-xs"
                      >
                        {isSavingDescription ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3 mr-1" />}
                        Save
                      </Button>
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        onClick={() => {
                          setIsEditingDescription(false)
                          setNewDescription(profileUser.description || "")
                        }}
                        className="font-headline font-bold text-xs"
                      >
                        <X className="h-3 w-3 mr-1" />
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <p className="text-lg text-foreground/80 leading-relaxed font-body whitespace-pre-wrap">
                    {profileUser.description || "No description set."}
                  </p>
                )}
              </div>
            </div>

            <div className="flex flex-col items-end gap-2 pt-6">
              {!isOwnProfile && (
                <Dialog open={isReportDialogOpen} onOpenChange={setIsReportDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="ghost" className="text-muted-foreground hover:text-destructive gap-2 font-headline text-[10px] font-bold uppercase tracking-widest h-auto p-0">
                      <Flag className="h-3 w-3" /> Report Profile
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="bg-background border-border">
                    <DialogHeader>
                      <DialogTitle className="font-headline font-bold text-2xl">Report Profile</DialogTitle>
                      <DialogDescription>
                        Explain why this profile violates terminal standards.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="py-6 space-y-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-headline font-bold text-muted-foreground uppercase tracking-widest">Part of profile</label>
                        <Select value={reportTarget} onValueChange={(val: any) => setReportTarget(val)}>
                          <SelectTrigger className="bg-muted/20 h-12">
                            <SelectValue placeholder="Select target" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="username">Username</SelectItem>
                            <SelectItem value="description">Description</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] font-headline font-bold text-muted-foreground uppercase tracking-widest">Violation Category</label>
                        <Select value={reportCategory} onValueChange={(val: any) => setReportCategory(val)}>
                          <SelectTrigger className="bg-muted/20 h-12">
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="sexual">Sexual content</SelectItem>
                            <SelectItem value="inappropriate">Inappropriate behavior</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] font-headline font-bold text-muted-foreground uppercase tracking-widest">Details</label>
                        <Textarea
                          placeholder="Describe the issue in detail..."
                          value={reportReason}
                          onChange={(e) => setReportReason(e.target.value)}
                          className="min-h-[120px] bg-muted/20"
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button 
                        onClick={handleReport}
                        disabled={isReporting || !reportReason}
                        variant="destructive"
                        className="w-full h-12 font-headline font-bold uppercase text-xs"
                      >
                        {isReporting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Submit Report"}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              )}

              <div className="flex flex-col items-end">
                <span className="text-[10px] font-headline font-bold text-muted-foreground uppercase tracking-[0.2em]">Joined Since</span>
                <div className="flex items-center gap-1.5 text-foreground/60">
                  <Clock className="h-3 w-3" />
                  <span className="text-sm font-medium">{joinDate}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="pt-12 text-center">
          <p className="text-muted-foreground text-[10px] font-headline uppercase tracking-widest opacity-40">
            Registered: {profileUser.createdAt ? new Date(profileUser.createdAt).toLocaleTimeString() : "..."}
          </p>
        </div>
      </div>
    </main>
  )
}
