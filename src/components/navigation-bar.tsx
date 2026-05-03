
"use client"

import { useState, useEffect, useRef, useMemo } from "react"
import Link from "next/link"
import { useRouter, usePathname } from "next/navigation"
import { Settings, Coins, Home, Search, ShieldCheck, User, LogOut, Crown, Plus } from "lucide-react"
import { useUser, useFirestore, useDoc, useMemoFirebase, useCollection, useAuth } from "@/firebase"
import { doc, updateDoc, increment, collection, query, limit } from "firebase/firestore"
import { signOut } from "firebase/auth"
import { formatCurrency, cn, calculateAge } from "@/lib/utils"
import { VerifiedBadge } from "@/components/verified-badge"
import { PremiumBadge } from "@/components/premium-badge"
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
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useToast } from "@/hooks/use-toast"
import { errorEmitter } from "@/firebase/error-emitter"
import { FirestorePermissionError } from "@/firebase/errors"

export function NavigationBar() {
  const { user, isUserLoading } = useUser()
  const db = useFirestore()
  const auth = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const { toast } = useToast()
  
  const [searchQuery, setSearchQuery] = useState("")
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)

  const userDocRef = useMemoFirebase(() => {
    if (!db || !user?.uid) return null
    return doc(db, "users", user.uid)
  }, [db, user?.uid])

  const { data: userData } = useDoc(userDocRef)

  const age = useMemo(() => calculateAge(userData?.dateOfBirth), [userData?.dateOfBirth])
  const isParentalMode = age > 0 && age < 18

  const usersRef = useMemoFirebase(() => {
    if (!db || isUserLoading || !user) return null
    return query(collection(db, "users"), limit(100))
  }, [db, isUserLoading, user])
  
  const { data: allUsers } = useCollection(usersRef)

  const filteredUsers = searchQuery.trim().length > 0 
    ? allUsers?.filter(u => 
        u.username?.toLowerCase().includes(searchQuery.toLowerCase())
      ).slice(0, 5)
    : []

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsSearchOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const handleBuy = (amount: number) => {
    if (!userDocRef) return
    if (isParentalMode) {
      toast({
        variant: "destructive",
        title: "Purchase Restricted",
        description: "Accounts under 18 are not permitted to process transactions.",
      })
      return
    }
    const updateData = { coins: increment(amount) }
    updateDoc(userDocRef, updateData)
      .then(() => {
        toast({
          title: "Purchase Successful",
          description: "Thank you, your purchase has been completed and added to your balance",
        })
      })
      .catch(async (error) => {
        errorEmitter.emit("permission-error", new FirestorePermissionError({
          path: userDocRef.path,
          operation: "update",
          requestResourceData: updateData,
        }))
      })
  }

  const handleLogout = async () => {
    await signOut(auth)
    router.push("/login")
  }

  const coinBalance = userData?.coins ?? 0

  return (
    <>
      {/* Top Header for Search & Coins (Always visible) */}
      <nav className="fixed top-0 left-0 right-0 h-16 border-b border-border/50 bg-background/80 backdrop-blur-md z-50 px-4 flex items-center shadow-sm">
        <div className="flex items-center justify-between w-full max-w-7xl mx-auto gap-3">
          <Link href="/home" className="hidden sm:flex p-2 rounded-full hover:bg-accent transition-colors shrink-0">
            <Home className="h-6 w-6" />
          </Link>

          <div className="flex items-center gap-2 sm:gap-4 flex-1 justify-start sm:justify-end">
            <div className="relative flex-1 max-w-[400px]" ref={searchRef}>
              <div className="relative group">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                <Input
                  placeholder="Search portal..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value)
                    setIsSearchOpen(true)
                  }}
                  onFocus={() => setIsSearchOpen(true)}
                  className="w-full pl-9 h-10 bg-muted/50 border-transparent rounded-full text-sm focus:bg-background transition-all"
                />
              </div>
              
              {isSearchOpen && filteredUsers && filteredUsers.length > 0 && (
                <div className="absolute top-full mt-2 left-0 right-0 bg-card border border-border rounded-2xl shadow-xl overflow-hidden animate-fade-in z-[60] min-w-[240px]">
                  <div className="py-2">
                    {filteredUsers.map((u) => {
                      const isPermBanned = u.isBanned && u.banType === 'perm'
                      return (
                        <button
                          key={u.id}
                          onClick={() => {
                            router.push(`/profile/${u.sequentialId}`)
                            setIsSearchOpen(false)
                            setSearchQuery("")
                          }}
                          className="w-full flex items-center justify-between px-4 py-3 hover:bg-accent transition-colors text-left"
                        >
                          <div className="flex items-center gap-2 overflow-hidden">
                            <User className="h-4 w-4 text-muted-foreground shrink-0" />
                            <div className="flex items-center gap-1.5 truncate">
                              <span className={cn(
                                "font-medium text-sm flex items-center gap-1.5 truncate",
                                isPermBanned && "text-muted-foreground italic line-through"
                              )}>
                                {isPermBanned ? "CONTENT DELETED" : u.username}
                              </span>
                              {!isPermBanned && u.isPremium && <PremiumBadge className="h-3 w-3 shrink-0" />}
                              {!isPermBanned && u.isVerified && <VerifiedBadge className="h-3.5 w-3.5 shrink-0" />}
                            </div>
                          </div>
                          <span className="text-[10px] font-headline text-muted-foreground shrink-0 ml-2">#{u.sequentialId}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>

            <Dialog>
              <DialogTrigger asChild>
                <button className={cn(
                  "flex items-center gap-1.5 px-3 py-2 rounded-full bg-card border border-border transition-all font-bold shadow-sm shrink-0 hover:bg-accent",
                  userData?.isPremium && "border-amber-500/50 shadow-amber-500/10"
                )}>
                  <Coins className={cn("h-4 w-4", userData?.isPremium ? "text-amber-500" : "text-primary")} />
                  <span className="font-headline text-xs sm:text-sm">{formatCurrency(coinBalance)}</span>
                </button>
              </DialogTrigger>
              <DialogContent className="bg-background border-border sm:max-w-[425px] w-[95vw] rounded-3xl">
                <DialogHeader>
                  <DialogTitle className="text-2xl font-headline font-bold uppercase tracking-tight">Buy Coins</DialogTitle>
                  <DialogDescription className="font-headline text-[10px] uppercase tracking-widest text-muted-foreground">
                    {isParentalMode ? "Purchases restricted in Parental Mode." : "Enhance your digital experience."}
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-3 py-4">
                  {[100, 500, 1000, 5000].map((amount) => (
                    <div key={amount} className="flex items-center justify-between p-4 rounded-xl bg-muted/30 border border-border">
                      <div className="flex items-center gap-3">
                        <Coins className="h-5 w-5 text-primary" />
                        <span className="font-bold text-lg font-headline">{amount} Coins</span>
                      </div>
                      <Button onClick={() => handleBuy(amount)} disabled={isParentalMode} size="sm" className="font-bold font-headline uppercase text-xs">$0.00</Button>
                    </div>
                  ))}
                  {!userData?.isPremium && (
                    <Button onClick={() => router.push("/premium")} className="w-full h-14 bg-amber-500 hover:bg-amber-600 text-white font-headline font-bold uppercase tracking-tighter gap-2 rounded-xl mt-2">
                      <Crown className="h-5 w-5" /> Become Premium
                    </Button>
                  )}
                </div>
              </DialogContent>
            </Dialog>
            
            <div className="hidden sm:block">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="p-2 rounded-full hover:bg-accent transition-colors"><Settings className="h-6 w-6" /></button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 bg-card border-border rounded-2xl p-2 shadow-xl">
                  <DropdownMenuItem onClick={() => router.push("/settings")} className="flex items-center gap-3 p-3 rounded-xl cursor-pointer">
                    <Settings className="h-4 w-4" /><span className="font-headline font-bold text-[10px] uppercase tracking-widest">Settings</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleLogout} className="flex items-center gap-3 p-3 rounded-xl cursor-pointer text-destructive">
                    <LogOut className="h-4 w-4" /><span className="font-headline font-bold text-[10px] uppercase tracking-widest">Logout</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </nav>

      {/* Bottom Tab Bar for Mobile */}
      <nav className="sm:hidden fixed bottom-0 left-0 right-0 h-16 bg-background/95 backdrop-blur-md border-t border-border/50 z-50 flex items-center justify-around px-2">
        <Link href="/home" className={cn("flex flex-col items-center gap-1 p-2 rounded-xl transition-all", pathname === '/home' ? "text-primary" : "text-muted-foreground")}>
          <Home className="h-5 w-5" />
          <span className="text-[9px] font-headline font-bold uppercase tracking-widest">Home</span>
        </Link>
        <Link href="/friends" className={cn("flex flex-col items-center gap-1 p-2 rounded-xl transition-all", pathname === '/friends' ? "text-primary" : "text-muted-foreground")}>
          <Plus className="h-5 w-5" />
          <span className="text-[9px] font-headline font-bold uppercase tracking-widest">Social</span>
        </Link>
        <Link href={`/profile/${userData?.sequentialId}`} className={cn("flex flex-col items-center gap-1 p-2 rounded-xl transition-all", pathname.startsWith('/profile') ? "text-primary" : "text-muted-foreground")}>
          <User className="h-5 w-5" />
          <span className="text-[9px] font-headline font-bold uppercase tracking-widest">Me</span>
        </Link>
        <Link href="/settings" className={cn("flex flex-col items-center gap-1 p-2 rounded-xl transition-all", pathname === '/settings' ? "text-primary" : "text-muted-foreground")}>
          <Settings className="h-5 w-5" />
          <span className="text-[9px] font-headline font-bold uppercase tracking-widest">Admin</span>
        </Link>
      </nav>
    </>
  )
}
