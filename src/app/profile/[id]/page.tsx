"use client"

import { useParams, useRouter } from "next/navigation"
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc } from "@/firebase"
import { NavigationBar } from "@/components/navigation-bar"
import { collection, query, where, limit, addDoc, doc, updateDoc, deleteDoc, arrayUnion, arrayRemove } from "firebase/firestore"
import { 
  User, 
  ShieldCheck, 
  Flag, 
  ArrowLeft, 
  Loader2,
  Pencil,
  Check,
  X,
  UserPlus,
  UserMinus,
  Star,
  Crown,
  Users,
  MoreVertical,
  Wifi,
  Calendar
} from "lucide-react"
import { VerifiedBadge } from "@/components/verified-badge"
import { PremiumBadge } from "@/components/premium-badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Textarea } from "@/components/ui/textarea"
import { useState, useEffect, useMemo } from "react"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import Link from "next/link"

const BADGE_MAP: Record<string, { name: string, icon: any, color: string }> = {
  "friendship": { name: "Friendship", icon: Users, color: "text-blue-500" },
  "admin": { name: "Administrator", icon: ShieldCheck, color: "text-primary" },
  "premium": { name: "Premium Club", icon: Crown, color: "text-amber-500" }
}

export function FriendCircles({ profileUserId, currentUserId }: { profileUserId: string, currentUserId?: string }) {
  const db = useFirestore()
  const router = useRouter()

  const friendshipsQuery1 = useMemoFirebase(() => {
    if (!db || !profileUserId) return null
    return query(collection(db, "friendships"), where("user1", "==", profileUserId), where("status", "==", "accepted"))
  }, [db, profileUserId])

  const friendshipsQuery2 = useMemoFirebase(() => {
    if (!db || !profileUserId) return null
    return query(collection(db, "friendships"), where("user2", "==", profileUserId), where("status", "==", "accepted"))
  }, [db, profileUserId])

  const { data: f1 } = useCollection(friendshipsQuery1)
  const { data: f2 } = useCollection(friendshipsQuery2)

  const friendships = useMemo(() => [...(f1 || []), ...(f2 || [])], [f1, f2])
  
  const friendIds = useMemo(() => 
    friendships.map(f => f.user1 === profileUserId ? f.user2 : f.user1)
  , [friendships, profileUserId])

  const usersQuery = useMemoFirebase(() => {
    if (!db || friendIds.length === 0) return null
    return query(collection(db, "users"), where("uid", "in", friendIds.slice(0, 10)))
  }, [db, friendIds])

  const { data: friendsData } = useCollection(usersQuery)

  if (!friendsData || friendsData.length === 0) return null

  return (
    <div className="space-y-3">
      <h3 className="text-[10px] font-headline font-bold text-muted-foreground uppercase tracking-widest">Friends Network</h3>
      <div className="flex flex-wrap gap-2">
        {friendsData.map((friend) => (
          <div 
            key={friend.uid} 
            onClick={() => router.push(`/profile/${friend.sequentialId}`)}
            className="flex flex-col items-center gap-1 cursor-pointer group"
          >
            <div className="w-12 h-12 rounded-2xl bg-muted/30 border border-border flex items-center justify-center group-hover:border-primary transition-all">
              <User className="h-6 w-6 text-muted-foreground group-hover:text-primary" />
            </div>
            <span className="text-[8px] font-headline font-bold uppercase text-muted-foreground group-hover:text-foreground truncate max-w-[48px]">
              {friend.username}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
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

  const userQuery = useMemoFirebase(() => {
    if (!db || isNaN(sequentialId)) return null
    return query(collection(db, "users"), where("sequentialId", "==", sequentialId), limit(1))
  }, [db, sequentialId])
  const { data: userDataList, isLoading: isUserLoadingDoc } = useCollection(userQuery)
  const profileUser = userDataList?.[0]

  // Stats: Followers
  const followersQuery = useMemoFirebase(() => {
    if (!db || !profileUser) return null
    return query(collection(db, "follows"), where("followingId", "==", profileUser.uid))
  }, [db, profileUser])
  const { data: followers } = useCollection(followersQuery)
  const followersCount = followers?.length || 0

  // Relationships with current user
  const myFriendshipQuery = useMemoFirebase(() => {
    if (!db || !user?.uid || !profileUser) return null
    const small = user.uid < profileUser.uid ? user.uid : profileUser.uid
    const big = user.uid < profileUser.uid ? profileUser.uid : user.uid
    return query(collection(db, "friendships"), where("user1", "==", small), where("user2", "==", big))
  }, [db, user?.uid, profileUser])
  const { data: myFriendshipList } = useCollection(myFriendshipQuery)
  const friendship = myFriendshipList?.[0]

  const myFollowQuery = useMemoFirebase(() => {
    if (!db || !user?.uid || !profileUser) return null
    return query(collection(db, "follows"), where("followerId", "==", user.uid), where("followingId", "==", profileUser.uid))
  }, [db, user?.uid, profileUser])
  const { data: myFollowList } = useCollection(myFollowQuery)
  const amIFollowing = (myFollowList?.length || 0) > 0

  const handleUpdateDescription = async () => {
    if (!db || !profileUser) return
    setIsSavingDescription(true)
    const userRef = doc(db, "users", profileUser.uid)
    updateDoc(userRef, { description: newDescription })
      .then(() => {
        toast({ title: "Profile updated" })
        setIsEditingDescription(false)
      })
      .finally(() => setIsSavingDescription(false))
  }

  const handleActionFriend = async (action: 'add' | 'remove' | 'accept' | 'cancel') => {
    if (!db || !user || !profileUser) return
    if (action === 'add') {
      addDoc(collection(db, "friendships"), {
        user1: user.uid < profileUser.uid ? user.uid : profileUser.uid,
        user2: user.uid < profileUser.uid ? profileUser.uid : user.uid,
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
      toast({ title: "Status updated" })
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
        followingId: profileUser.uid,
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

  const isOwnProfile = user?.uid === profileUser.uid
  const formattedJoinDate = profileUser.createdAt 
    ? new Date(profileUser.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    : "Registry Date Unknown"

  return (
    <main className="min-h-screen bg-background w-full pt-24 pb-20 px-4">
      <NavigationBar />
      <div className="max-w-2xl mx-auto space-y-10 animate-fade-in">
        <div className="flex items-center justify-between">
          <Button onClick={() => router.back()} variant="ghost" size="icon" className="rounded-full hover:bg-muted">
            <ArrowLeft className="h-6 w-6" />
          </Button>
          {!isOwnProfile && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" className="rounded-full shadow-sm">
                  <MoreVertical className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 bg-card border-border rounded-2xl shadow-xl">
                {friendship?.status === 'accepted' ? (
                  <DropdownMenuItem onClick={() => handleActionFriend('remove')} className="text-destructive font-bold uppercase text-[10px]">
                    <UserMinus className="h-4 w-4 mr-2" /> Remove Friend
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
                  <Flag className="h-4 w-4 mr-2" /> Report User
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        <div className="space-y-8">
          <div className="flex items-center gap-6">
            <div className="w-24 h-24 rounded-[40px] bg-primary/10 flex items-center justify-center border-2 border-primary/20 relative shadow-inner">
              <User className="h-12 w-12 text-primary" />
              {profileUser.isVerified && (
                <div className="absolute -bottom-1 -right-1">
                  <VerifiedBadge className="h-7 w-7" />
                </div>
              )}
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h1 className="text-3xl font-headline font-bold uppercase tracking-tight">{profileUser.username}</h1>
                {profileUser.isPremium && <PremiumBadge className="h-6 w-6" />}
              </div>
              <div className="flex items-center gap-2">
                <p className="text-[10px] font-headline font-bold text-muted-foreground uppercase tracking-widest bg-muted/50 px-2 py-0.5 rounded-full">ID #{profileUser.sequentialId}</p>
                {profileUser.isAdmin && <Badge variant="secondary" className="text-[8px] h-5 px-2 font-bold bg-primary/10 text-primary">ADMIN</Badge>}
              </div>
            </div>
          </div>

          <div className="flex gap-10 py-4 border-y border-border/50">
            <div className="text-center">
              <p className="text-2xl font-headline font-bold">{followersCount}</p>
              <p className="text-[8px] font-headline font-bold text-muted-foreground uppercase tracking-widest">Followers</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-headline font-bold">{profileUser.coins || 0}</p>
              <p className="text-[8px] font-headline font-bold text-muted-foreground uppercase tracking-widest">Coins</p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-[10px] font-headline font-bold text-muted-foreground uppercase tracking-widest">Biography</h3>
              {isOwnProfile && (
                <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full" onClick={() => { setIsEditingDescription(true); setNewDescription(profileUser.description || ""); }}>
                  <Pencil className="h-3 w-3" />
                </Button>
              )}
            </div>
            {isEditingDescription ? (
              <div className="space-y-4">
                <Textarea value={newDescription} onChange={(e) => setNewDescription(e.target.value)} className="min-h-[120px] rounded-3xl" placeholder="Describe your digital identity..." />
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleUpdateDescription} disabled={isSavingDescription} className="rounded-full px-6">Save</Button>
                  <Button size="sm" variant="ghost" onClick={() => setIsEditingDescription(false)} className="rounded-full">Cancel</Button>
                </div>
              </div>
            ) : (
              <p className="text-sm font-body leading-relaxed text-foreground/80">{profileUser.description || "No description provided."}</p>
            )}
          </div>

          {/* Friends Tab moved under Description and above Achievements */}
          <FriendCircles profileUserId={profileUser.uid} currentUserId={user?.uid} />

          <div className="space-y-4">
            <h3 className="text-[10px] font-headline font-bold text-muted-foreground uppercase tracking-widest">Achievements</h3>
            <div className="flex flex-wrap gap-2">
              {profileUser.badges?.map((bid: string) => {
                const badge = BADGE_MAP[bid]
                if (!badge) return null
                return (
                  <Link key={bid} href="/badges">
                    <div className="flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-card border border-border hover:border-primary/50 transition-all shadow-sm">
                      <badge.icon className={cn("h-3.5 w-3.5", badge.color)} />
                      <span className="text-[9px] font-headline font-bold uppercase tracking-tight">{badge.name}</span>
                    </div>
                  </Link>
                )
              })}
              {!profileUser.badges?.length && (
                <p className="text-[10px] italic text-muted-foreground">Achievement registry is currently empty.</p>
              )}
            </div>
          </div>

          <div className="pt-8 border-t border-border/50">
            <div className="flex items-center gap-2 text-muted-foreground/60">
              <Calendar className="h-4 w-4" />
              <span className="text-[10px] font-headline font-bold uppercase tracking-widest">Digital Registry: {formattedJoinDate}</span>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
