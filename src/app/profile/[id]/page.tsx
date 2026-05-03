
"use client"

import { useParams, useRouter } from "next/navigation"
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc } from "@/firebase"
import { NavigationBar } from "@/components/navigation-bar"
import { collection, query, where, limit, addDoc, doc, updateDoc, deleteDoc, arrayUnion, arrayRemove } from "firebase/firestore"
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
  Users,
  MoreVertical,
  Wifi
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
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
    if (!db || isNaN(sequentialId)) return null
    return query(collection(db, "users"), where("sequentialId", "==", sequentialId), limit(1))
  }, [db, sequentialId])
  const { data: userDataList, isLoading: isUserLoadingDoc } = useCollection(userQuery)
  const profileUser = userDataList?.[0]

  // Stats: Friends
  const f1Query = useMemoFirebase(() => {
    if (!db || !profileUser) return null
    return query(collection(db, "friendships"), where("user1", "==", profileUser.id), where("status", "==", "accepted"))
  }, [db, profileUser])
  const f2Query = useMemoFirebase(() => {
    if (!db || !profileUser) return null
    return query(collection(db, "friendships"), where("user2", "==", profileUser.id), where("status", "==", "accepted"))
  }, [db, profileUser])
  const { data: f1Count } = useCollection(f1Query)
  const { data: f2Count } = useCollection(f2Query)
  const friendsCount = (f1Count?.length || 0) + (f2Count?.length || 0)

  // Stats: Followers
  const followersQuery = useMemoFirebase(() => {
    if (!db || !profileUser) return null
    return query(collection(db, "follows"), where("followingId", "==", profileUser.id))
  }, [db, profileUser])
  const { data: followers } = useCollection(followersQuery)
  const followersCount = followers?.length || 0

  // Stats: Following
  const followingQuery = useMemoFirebase(() => {
    if (!db || !profileUser) return null
    return query(collection(db, "follows"), where("followerId", "==", profileUser.id))
  }, [db, profileUser])
  const { data: followingList } = useCollection(followingQuery)
  const followingCount = followingList?.length || 0

  // Relationships with current user
  const myFriendshipQuery = useMemoFirebase(() => {
    if (!db || !user?.uid || !profileUser) return null
    const small = user.uid < profileUser.id ? user.uid : profileUser.id
    const big = user.uid < profileUser.id ? profileUser.id : user.uid
    return query(collection(db, "friendships"), where("user1", "==", small), where("user2", "==", big))
  }, [db, user?.uid, profileUser])
  const { data: myFriendshipList } = useCollection(myFriendshipQuery)
  const friendship = myFriendshipList?.[0]

  const myFollowQuery = useMemoFirebase(() => {
    if (!db || !user?.uid || !profileUser) return null
    return query(collection(db, "follows"), where("followerId", "==", user.uid), where("followingId", "==", profileUser.id))
  }, [db, user?.uid, profileUser])
  const { data: myFollowList } = useCollection(myFollowQuery)
  const amIFollowing = (myFollowList?.length || 0) > 0

  const handleUpdateDescription = async () => {
    if (!db || !profileUser) return
    setIsSavingDescription(true)
    const userRef = doc(db, "users", profileUser.id)
    updateDoc(userRef, { description: newDescription })
      .then(() => {
        toast({ title: "Description updated" })
        setIsEditingDescription(false)
      })
      .finally(() => setIsSavingDescription(false))
  }

  const handleActionFriend = async (action: 'add' | 'remove' | 'accept' | 'cancel') => {
    if (!db || !user || !profileUser) return
    if (action === 'add') {
      addDoc(collection(db, "friendships"), {
        user1: user.uid < profileUser.id ? user.uid : profileUser.id,
        user2: user.uid < profileUser.id ? profileUser.id : user.uid,
        status: 'pending',
        requestSentBy: user.uid,
        bestFriendOf: [],
        createdAt: new Date().toISOString()
      })
      toast({ title: "Friend request sent" })
    } else if (action === 'accept' && friendship) {
      updateDoc(doc(db, "friendships", friendship.id), { status: 'accepted' })
      toast({ title: "Friendship accepted" })
    } else if (friendship) {
      deleteDoc(doc(db, "friendships", friendship.id))
      toast({ title: "Action completed" })
    }
  }

  const handleToggleFollow = async () => {
    if (!db || !user || !profileUser) return
    if (amIFollowing && myFollowList?.[0]) {
      deleteDoc(doc(db, "follows", myFollowList[0].id))
      toast({ title: "Unfollowed" })
    } else {
      addDoc(collection(db, "follows"), {
        followerId: user.uid,
        followingId: profileUser.id,
        createdAt: new Date().toISOString()
      })
      toast({ title: "Following" })
    }
  }

  if (isUserLoading || isUserLoadingDoc) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    )
  }

  if (!profileUser) return <div>User not found</div>

  const isOwnProfile = user?.uid === profileUser.id

  return (
    <main className="min-h-screen bg-background w-full pt-24 pb-20 px-4">
      <NavigationBar />
      <div className="max-w-3xl mx-auto space-y-8 animate-fade-in">
        <div className="flex items-center justify-between">
          <Button onClick={() => router.back()} variant="ghost" size="icon" className="rounded-full">
            <ArrowLeft className="h-6 w-6" />
          </Button>
          {!isOwnProfile && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" className="rounded-full">
                  <MoreVertical className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 bg-card border-border rounded-xl">
                {friendship?.status === 'accepted' ? (
                  <DropdownMenuItem onClick={() => handleActionFriend('remove')} className="text-destructive font-bold uppercase text-[10px]">
                    <UserMinus className="h-4 w-4 mr-2" /> Unfriend
                  </DropdownMenuItem>
                ) : friendship?.status === 'pending' ? (
                  friendship.requestSentBy === user?.uid ? (
                    <DropdownMenuItem onClick={() => handleActionFriend('cancel')} className="font-bold uppercase text-[10px]">
                      <X className="h-4 w-4 mr-2" /> Cancel Request
                    </DropdownMenuItem>
                  ) : (
                    <DropdownMenuItem onClick={() => handleActionFriend('accept')} className="font-bold uppercase text-[10px] text-primary">
                      <Check className="h-4 w-4 mr-2" /> Accept Friend
                    </DropdownMenuItem>
                  )
                ) : (
                  <DropdownMenuItem onClick={() => handleActionFriend('add')} className="font-bold uppercase text-[10px]">
                    <UserPlus className="h-4 w-4 mr-2" /> Add Friend
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={handleToggleFollow} className="font-bold uppercase text-[10px]">
                  <Wifi className="h-4 w-4 mr-2" /> {amIFollowing ? "Unfollow" : "Follow"}
                </DropdownMenuItem>
                <DropdownMenuItem className="text-destructive font-bold uppercase text-[10px]">
                  <Flag className="h-4 w-4 mr-2" /> Report
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        <div className="space-y-6">
          <div className="flex items-center gap-6">
            <div className="w-20 h-20 rounded-3xl bg-primary/10 flex items-center justify-center border-2 border-primary/20 relative">
              <User className="h-10 w-10 text-primary" />
              {profileUser.isVerified && (
                <div className="absolute -bottom-1 -right-1">
                  <VerifiedBadge className="h-6 w-6" />
                </div>
              )}
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h1 className="text-3xl font-headline font-bold uppercase tracking-tight">{profileUser.username}</h1>
                {profileUser.isPremium && <PremiumBadge className="h-6 w-6" />}
                {profileUser.isAdmin && <ShieldCheck className="h-5 w-5 text-primary" />}
              </div>
              <p className="text-[10px] font-headline font-bold text-muted-foreground uppercase tracking-widest">#{profileUser.sequentialId}</p>
            </div>
          </div>

          <div className="flex gap-8 py-4 border-y border-border/50 overflow-x-auto scrollbar-hide">
            <div className="text-center">
              <p className="text-xl font-headline font-bold">{friendsCount}</p>
              <p className="text-[8px] font-headline font-bold text-muted-foreground uppercase tracking-widest">Friends</p>
            </div>
            <div className="text-center">
              <p className="text-xl font-headline font-bold">{followersCount}</p>
              <p className="text-[8px] font-headline font-bold text-muted-foreground uppercase tracking-widest">Followers</p>
            </div>
            <div className="text-center">
              <p className="text-xl font-headline font-bold">{followingCount}</p>
              <p className="text-[8px] font-headline font-bold text-muted-foreground uppercase tracking-widest">Following</p>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-[10px] font-headline font-bold text-muted-foreground uppercase tracking-widest">Description</h3>
              {isOwnProfile && (
                <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full" onClick={() => setIsEditingDescription(true)}>
                  <Pencil className="h-3 w-3" />
                </Button>
              )}
            </div>
            {isEditingDescription ? (
              <div className="space-y-3">
                <Textarea value={newDescription} onChange={(e) => setNewDescription(e.target.value)} className="min-h-[100px]" />
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleUpdateDescription} disabled={isSavingDescription}>Save</Button>
                  <Button size="sm" variant="ghost" onClick={() => setIsEditingDescription(false)}>Cancel</Button>
                </div>
              </div>
            ) : (
              <p className="text-sm font-body leading-relaxed">{profileUser.description || "Digital silence..."}</p>
            )}
          </div>

          <div className="pt-6">
            <h3 className="text-[10px] font-headline font-bold text-muted-foreground uppercase tracking-widest mb-4">Achievements</h3>
            <div className="flex flex-wrap gap-2">
              {profileUser.badges?.map((bid: string) => {
                const badge = BADGE_MAP[bid]
                if (!badge) return null
                return (
                  <Link key={bid} href="/badges">
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-card border border-border">
                      <badge.icon className={cn("h-3 w-3", badge.color)} />
                      <span className="text-[9px] font-headline font-bold">{badge.name}</span>
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
