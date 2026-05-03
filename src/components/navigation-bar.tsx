
"use client"

import { useState, useRef } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Settings, Coins, Home, Search, User, LogOut, Crown, Plus, ShoppingBag } from "lucide-react"
import { useUser, useFirestore, useDoc, useMemoFirebase, useCollection, useAuth } from "@/firebase"
import { doc, updateDoc, increment, collection, query, limit, addDoc } from "firebase/firestore"
import { signOut } from "firebase/auth"
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
  const { user, isUserLoading } = useUser()
  const db = useFirestore()
  const auth = useAuth()
  const router = useRouter()
  const { toast } = useToast()
  
  const [searchQuery, setSearchQuery] = useState("")
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [isShopOpen, setIsShopOpen] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)

  const userDocRef = useMemoFirebase(() => {
    if (!db || !user?.uid) return null
    return doc(db, "users", user.uid)
  }, [db, user?.uid])
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
    if (!userDocRef || !db) return
    const updateData = { coins: increment(amount) }
    updateDoc(userDocRef, updateData).then(() => {
      addDoc(collection(db, "transactions"), {
        userId: user!.uid,
        amount: amount,
        type: "coin_purchase",
        createdAt: new Date().toISOString()
      })
      toast({ title: "Coins Added!" })
    })
  }

  if (isUserLoading || !user) return null

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 h-16 border-b bg-background/80 backdrop-blur-md z-50 px-4 flex items-center shadow-sm">
        <div className="flex items-center justify-between w-full max-w-7xl mx-auto gap-3">
          <Link href="/home" className="hidden sm:flex p-2 rounded-full hover:bg-accent"><Home className="h-6 w-6" /></Link>
          <div className="flex items-center gap-2 sm:gap-4 flex-1 justify-start sm:justify-end">
            <div className="relative flex-1 max-w-[400px]" ref={searchRef}>
              <div className="relative group">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search portal..."
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); setIsSearchOpen(true); }}
                  onFocus={() => setIsSearchOpen(true)}
                  className="w-full pl-9 h-10 bg-muted/50 rounded-full text-sm"
                />
              </div>
              {isSearchOpen && filteredUsers && filteredUsers.length > 0 && (
                <div className="absolute top-full mt-2 left-0 right-0 bg-card border rounded-2xl shadow-xl z-50 overflow-hidden">
                  {filteredUsers.map((u) => (
                    <button key={u.id} onClick={() => { router.push(`/profile/${u.sequentialId}`); setIsSearchOpen(false); setSearchQuery(""); }} className="w-full flex items-center justify-between px-4 py-3 hover:bg-accent">
                      <span className="text-sm font-medium">{u.username}</span>
                      <span className="text-[10px] text-muted-foreground">#{u.sequentialId}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <Dialog open={isShopOpen} onOpenChange={setIsShopOpen}>
              <DialogTrigger asChild>
                <button className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-card border transition-all hover:bg-accent">
                  <Coins className="h-4 w-4 text-primary" />
                  <span className="font-headline text-xs">{formatCurrency(userData?.coins || 0)}</span>
                </button>
              </DialogTrigger>
              <DialogContent className="rounded-[40px] max-w-md">
                <DialogHeader><DialogTitle className="text-2xl font-headline font-bold uppercase">Portal Shop</DialogTitle></DialogHeader>
                <div className="grid gap-3 py-4">
                  {[100, 500, 1000].map(amt => (
                    <div key={amt} className="flex items-center justify-between p-4 bg-muted/30 rounded-2xl border">
                      <div className="flex items-center gap-3"><Coins className="h-5 w-5 text-primary" /><span className="font-bold">{amt} Coins</span></div>
                      <Button onClick={() => handleBuy(amt)} size="sm">FREE</Button>
                    </div>
                  ))}
                  <div className="pt-4 border-t mt-4">
                    <Button onClick={() => { setIsShopOpen(false); router.push("/premium"); }} className="w-full h-14 bg-amber-500 hover:bg-amber-600 text-white font-bold uppercase tracking-tighter rounded-2xl">
                      <Crown className="h-5 w-5 mr-2" /> {userData?.isPremium ? (userData.premiumType === 'lifetime' ? "Lifetime Active" : "Manage Premium") : "Become Premium"}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
            <DropdownMenu>
              <DropdownMenuTrigger asChild><button className="p-2 rounded-full hover:bg-accent"><Settings className="h-6 w-6" /></button></DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 rounded-2xl">
                <DropdownMenuItem onClick={() => router.push("/settings")} className="p-3 cursor-pointer uppercase text-[10px] font-bold"><Settings className="h-4 w-4 mr-2" /> Settings</DropdownMenuItem>
                <DropdownMenuItem onClick={() => signOut(auth)} className="p-3 cursor-pointer text-destructive uppercase text-[10px] font-bold"><LogOut className="h-4 w-4 mr-2" /> Logout</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </nav>
      <nav className="sm:hidden fixed bottom-0 left-0 right-0 h-16 bg-background/95 backdrop-blur-md border-t z-50 flex items-center justify-around">
        <Link href="/home" className="flex flex-col items-center p-2"><Home className="h-5 w-5" /><span className="text-[8px] font-bold uppercase">Home</span></Link>
        <button onClick={() => setIsShopOpen(true)} className="flex flex-col items-center p-2"><ShoppingBag className="h-5 w-5" /><span className="text-[8px] font-bold uppercase">Shop</span></button>
        <Link href="/friends" className="flex flex-col items-center p-2"><Plus className="h-5 w-5" /><span className="text-[8px] font-bold uppercase">Social</span></Link>
        <Link href={`/profile/${userData?.sequentialId}`} className="flex flex-col items-center p-2"><User className="h-5 w-5" /><span className="text-[8px] font-bold uppercase">Me</span></Link>
      </nav>
    </>
  )
}
