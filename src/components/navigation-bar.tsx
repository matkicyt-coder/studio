"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Settings, Coins, Home, Search, User, LogOut, Crown, ShoppingBag } from "lucide-react"
import { useUser, useFirestore, useDoc, useMemoFirebase, useCollection, useAuth } from "@/firebase"
import { doc, updateDoc, increment, collection, query, limit, addDoc } from "firebase/firestore"
import { formatCurrency } from "@/lib/utils"
import {
  Dialog,
  DialogContent,
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
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useToast } from "@/hooks/use-toast"

export function NavigationBar() {
  const { user, userDocId, isUserLoading } = useUser()
  const db = useFirestore()
  const auth = useAuth()
  const router = useRouter()
  const { toast } = useToast()
  
  const [searchQuery, setSearchQuery] = useState("")
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [isShopOpen, setIsShopOpen] = useState(false)

  const userDocRef = useMemoFirebase(() => {
    if (!db || !userDocId) return null
    return doc(db, "users", userDocId)
  }, [db, userDocId])
  const { data: userData } = useDoc(userDocRef)

  const usersRef = useMemoFirebase(() => {
    if (!db || isUserLoading || !user) return null
    return query(collection(db, "users"), limit(100))
  }, [db, isUserLoading, user])
  const { data: allUsers } = useCollection(usersRef)

  const filteredUsers = searchQuery.trim().length > 0 
    ? allUsers?.filter(u => u.username?.toLowerCase().includes(searchQuery.toLowerCase())).slice(0, 5)
    : []

  const handleBuy = (amount: number) => {
    if (!userDocRef || !db || !userDocId) return
    updateDoc(userDocRef, { coins: increment(amount) }).then(() => {
      addDoc(collection(db, "transactions"), { userId: userDocId, amount: amount, type: "coin_purchase", createdAt: new Date().toISOString() })
      toast({ title: "Coins synchronized" })
    })
  }

  if (isUserLoading || !user) return null

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 h-16 border-b bg-background/80 backdrop-blur-md z-50 px-4 flex items-center shadow-sm">
        <div className="flex items-center justify-between w-full max-w-7xl mx-auto gap-3">
          <Link href="/home" className="hidden sm:flex p-2 rounded-full hover:bg-accent"><Home className="h-6 w-6" /></Link>
          <div className="flex items-center gap-2 flex-1 justify-end">
            <div className="relative flex-1 max-w-[400px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search portal..." value={searchQuery} onChange={(e) => { setSearchQuery(e.target.value); setIsSearchOpen(true); }} className="pl-9 h-10 bg-muted/50 rounded-full text-sm" />
              {isSearchOpen && filteredUsers && filteredUsers.length > 0 && (
                <div className="absolute top-full mt-2 left-0 right-0 bg-card border rounded-2xl shadow-xl z-50 overflow-hidden">
                  {filteredUsers.map((u) => (
                    <button key={u.uid} onClick={() => { router.push(`/profile/${u.sequentialId}`); setIsSearchOpen(false); setSearchQuery(""); }} className="w-full flex items-center justify-between px-4 py-3 hover:bg-accent">
                      <span className="text-sm font-medium">{u.username}</span>
                      <span className="text-[10px] text-muted-foreground">ID #{u.sequentialId}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <Dialog open={isShopOpen} onOpenChange={setIsShopOpen}>
              <DialogTrigger asChild>
                <button className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-card border hover:bg-accent shadow-sm">
                  <Coins className="h-4 w-4 text-primary" />
                  <span className="font-headline text-xs font-bold">{formatCurrency(userData?.coins || 0)}</span>
                </button>
              </DialogTrigger>
              <DialogContent className="rounded-[40px] max-w-md border-none shadow-2xl">
                <DialogHeader><DialogTitle className="text-2xl font-headline font-bold uppercase">Portal Registry Shop</DialogTitle></DialogHeader>
                <div className="grid gap-3 py-4">
                  {[100, 500, 1000].map(amt => (
                    <div key={amt} className="flex items-center justify-between p-4 bg-muted/30 rounded-2xl border">
                      <span className="font-bold">{amt} COINS</span>
                      <Button onClick={() => handleBuy(amt)} size="sm" className="rounded-full">ACQUIRE</Button>
                    </div>
                  ))}
                  <Button onClick={() => { setIsShopOpen(false); router.push("/premium"); }} className="w-full h-14 bg-amber-500 text-white font-bold rounded-2xl uppercase shadow-lg shadow-amber-500/20">
                    <Crown className="h-5 w-5 mr-2" /> {userData?.isPremium ? "Premium Management" : "Acquire Premium status"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
            <DropdownMenu>
              <DropdownMenuTrigger asChild><button className="p-2 rounded-full hover:bg-accent"><Settings className="h-6 w-6" /></button></DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 rounded-2xl shadow-xl">
                <DropdownMenuItem onClick={() => router.push("/settings")} className="p-3 cursor-pointer text-[10px] font-bold uppercase tracking-tight"><Settings className="h-4 w-4 mr-2" /> Settings</DropdownMenuItem>
                <DropdownMenuItem onClick={() => auth.signOut()} className="p-3 cursor-pointer text-destructive text-[10px] font-bold uppercase tracking-tight"><LogOut className="h-4 w-4 mr-2" /> Deauthorize session</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </nav>
      <nav className="sm:hidden fixed bottom-0 left-0 right-0 h-16 bg-background/95 border-t z-50 flex items-center justify-around">
        <Link href="/home" className="flex flex-col items-center"><Home className="h-5 w-5" /><span className="text-[8px] font-bold uppercase">Home</span></Link>
        <button onClick={() => setIsShopOpen(true)} className="flex flex-col items-center"><ShoppingBag className="h-5 w-5" /><span className="text-[8px] font-bold uppercase">Shop</span></button>
        <Link href="/friends" className="flex flex-col items-center"><User className="h-5 w-5" /><span className="text-[8px] font-bold uppercase">Friends</span></Link>
        <Link href={`/profile/${userData?.sequentialId}`} className="flex flex-col items-center"><User className="h-5 w-5" /><span className="text-[8px] font-bold uppercase">Profile</span></Link>
      </nav>
    </>
  )
}
