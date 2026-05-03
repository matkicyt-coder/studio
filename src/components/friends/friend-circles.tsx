
"use client"

import { useMemo } from "react"
import { useUser, useFirestore, useCollection, useMemoFirebase } from "@/firebase"
import { collection, query, where } from "firebase/firestore"
import { Plus, User, Star, ChevronRight } from "lucide-react"
import { useRouter } from "next/navigation"
import Link from "next/link"

export function FriendCircles() {
  const { user, isUserLoading } = useUser()
  const db = useFirestore()
  const router = useRouter()

  const friendshipsQuery1 = useMemoFirebase(() => {
    if (!db || isUserLoading || !user?.uid) return null
    return query(collection(db, "friendships"), where("user1", "==", user.uid), where("status", "==", "accepted"))
  }, [db, isUserLoading, user?.uid])

  const friendshipsQuery2 = useMemoFirebase(() => {
    if (!db || isUserLoading || !user?.uid) return null
    return query(collection(db, "friendships"), where("user2", "==", user.uid), where("status", "==", "accepted"))
  }, [db, isUserLoading, user?.uid])

  const { data: f1 } = useCollection(friendshipsQuery1)
  const { data: f2 } = useCollection(friendshipsQuery2)

  const friendships = useMemo(() => [...(f1 || []), ...(f2 || [])], [f1, f2])
  
  const friendIds = useMemo(() => 
    friendships.map(f => f.user1 === user?.uid ? f.user2 : f.user1)
  , [friendships, user?.uid])

  const usersQuery = useMemoFirebase(() => {
    if (!db || isUserLoading || !user || friendIds.length === 0) return null
    return query(collection(db, "users"), where("id", "in", friendIds))
  }, [db, isUserLoading, user, friendIds])

  const { data: friendsData } = useCollection(usersQuery)

  const isOnline = (lastSeen?: string) => {
    if (!lastSeen) return false
    const now = new Date().getTime()
    const last = new Date(lastSeen).getTime()
    return now - last < 300000 // 5 minutes
  }

  // Sort: Best Friends first, then Online status, then name
  const sortedFriends = useMemo(() => {
    return (friendsData || []).sort((a, b) => {
      const fA = friendships.find(f => f.user1 === a.id || f.user2 === a.id)
      const fB = friendships.find(f => f.user1 === b.id || f.user2 === b.id)
      
      const aBest = fA?.bestFriendOf?.includes(user?.uid) ? 1 : 0
      const bBest = fB?.bestFriendOf?.includes(user?.uid) ? 1 : 0
      if (bBest !== aBest) return bBest - aBest

      const aOnline = isOnline(a.lastSeen) ? 1 : 0
      const bOnline = isOnline(b.lastSeen) ? 1 : 0
      if (bOnline !== aOnline) return bOnline - aOnline

      return (a.username || "").localeCompare(b.username || "")
    })
  }, [friendsData, friendships, user?.uid])

  const displayFriends = sortedFriends.slice(0, 5)

  if (isUserLoading) return null

  return (
    <div className="flex items-center gap-6 overflow-x-auto pb-4 scrollbar-hide">
      {/* Plus button on the left */}
      <Link href="/friends">
        <div className="flex flex-col items-center gap-2 shrink-0 group cursor-pointer">
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full border-2 border-dashed border-border flex items-center justify-center bg-card group-hover:border-primary transition-all">
            <Plus className="h-8 w-8 text-muted-foreground group-hover:text-primary" />
          </div>
          <span className="text-[10px] font-headline font-bold uppercase tracking-widest text-muted-foreground group-hover:text-foreground">Add Friends</span>
        </div>
      </Link>

      {displayFriends.map((friend) => (
        <div 
          key={friend.id} 
          onClick={() => router.push(`/profile/${friend.sequentialId}`)}
          className="flex flex-col items-center gap-2 shrink-0 cursor-pointer group"
        >
          <div className="relative">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full border-2 border-border flex items-center justify-center bg-card group-hover:border-primary transition-all overflow-hidden">
              <User className="h-8 w-8 text-muted-foreground group-hover:text-primary" />
            </div>
            {isOnline(friend.lastSeen) && (
              <div className="absolute bottom-1 right-1 w-4 h-4 bg-blue-500 rounded-full border-2 border-background shadow-sm" />
            )}
            {friendships.find(f => f.user1 === friend.id || f.user2 === friend.id)?.bestFriendOf?.includes(user?.uid) && (
              <div className="absolute -top-1 -right-1">
                <Star className="h-5 w-5 text-yellow-500 fill-yellow-500 drop-shadow-sm" />
              </div>
            )}
          </div>
          <span className="text-[10px] font-headline font-bold uppercase tracking-widest text-muted-foreground group-hover:text-foreground truncate max-w-[80px]">
            {friend.username}
          </span>
        </div>
      ))}

      {sortedFriends.length > 5 && (
        <Link href="/friends">
          <div className="flex flex-col items-center gap-2 shrink-0 group cursor-pointer">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full border-2 border-border flex items-center justify-center bg-accent/20 group-hover:bg-accent/40 transition-all">
              <ChevronRight className="h-8 w-8 text-muted-foreground group-hover:text-foreground" />
            </div>
            <span className="text-[10px] font-headline font-bold uppercase tracking-widest text-muted-foreground group-hover:text-foreground">See All</span>
          </div>
        </Link>
      )}
    </div>
  )
}
