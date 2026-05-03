
"use client"

import { useState } from "react"
import { useUser, useFirestore, useCollection, useMemoFirebase } from "@/firebase"
import { collection, query, where, doc, getDoc } from "firebase/firestore"
import { Plus, User, MoreVertical, Star, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { useToast } from "@/hooks/use-toast"
import { updateDoc, deleteDoc, arrayUnion, arrayRemove } from "firebase/firestore"

export function FriendCircles() {
  const { user } = useUser()
  const db = useFirestore()
  const router = useRouter()
  const { toast } = useToast()
  const [isManageOpen, setIsManageOpen] = useState(false)

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

  const friendships = [...(f1 || []), ...(f2 || [])]
  const friendIds = friendships.map(f => f.user1 === user?.uid ? f.user2 : f.user1)

  const usersQuery = useMemoFirebase(() => {
    if (!db || friendIds.length === 0) return null
    // Note: where in array is limited to 30. For MVP this works as user requested 20 limit.
    return query(collection(db, "users"), where("id", "in", friendIds))
  }, [db, friendIds])

  const { data: friendsData } = useCollection(usersQuery)

  const sortedFriends = (friendsData || []).sort((a, b) => {
    const fA = friendships.find(f => f.user1 === a.id || f.user2 === a.id)
    const fB = friendships.find(f => f.user1 === b.id || f.user2 === b.id)
    const aBest = fA?.bestFriendOf?.includes(user?.uid) ? 1 : 0
    const bBest = fB?.bestFriendOf?.includes(user?.uid) ? 1 : 0
    return bBest - aBest
  })

  const isOnline = (lastSeen?: string) => {
    if (!lastSeen) return false
    const now = new Date().getTime()
    const last = new Date(lastSeen).getTime()
    return now - last < 300000 // 5 minutes
  }

  const handleToggleBestFriend = async (targetId: string) => {
    if (!db || !user?.uid) return
    const friendship = friendships.find(f => f.user1 === targetId || f.user2 === targetId)
    if (!friendship) return

    const isBest = friendship.bestFriendOf?.includes(user.uid)
    const bestFriendsCount = friendships.filter(f => f.bestFriendOf?.includes(user.uid)).length

    if (!isBest && bestFriendsCount >= 10) {
      toast({ variant: "destructive", title: "Limit reached", description: "YOU CAN ONLY HAVE 10 BEST FRIENDS." })
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

  return (
    <div className="flex items-center gap-6 overflow-x-auto pb-4 scrollbar-hide">
      <Dialog open={isManageOpen} onOpenChange={setIsManageOpen}>
        <DialogTrigger asChild>
          <div className="flex flex-col items-center gap-2 shrink-0 cursor-pointer group">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full border-2 border-dashed border-border flex items-center justify-center bg-card hover:border-primary transition-all">
              <Plus className="h-8 w-8 text-muted-foreground group-hover:text-primary" />
            </div>
            <span className="text-[10px] font-headline font-bold uppercase tracking-widest text-muted-foreground group-hover:text-foreground">Add Friends</span>
          </div>
        </DialogTrigger>
        <DialogContent className="bg-background border-border sm:max-w-[425px] w-[95vw] rounded-3xl">
          <DialogHeader>
            <DialogTitle className="font-headline font-bold uppercase">MANAGE FRIENDS</DialogTitle>
            <DialogDescription>YOUR TERMINAL CONNECTIONS ({sortedFriends.length}/20)</DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4 max-h-[60vh] overflow-y-auto pr-2 scrollbar-thin">
            {sortedFriends.map(friend => {
              const fs = friendships.find(f => f.user1 === friend.id || f.user2 === friend.id)
              const isBest = fs?.bestFriendOf?.includes(user?.uid)
              return (
                <div key={friend.id} className="flex items-center justify-between p-3 rounded-xl bg-card border border-border">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-accent rounded-md flex items-center justify-center relative">
                      <User className="h-5 w-5" />
                      {isOnline(friend.lastSeen) && (
                        <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full border-2 border-background" />
                      )}
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm font-bold truncate">{friend.username}</span>
                      <span className="text-[8px] font-headline text-muted-foreground uppercase">#{friend.sequentialId}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {isBest && <Star className="h-3 w-3 text-yellow-500 fill-yellow-500 mr-2" />}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleToggleBestFriend(friend.id)}>
                          <Star className={cn("h-4 w-4 mr-2", isBest && "fill-yellow-500 text-yellow-500")} />
                          {isBest ? "REMOVE BEST FRIEND" : "SET AS BEST FRIEND"}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => router.push(`/profile/${friend.sequentialId}`)}>
                          <User className="h-4 w-4 mr-2" /> VIEW PROFILE
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive" onClick={() => handleRemoveFriend(friend.id)}>
                          <Trash2 className="h-4 w-4 mr-2" /> REMOVE FRIEND
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              )
            })}
            {sortedFriends.length === 0 && (
              <div className="text-center py-8 text-muted-foreground font-headline text-[10px] uppercase italic">NO FRIENDS ADDED YET.</div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {sortedFriends.map((friend) => (
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
    </div>
  )
}
