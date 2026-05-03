
"use client"

import { useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc } from "@/firebase"
import { collection, query, where, doc, updateDoc, deleteDoc, arrayUnion, arrayRemove } from "firebase/firestore"
import { User, MoreVertical, Star, Trash2, ArrowLeft, Loader2, UserPlus, UserX, Check, X, Crown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { NavigationBar } from "@/components/navigation-bar"
import { VerifiedBadge } from "@/components/verified-badge"
import { PremiumBadge } from "@/components/premium-badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"

export default function FriendsPage() {
  const { user, isUserLoading } = useUser()
  const db = useFirestore()
  const router = useRouter()
  const { toast } = useToast()

  const userDocRef = useMemoFirebase(() => {
    if (!db || !user?.uid) return null
    return doc(db, "users", user.uid)
  }, [db, user?.uid])
  const { data: userData } = useDoc(userDocRef)

  const friendshipsQuery1 = useMemoFirebase(() => {
    if (!db || isUserLoading || !user?.uid) return null
    return query(collection(db, "friendships"), where("user1", "==", user.uid))
  }, [db, isUserLoading, user?.uid])

  const friendshipsQuery2 = useMemoFirebase(() => {
    if (!db || isUserLoading || !user?.uid) return null
    return query(collection(db, "friendships"), where("user2", "==", user.uid))
  }, [db, isUserLoading, user?.uid])

  const { data: f1 } = useCollection(friendshipsQuery1)
  const { data: f2 } = useCollection(friendshipsQuery2)

  const allFriendships = useMemo(() => [...(f1 || []), ...(f2 || [])], [f1, f2])
  
  const acceptedFriendships = useMemo(() => 
    allFriendships.filter(f => f.status === 'accepted')
  , [allFriendships])

  const pendingIncoming = useMemo(() => 
    allFriendships.filter(f => f.status === 'pending' && f.requestSentBy !== user?.uid)
  , [allFriendships, user?.uid])

  const friendIds = useMemo(() => 
    acceptedFriendships.map(f => f.user1 === user?.uid ? f.user2 : f.user1)
  , [acceptedFriendships, user?.uid])

  const pendingIds = useMemo(() => 
    pendingIncoming.map(f => f.user1 === user?.uid ? f.user2 : f.user1)
  , [pendingIncoming, user?.uid])

  const usersQuery = useMemoFirebase(() => {
    if (!db || isUserLoading || !user || friendIds.length === 0) return null
    return query(collection(db, "users"), where("id", "in", friendIds))
  }, [db, isUserLoading, user, friendIds])

  const pendingUsersQuery = useMemoFirebase(() => {
    if (!db || isUserLoading || !user || pendingIds.length === 0) return null
    return query(collection(db, "users"), where("id", "in", pendingIds))
  }, [db, isUserLoading, user, pendingIds])

  const { data: friendsData, isLoading: isFriendsLoading } = useCollection(usersQuery)
  const { data: pendingData, isLoading: isPendingLoading } = useCollection(pendingUsersQuery)

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push("/login")
    }
  }, [user, isUserLoading, router])

  const isOnline = (lastSeen?: string) => {
    if (!lastSeen) return false
    const now = new Date().getTime()
    const last = new Date(lastSeen).getTime()
    return now - last < 300000
  }

  const handleToggleBestFriend = async (targetId: string) => {
    if (!db || !user?.uid || !userData) return
    const friendship = acceptedFriendships.find(f => f.user1 === targetId || f.user2 === targetId)
    if (!friendship) return

    const isBest = friendship.bestFriendOf?.includes(user.uid)
    const bestFriendsCount = acceptedFriendships.filter(f => f.bestFriendOf?.includes(user.uid)).length
    
    const limit = userData.isPremium ? 10 : 5

    if (!isBest && bestFriendsCount >= limit) {
      toast({ 
        variant: "destructive", 
        title: "LIMIT REACHED", 
        description: userData.isPremium 
          ? "YOU HAVE REACHED THE PREMIUM LIMIT OF 10 BEST FRIENDS." 
          : "YOU CAN ONLY HAVE 5 BEST FRIENDS. UPGRADE TO PREMIUM FOR 10!" 
      })
      return
    }

    const fRef = doc(db, "friendships", friendship.id)
    updateDoc(fRef, {
      bestFriendOf: isBest ? arrayRemove(user.uid) : arrayUnion(user.uid)
    })
  }

  const handleRemoveFriend = async (targetId: string) => {
    if (!db) return
    const friendship = allFriendships.find(f => f.user1 === targetId || f.user2 === targetId)
    if (friendship) {
      deleteDoc(doc(db, "friendships", friendship.id))
      toast({ title: "FRIEND REMOVED" })
    }
  }

  const handleAcceptRequest = async (targetId: string) => {
    if (!db) return
    const friendship = pendingIncoming.find(f => f.user1 === targetId || f.user2 === targetId)
    if (friendship) {
      updateDoc(doc(db, "friendships", friendship.id), {
        status: 'accepted',
        createdAt: new Date().toISOString()
      })
      toast({ title: "REQUEST ACCEPTED" })
    }
  }

  if (isUserLoading || (isFriendsLoading && friendIds.length > 0)) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    )
  }

  const sortedFriends = (friendsData || []).sort((a, b) => {
    const fA = acceptedFriendships.find(f => f.user1 === a.id || f.user2 === a.id)
    const fB = acceptedFriendships.find(f => f.user1 === b.id || f.user2 === b.id)
    const aBest = fA?.bestFriendOf?.includes(user?.uid) ? 1 : 0
    const bBest = fB?.bestFriendOf?.includes(user?.uid) ? 1 : 0
    return bBest - aBest
  })

  return (
    <main className="min-h-screen bg-background w-full pt-24 px-4 sm:px-6 pb-20">
      <NavigationBar />
      <div className="max-w-4xl mx-auto space-y-8 animate-fade-in">
        <div className="flex items-center gap-4">
          <Button onClick={() => router.push("/home")} variant="ghost" size="icon" className="rounded-full hover:bg-accent">
            <ArrowLeft className="h-6 w-6" />
          </Button>
          <div className="flex flex-col">
            <h1 className="text-2xl sm:text-4xl font-headline font-bold tracking-tighter uppercase">Connections</h1>
            <div className="flex items-center gap-2">
              <p className="text-[10px] font-headline font-bold text-muted-foreground uppercase tracking-widest">
                Friends: {friendsData?.length || 0} / 20
              </p>
              {userData?.isPremium && <PremiumBadge className="h-3 w-3" />}
            </div>
          </div>
        </div>

        <Tabs defaultValue="friends" className="w-full">
          <TabsList className="bg-card border border-border h-12 p-1 rounded-full grid grid-cols-2 max-w-md">
            <TabsTrigger value="friends" className="rounded-full font-headline font-bold uppercase text-[10px] tracking-widest">Friends</TabsTrigger>
            <TabsTrigger value="pending" className="rounded-full font-headline font-bold flex items-center justify-center gap-2 uppercase text-[10px] tracking-widest">
              Pending
              {pendingIncoming.length > 0 && (
                <span className="bg-primary text-primary-foreground px-1.5 py-0.5 rounded-full text-[8px]">
                  {pendingIncoming.length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="friends" className="pt-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {sortedFriends.map(friend => {
                const fs = acceptedFriendships.find(f => f.user1 === friend.id || f.user2 === friend.id)
                const isBest = fs?.bestFriendOf?.includes(user?.uid)
                const online = isOnline(friend.lastSeen)

                return (
                  <div key={friend.id} className="p-4 rounded-2xl bg-card border border-border hover:border-primary/50 transition-all shadow-sm group relative">
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 bg-accent/20 rounded-xl flex items-center justify-center relative shrink-0">
                        <User className="h-8 w-8 text-muted-foreground" />
                        {online && (
                          <div className="absolute -top-1 -right-1 w-4 h-4 bg-blue-500 rounded-full border-2 border-background shadow-sm" />
                        )}
                        {isBest && (
                          <div className="absolute -bottom-1 -left-1">
                            <Star className="h-5 w-5 text-yellow-500 fill-yellow-500 drop-shadow-sm" />
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col min-w-0 flex-1">
                        <div className="flex items-center gap-1 min-w-0">
                          <span className="font-bold text-base truncate">{friend.username}</span>
                          {friend.isPremium && <PremiumBadge className="h-3 w-3 shrink-0" />}
                          {friend.isVerified && <VerifiedBadge className="h-3.5 w-3.5 shrink-0" />}
                        </div>
                        <span className="text-[8px] font-headline text-muted-foreground uppercase tracking-widest">#{friend.sequentialId}</span>
                        <div className="mt-2">
                          <Button 
                            variant="link" 
                            onClick={() => router.push(`/profile/${friend.sequentialId}`)}
                            className="p-0 h-auto text-[10px] font-headline font-bold uppercase tracking-widest"
                          >
                            View Profile
                          </Button>
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-background border-border rounded-xl">
                          <DropdownMenuItem onClick={() => handleToggleBestFriend(friend.id)} className="gap-2 font-headline font-bold text-[10px] uppercase cursor-pointer">
                            <Star className={cn("h-4 w-4", isBest && "fill-yellow-500 text-yellow-500")} />
                            {isBest ? "Unpin Best Friend" : "Pin Best Friend"}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleRemoveFriend(friend.id)} className="gap-2 font-headline font-bold text-[10px] uppercase text-destructive cursor-pointer">
                            <Trash2 className="h-4 w-4" />
                            Remove Friend
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                )
              })}
            </div>
            {(!friendsData || friendsData.length === 0) && !isFriendsLoading && (
              <div className="text-center py-32 space-y-4">
                <User className="h-12 w-12 text-muted-foreground/20 mx-auto" />
                <p className="text-muted-foreground font-headline text-[10px] uppercase tracking-[0.2em] italic">The terminal is empty. Add friends to populate your grid.</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="pending" className="pt-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {pendingData?.map(pendingUser => (
                <div key={pendingUser.id} className="p-4 rounded-2xl bg-card border border-border shadow-sm flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="w-12 h-12 bg-accent/20 rounded-xl flex items-center justify-center shrink-0">
                      <UserPlus className="h-6 w-6 text-primary" />
                    </div>
                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-1.5 truncate">
                        <span className="font-bold text-sm truncate">{pendingUser.username}</span>
                        {pendingUser.isPremium && <PremiumBadge className="h-2.5 w-2.5 shrink-0" />}
                      </div>
                      <Button 
                        variant="link" 
                        onClick={() => router.push(`/profile/${pendingUser.sequentialId}`)}
                        className="p-0 h-auto text-[8px] font-headline font-bold uppercase tracking-widest text-muted-foreground w-fit"
                      >
                        Visit Profile
                      </Button>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button 
                      onClick={() => handleAcceptRequest(pendingUser.id)}
                      variant="default" 
                      size="icon" 
                      className="h-8 w-8 rounded-full bg-primary"
                    >
                      <Check className="h-4 w-4" />
                    </Button>
                    <Button 
                      onClick={() => handleRemoveFriend(pendingUser.id)}
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 rounded-full text-destructive hover:bg-destructive/10"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
            {(!pendingData || pendingData.length === 0) && !isPendingLoading && (
              <div className="text-center py-32 space-y-4">
                <UserPlus className="h-12 w-12 text-muted-foreground/20 mx-auto" />
                <p className="text-muted-foreground font-headline text-[10px] uppercase tracking-[0.2em] italic">No pending requests waiting in the buffer.</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </main>
  )
}
