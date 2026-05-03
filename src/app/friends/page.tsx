
"use client"

import { useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import { useUser, useFirestore, useCollection, useMemoFirebase } from "@/firebase"
import { collection, query, where, doc, updateDoc, deleteDoc, arrayUnion, arrayRemove } from "firebase/firestore"
import { User, MoreVertical, Star, Trash2, ArrowLeft, Loader2, ShieldCheck, CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { NavigationBar } from "@/components/navigation-bar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"

export default function FriendsPage() {
  const { user, isUserLoading } = useUser()
  const db = useFirestore()
  const router = useRouter()
  const { toast } = useToast()

  const friendshipsQuery1 = useMemoFirebase(() => {
    if (!db || !user?.uid) return null
    return query(collection(db, "friendships"), where("user1", "==", user.uid))
  }, [db, user?.uid])

  const friendshipsQuery2 = useMemoFirebase(() => {
    if (!db || !user?.uid) return null
    return query(collection(db, "friendships"), where("user2", "==", user.uid))
  }, [db, user?.uid])

  const { data: f1 } = useCollection(friendshipsQuery1)
  const { data: f2 } = useCollection(friendshipsQuery2)

  const friendships = useMemo(() => [...(f1 || []), ...(f2 || [])], [f1, f2])
  
  const friendIds = useMemo(() => 
    friendships.map(f => f.user1 === user?.uid ? f.user2 : f.user1)
  , [friendships, user?.uid])

  const usersQuery = useMemoFirebase(() => {
    if (!db || friendIds.length === 0) return null
    return query(collection(db, "users"), where("id", "in", friendIds))
  }, [db, friendIds])

  const { data: friendsData, isLoading: isFriendsLoading } = useCollection(usersQuery)

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
    if (!db || !user?.uid) return
    const friendship = friendships.find(f => f.user1 === targetId || f.user2 === targetId)
    if (!friendship) return

    const isBest = friendship.bestFriendOf?.includes(user.uid)
    const bestFriendsCount = friendships.filter(f => f.bestFriendOf?.includes(user.uid)).length

    if (!isBest && bestFriendsCount >= 10) {
      toast({ variant: "destructive", title: "LIMIT REACHED", description: "YOU CAN ONLY HAVE 10 BEST FRIENDS." })
      return
    }

    const fRef = doc(db, "friendships", friendship.id)
    await updateDoc(fRef, {
      bestFriendOf: isBest ? arrayRemove(user.uid) : arrayUnion(user.uid)
    })
  }

  const handleRemoveFriend = async (targetId: string) => {
    if (!db) return
    const friendship = friendships.find(f => f.user1 === targetId || f.user2 === targetId)
    if (friendship) {
      await deleteDoc(doc(db, "friendships", friendship.id))
      toast({ title: "FRIEND REMOVED" })
    }
  }

  if (isUserLoading || isFriendsLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    )
  }

  const sortedFriends = (friendsData || []).sort((a, b) => {
    const fA = friendships.find(f => f.user1 === a.id || f.user2 === a.id)
    const fB = friendships.find(f => f.user1 === b.id || f.user2 === b.id)
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
            <p className="text-[10px] font-headline font-bold text-muted-foreground uppercase tracking-widest">
              Friends: {friendsData?.length || 0} / 20
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {sortedFriends.map(friend => {
            const fs = friendships.find(f => f.user1 === friend.id || f.user2 === friend.id)
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
                      {friend.isVerified && <CheckCircle2 className="h-3.5 w-3.5 text-primary fill-primary/10 shrink-0" />}
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

        {sortedFriends.length === 0 && (
          <div className="text-center py-32 space-y-4">
            <User className="h-12 w-12 text-muted-foreground/20 mx-auto" />
            <p className="text-muted-foreground font-headline text-[10px] uppercase tracking-[0.2em] italic">The terminal is empty. Add friends to populate your grid.</p>
          </div>
        )}
      </div>
    </main>
  )
}
