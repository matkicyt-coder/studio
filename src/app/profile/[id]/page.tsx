
"use client"

import { useParams, useRouter } from "next/navigation"
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc } from "@/firebase"
import { NavigationBar } from "@/components/navigation-bar"
import { collection, query, where, limit, addDoc, doc, updateDoc, deleteDoc, arrayUnion } from "firebase/firestore"
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
  X,
  ShieldAlert,
  UserPlus,
  UserMinus,
  Star,
  UserCheck,
  UserX,
  Crown,
  Users
} from "lucide-react"
import { VerifiedBadge } from "@/components/verified-badge"
import { PremiumBadge } from "@/components/premium-badge"
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
import { useState, useEffect, useMemo } from "react"
import { useToast } from "@/hooks/use-toast"
import { errorEmitter } from "@/firebase/error-emitter"
import { FirestorePermissionError } from "@/firebase/errors"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"

const BADGE_MAP: Record<string, { name: string, icon: any, color: string }> = {
  "friendship": { name: "Friendship", icon: Users, color: "text-blue-500" },
  "admin": { name: "Administrator", icon: ShieldCheck, color: "text-primary" },
  "premium": { name: "Premium Club", icon: Crown, color: "text-amber-500" }
}

export default function ProfilePage() {
  const params = useParams()
  const router = useRouter()
  const { user, isUserLoading } = useUser()
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

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push("/login")
    }
  }, [user, isUserLoading, router])

  const currentUserDocRef = useMemoFirebase(() => {
    if (!db || !user?.uid) return null
    return doc(db, "users", user.uid)
  }, [db, user?.uid])
  const { data: currentUserData } = useDoc(currentUserDocRef)

  const userQuery = useMemoFirebase(() => {
    if (!db || !user || isNaN(sequentialId)) return null
    return query(
      collection(db, "users"), 
      where("sequentialId", "==", sequentialId),
      limit(1)
    )
  }, [db, user, sequentialId])

  const { data: userDataList, isLoading } = useCollection(userQuery)
  const profileUser = userDataList?.[0]

  // Friend logic
  const friendshipsQuery1 = useMemoFirebase(() => {
    if (!db || !user?.uid || !profileUser) return null
    return query(collection(db, "friendships"), where("user1", "==", user.uid), where("user2", "==", profileUser.id))
  }, [db, user?.uid, profileUser])
  const friendshipsQuery2 = useMemoFirebase(() => {
    if (!db || !user?.uid || !profileUser) return null
    return query(collection(db, "friendships"), where("user2", "==", user.uid), where("user1", "==", profileUser.id))
  }, [db, user?.uid, profileUser])
  
  const { data: f1 } = useCollection(friendshipsQuery1)
  const { data: f2 } = useCollection(friendshipsQuery2)
  const friendship = useMemo(() => [...(f1 || []), ...(f2 || [])][0], [f1, f2])

  const totalFriendsQuery1 = useMemoFirebase(() => {
    if (!db || !user?.uid) return null
    return query(collection(db, "friendships"), where("user1", "==", user.uid), where("status", "==", "accepted"))
  }, [db, user?.uid])
  const totalFriendsQuery2 = useMemoFirebase(() => {
    if (!db || !user?.uid) return null
    return query(collection(db, "friendships"), where("user2", "==", user.uid), where("status", "==", "accepted"))
  }, [db, user?.uid])
  const { data: tf1 } = useCollection(totalFriendsQuery1)
  const { data: tf2 } = useCollection(totalFriendsQuery2)
  const totalFriendsCount = (tf1?.length || 0) + (tf2?.length || 0)

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
        toast({ title: "DESCRIPTION UPDATED" })
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
    if (!db || !user || !profileUser || !reportReason || !currentUserData) return
    setIsReporting(true)

    const reportData = {
      reporterId: user.uid,
      reporterUsername: currentUserData.username,
      targetUserId: profileUser.id,
      targetUsername: profileUser.username,
      reportTarget: reportTarget,
      category: reportCategory,
      reason: reportReason,
      status: "pending",
      createdAt: new Date().toISOString()
    }

    const reportsRef = collection(db, "reports")
    addDoc(reportsRef, reportData)
      .then(() => {
        toast({
          title: "REPORT SUBMITTED",
          description: "THE MODERATION TERMINAL HAS RECEIVED YOUR REPORT."
        })
        setIsReportDialogOpen(false)
        setReportReason("")
      })
      .catch(async (error) => {
        errorEmitter.emit("permission-error", new FirestorePermissionError({
          path: "reports",
          operation: "create",
          requestResourceData: reportData
        }))
      })
      .finally(() => setIsReporting(false))
  }

  const handleActionFriend = async (action: 'add' | 'remove' | 'accept' | 'decline' | 'cancel') => {
    if (!db || !user || !profileUser) return
    
    if (action === 'add') {
      if (totalFriendsCount >= 20) {
        toast({ variant: "destructive", title: "LIMIT REACHED", description: "YOU CAN ONLY HAVE 20 FRIENDS." })
        return
      }
      addDoc(collection(db, "friendships"), {
        user1: user.uid < profileUser.id ? user.uid : profileUser.id,
        user2: user.uid < profileUser.id ? profileUser.id : user.uid,
        status: 'pending',
        requestSentBy: user.uid,
        bestFriendOf: [],
        createdAt: new Date().toISOString()
      })
      toast({ title: "REQUEST SENT" })
    } else if (action === 'accept') {
      if (friendship) {
        updateDoc(doc(db, "friendships", friendship.id), {
          status: 'accepted',
          createdAt: new Date().toISOString()
        })
        
        // Grant friendship badge if they don't have it
        if (currentUserData && !currentUserData.badges?.includes("friendship")) {
          updateDoc(doc(db, "users", user.uid), {
            badges: arrayUnion("friendship")
          })
        }

        toast({ title: "REQUEST ACCEPTED" })
      }
    } else if (action === 'remove' || action === 'decline' || action === 'cancel') {
      if (friendship) {
        deleteDoc(doc(db, "friendships", friendship.id))
        toast({ title: action === 'remove' ? "FRIEND REMOVED" : "REQUEST CLEARED" })
      }
    }
  }

  if (isUserLoading || isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    )
  }

  if (!profileUser) return (
    <main className="min-h-screen bg-background w-full pt-24 px-6">
      <NavigationBar />
      <div className="max-w-xl mx-auto text-center space-y-6">
        <AlertCircle className="h-16 w-16 text-muted-foreground mx-auto" />
        <h1 className="text-2xl sm:text-3xl font-headline font-bold uppercase">USER NOT FOUND</h1>
        <Button onClick={() => router.push("/home")} variant="outline" className="gap-2 uppercase font-bold text-xs">
          <ArrowLeft className="h-4 w-4" /> BACK HOME
        </Button>
      </div>
    </main>
  )

  const isPermBanned = profileUser.isBanned && profileUser.banType === 'perm'
  if (isPermBanned) return (
    <main className="min-h-screen bg-background w-full pt-24 px-6">
      <NavigationBar />
      <div className="max-w-xl mx-auto text-center space-y-6 animate-fade-in">
        <ShieldAlert className="h-16 w-16 text-destructive mx-auto" />
        <h1 className="text-2xl sm:text-3xl font-headline font-bold uppercase tracking-tighter">ACCOUNT TERMINATED</h1>
        <p className="text-muted-foreground font-body text-sm sm:text-base">THIS PROFILE IS NO LONGER AVAILABLE DUE TO A VIOLATION OF THE TERMS OF SERVICE.</p>
        <Button onClick={() => router.push("/home")} variant="outline" className="gap-2 uppercase font-bold text-xs">
          <ArrowLeft className="h-4 w-4" /> BACK HOME
        </Button>
      </div>
    </main>
  )

  const isOwnProfile = user?.uid === profileUser.id
  const joinDate = profileUser.createdAt ? new Date(profileUser.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : "RECENTLY"

  // Relationship status
  const isAccepted = friendship?.status === 'accepted'
  const isPending = friendship?.status === 'pending'
  const wasSentByMe = friendship?.requestSentBy === user?.uid

  return (
    <main className="min-h-screen bg-background w-full pt-24 pb-20 px-4 sm:px-6">
      <NavigationBar />
      <div className="max-w-3xl mx-auto space-y-8 animate-fade-in">
        <div className="flex items-center justify-between">
          <Button onClick={() => router.back()} variant="ghost" size="icon" className="rounded-full hover:bg-accent shrink-0"><ArrowLeft className="h-6 w-6" /></Button>
          {!isOwnProfile && (
            <div className="flex gap-2">
              {isAccepted ? (
                <Button 
                  onClick={() => handleActionFriend('remove')} 
                  variant="outline"
                  className="font-headline font-bold uppercase text-xs gap-2 rounded-full h-10 px-6"
                >
                  <UserMinus className="h-4 w-4" />
                  REMOVE FRIEND
                </Button>
              ) : isPending ? (
                wasSentByMe ? (
                  <Button 
                    onClick={() => handleActionFriend('cancel')} 
                    variant="secondary"
                    className="font-headline font-bold uppercase text-xs gap-2 rounded-full h-10 px-6"
                  >
                    <UserX className="h-4 w-4" />
                    CANCEL REQUEST
                  </Button>
                ) : (
                  <>
                    <Button 
                      onClick={() => handleActionFriend('accept')} 
                      variant="default"
                      className="font-headline font-bold uppercase text-xs gap-2 rounded-full h-10 px-6"
                    >
                      <UserCheck className="h-4 w-4" />
                      ACCEPT
                    </Button>
                    <Button 
                      onClick={() => handleActionFriend('decline')} 
                      variant="outline"
                      className="font-headline font-bold uppercase text-xs gap-2 rounded-full h-10 px-6 text-destructive"
                    >
                      <X className="h-4 w-4" />
                      DECLINE
                    </Button>
                  </>
                )
              ) : (
                <Button 
                  onClick={() => handleActionFriend('add')} 
                  variant="default"
                  className="font-headline font-bold uppercase text-xs gap-2 rounded-full h-10 px-6"
                >
                  <UserPlus className="h-4 w-4" />
                  ADD FRIEND
                </Button>
              )}
            </div>
          )}
        </div>

        <div className="space-y-8">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 sm:w-16 sm:h-16 bg-primary/10 rounded-full flex items-center justify-center border-2 border-primary/20 shrink-0 relative">
              <User className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
              {friendship?.bestFriendOf?.includes(user?.uid) && (
                <div className="absolute -top-1 -right-1">
                  <Star className="h-5 w-5 text-yellow-500 fill-yellow-500 drop-shadow-sm" />
                </div>
              )}
            </div>
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2 truncate">
                  <h1 className="text-2xl sm:text-4xl font-headline font-bold tracking-tighter uppercase flex items-center gap-2 truncate">
                    {profileUser.username}
                  </h1>
                  {profileUser.isPremium && <PremiumBadge className="h-6 w-6 sm:h-8 sm:w-8 shrink-0" />}
                  {profileUser.isVerified && <VerifiedBadge className="h-6 w-6 sm:h-8 sm:w-8 shrink-0" />}
                  {profileUser.isAdmin && <ShieldCheck className="h-4 w-4 sm:h-5 sm:w-5 text-primary shrink-0" />}
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-10 pt-4">
            <div className="space-y-6">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <h3 className="text-[10px] font-headline font-bold text-muted-foreground uppercase tracking-widest">Description</h3>
                  {isOwnProfile && !isEditingDescription && <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full shrink-0" onClick={() => setIsEditingDescription(true)}><Pencil className="h-3 w-3" /></Button>}
                </div>
                {isEditingDescription ? (
                  <div className="space-y-3">
                    <Textarea value={newDescription} onChange={(e) => setNewDescription(e.target.value)} placeholder="WRITE SOMETHING..." className="min-h-[100px] bg-card border-primary/20 text-sm w-full" />
                    <div className="flex gap-2">
                      <Button size="sm" onClick={handleUpdateDescription} disabled={isSavingDescription} className="font-headline font-bold text-xs uppercase flex-1 sm:flex-none">{isSavingDescription ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3 mr-1" />}SAVE</Button>
                      <Button size="sm" variant="ghost" onClick={() => { setIsEditingDescription(false); setNewDescription(profileUser.description || ""); }} className="font-headline font-bold text-xs uppercase flex-1 sm:flex-none"><X className="h-3 w-3 mr-1" />CANCEL</Button>
                    </div>
                  </div>
                ) : (
                  <p className="text-base sm:text-lg text-foreground/80 leading-relaxed font-body whitespace-pre-wrap break-words w-full">{profileUser.description || "NO DESCRIPTION SET."}</p>
                )}
              </div>

              {/* Badges Section - Now UNDER Description */}
              <div className="flex flex-col items-start gap-3 pt-2">
                <h3 className="text-[10px] font-headline font-bold text-muted-foreground uppercase tracking-widest">Achievements</h3>
                <div className="flex flex-wrap gap-2 justify-start">
                  {profileUser.badges?.map((badgeId: string) => {
                    const badge = BADGE_MAP[badgeId]
                    if (!badge) return null
                    return (
                      <Link key={badgeId} href="/badges">
                        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-card border border-border hover:border-primary/50 transition-all cursor-pointer shadow-sm group">
                          <badge.icon className={cn("h-3.5 w-3.5", badge.color)} />
                          <span className="text-[9px] font-headline font-bold uppercase tracking-tight group-hover:text-primary">{badge.name}</span>
                        </div>
                      </Link>
                    )
                  })}
                  {(!profileUser.badges || profileUser.badges.length === 0) && (
                    <span className="text-[10px] text-muted-foreground/40 italic">No badges earned.</span>
                  )}
                </div>
              </div>

              {profileUser.pastUsernames && profileUser.pastUsernames.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-[10px] font-headline font-bold text-muted-foreground uppercase tracking-widest">Past Names</h3>
                  <div className="flex flex-wrap gap-x-2 gap-y-1">
                    {profileUser.pastUsernames.map((name: string, i: number) => (
                      <span key={i} className="text-xs text-muted-foreground/60 italic font-medium">{name}{i < (profileUser.pastUsernames?.length || 0) - 1 ? "," : ""}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pt-8 border-t border-border/30 gap-6">
              <div className="flex flex-col items-start gap-1">
                <span className="text-[10px] font-headline font-bold text-muted-foreground uppercase tracking-[0.2em]">JOINED SINCE</span>
                <div className="flex items-center gap-1.5 text-foreground/60"><Clock className="h-3 w-3" /><span className="text-sm font-medium">{joinDate}</span></div>
              </div>

              {!isOwnProfile && (
                <Dialog open={isReportDialogOpen} onOpenChange={setIsReportDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="ghost" className="text-muted-foreground hover:text-destructive gap-2 font-headline text-[10px] font-bold uppercase tracking-widest h-auto p-0 group"><Flag className="h-3 w-3 group-hover:fill-destructive" /> REPORT PROFILE</Button>
                  </DialogTrigger>
                  <DialogContent className="bg-background border-border w-[95vw] rounded-3xl sm:max-w-[425px]">
                    <DialogHeader><DialogTitle className="font-headline font-bold text-2xl uppercase">REPORT PROFILE</DialogTitle><DialogDescription>EXPLAIN WHY THIS PROFILE VIOLATES TERMINAL STANDARDS.</DialogDescription></DialogHeader>
                    <div className="py-6 space-y-4">
                      <div className="space-y-2"><label className="text-[10px] font-headline font-bold text-muted-foreground uppercase tracking-widest">PART OF PROFILE</label><Select value={reportTarget} onValueChange={(val: any) => setReportTarget(val)}><SelectTrigger className="bg-muted/20 h-12"><SelectValue placeholder="SELECT TARGET" /></SelectTrigger><SelectContent><SelectItem value="username">USERNAME</SelectItem><SelectItem value="description">DESCRIPTION</SelectItem></SelectContent></Select></div>
                      <div className="space-y-2"><label className="text-[10px] font-headline font-bold text-muted-foreground uppercase tracking-widest">VIOLATION CATEGORY</label><Select value={reportCategory} onValueChange={(val: any) => setReportCategory(val)}><SelectTrigger className="bg-muted/20 h-12"><SelectValue placeholder="SELECT CATEGORY" /></SelectTrigger><SelectContent><SelectItem value="sexual">SEXUAL CONTENT</SelectItem><SelectItem value="inappropriate">INAPPROPRIATE BEHAVIOR</SelectItem><SelectItem value="other">OTHER</SelectItem></SelectContent></Select></div>
                      <div className="space-y-2"><label className="text-[10px] font-headline font-bold text-muted-foreground uppercase tracking-widest">DETAILS</label><Textarea placeholder="DESCRIBE THE ISSUE..." value={reportReason} onChange={(e) => setReportReason(e.target.value)} className="min-h-[120px] bg-muted/20 text-sm" /></div>
                    </div>
                    <DialogFooter><Button onClick={handleReport} disabled={isReporting || !reportReason || !currentUserData} variant="destructive" className="w-full h-12 font-headline font-bold uppercase text-xs">{isReporting ? <Loader2 className="h-4 w-4 animate-spin" /> : "SUBMIT REPORT"}</Button></DialogFooter>
                  </DialogContent>
                </Dialog>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
