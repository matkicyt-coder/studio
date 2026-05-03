
"use client"

import { useState, useEffect, useRef, useMemo } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Settings, Coins, Home, Search, ShieldCheck, User, LogOut, Lock } from "lucide-react"
import { useUser, useFirestore, useDoc, useMemoFirebase, useCollection, useAuth } from "@/firebase"
import { doc, updateDoc, increment, collection, query, limit } from "firebase/firestore"
import { signOut } from "firebase/auth"
import { formatCurrency, cn, calculateAge } from "@/lib/utils"
import { VerifiedBadge } from "@/components/verified-badge"
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
  const isParentalMode = age < 18

  // Memoize users for search - Only query if user is authenticated to avoid permission errors
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

    const updateData = {
      coins: increment(amount),
    }

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
    <nav className="fixed top-0 left-0 right-0 h-16 border-b border-border/50 bg-[#f4f4f5] dark:bg-black z-50 px-4 sm:px-6 flex items-center shadow-sm">
      <div className="flex items-center justify-between w-full max-w-7xl mx-auto gap-2">
        <Link 
          href="/home" 
          className="p-2 rounded-full hover:bg-accent transition-colors shrink-0"
        >
          <Home className="h-6 w-6" />
        </Link>

        <div className="flex items-center gap-2 sm:gap-4 flex-1 justify-end">
          {/* User Search Bar */}
          <div className="relative flex-1 max-w-[320px]" ref={searchRef}>
            <div className="relative group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
              <Input
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value)
                  setIsSearchOpen(true)
                }}
                onFocus={() => setIsSearchOpen(true)}
                className="w-full pl-9 h-10 bg-card/50 border-border/50 rounded-full text-sm transition-all"
              />
            </div>
            
            {isSearchOpen && filteredUsers && filteredUsers.length > 0 && (
              <div className="absolute top-full mt-2 left-0 right-0 bg-card border border-border rounded-2xl shadow-xl overflow-hidden animate-fade-in z-50 min-w-[240px]">
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
                          <span className={cn(
                            "font-medium text-sm flex items-center gap-1.5 truncate",
                            isPermBanned && "text-muted-foreground italic line-through"
                          )}>
                            {isPermBanned ? "CONTENT DELETED" : u.username}
                            {!isPermBanned && u.isVerified && <VerifiedBadge className="h-3.5 w-3.5 shrink-0" />}
                            {!isPermBanned && u.isAdmin && <ShieldCheck className="h-3.5 w-3.5 text-primary shrink-0" />}
                          </span>
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
              <button 
                disabled={isParentalMode}
                className={cn(
                  "flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-full bg-card border border-border transition-all font-bold shadow-sm shrink-0",
                  isParentalMode ? "opacity-50 cursor-not-allowed bg-muted" : "hover:bg-accent"
                )}
              >
                <Coins className="h-4 w-4 text-primary" />
                <span className="font-headline text-xs sm:text-sm">{isParentalMode ? "RESTRICTED" : formatCurrency(coinBalance)}</span>
              </button>
            </DialogTrigger>
            {!isParentalMode && (
              <DialogContent className="bg-background border-border sm:max-w-[425px] w-[95vw] rounded-3xl">
                <DialogHeader>
                  <DialogTitle className="text-2xl font-headline font-bold uppercase tracking-tight">Buy coins</DialogTitle>
                  <DialogDescription className="font-headline text-[10px] uppercase tracking-widest text-muted-foreground">
                    Collect free digital currency to unlock premium features.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-3 py-4">
                  {[
                    { amount: 100, label: "100" },
                    { amount: 500, label: "500" },
                    { amount: 1000, label: "1000" },
                    { amount: 5000, label: "5000" },
                  ].map((tier) => (
                    <div key={tier.amount} className="flex items-center justify-between p-3 sm:p-4 rounded-xl bg-accent/20 border border-border">
                      <div className="flex items-center gap-3">
                        <Coins className="h-5 w-5 text-primary" />
                        <span className="font-bold text-base sm:text-lg font-headline">{tier.label} Coins</span>
                      </div>
                      <Button 
                        onClick={() => handleBuy(tier.amount)}
                        className="font-bold font-headline h-9 sm:h-10 uppercase text-xs"
                      >
                        $0.00
                      </Button>
                    </div>
                  ))}
                </div>
              </DialogContent>
            )}
          </Dialog>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="p-2 rounded-full hover:bg-accent transition-colors shrink-0">
                <Settings className="h-6 w-6" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 bg-card border border-border rounded-xl p-1 animate-fade-in">
              <DropdownMenuItem 
                onClick={() => router.push("/settings")}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer hover:bg-accent transition-colors"
              >
                <Settings className="h-4 w-4" />
                <span className="font-headline font-bold text-[10px] uppercase tracking-widest">Settings</span>
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={handleLogout}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer text-destructive hover:bg-destructive/10 transition-colors"
              >
                <LogOut className="h-4 w-4" />
                <span className="font-headline font-bold text-[10px] uppercase tracking-widest">Logout</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </nav>
  )
}
