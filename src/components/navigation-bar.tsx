
"use client"

import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Settings, Coins, Home, Search, ShieldCheck, User } from "lucide-react"
import { useUser, useFirestore, useDoc, useMemoFirebase, useCollection } from "@/firebase"
import { doc, updateDoc, increment, collection, query, limit } from "firebase/firestore"
import { formatCurrency, cn } from "@/lib/utils"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useToast } from "@/hooks/use-toast"
import { errorEmitter } from "@/firebase/error-emitter"
import { FirestorePermissionError } from "@/firebase/errors"

export function NavigationBar() {
  const { user } = useUser()
  const db = useFirestore()
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

  // Memoize users for search
  const usersRef = useMemoFirebase(() => {
    if (!db) return null
    return query(collection(db, "users"), limit(100))
  }, [db])
  
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

  const coinBalance = userData?.coins ?? 0

  return (
    <nav className="fixed top-0 left-0 right-0 h-16 border-b border-border/50 bg-background/80 backdrop-blur-md z-50 px-6 flex items-center shadow-sm">
      <div className="flex items-center justify-between w-full max-w-7xl mx-auto">
        <Link 
          href="/home" 
          className="p-2 rounded-full hover:bg-accent transition-colors"
        >
          <Home className="h-6 w-6" />
        </Link>

        <div className="flex items-center gap-4">
          {/* User Search Bar */}
          <div className="relative" ref={searchRef}>
            <div className="relative group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
              <Input
                placeholder="Search users..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value)
                  setIsSearchOpen(true)
                }}
                onFocus={() => setIsSearchOpen(true)}
                className="w-[180px] sm:w-[240px] pl-9 h-10 bg-card/50 border-border/50 rounded-full text-sm transition-all focus:w-[220px] sm:focus:w-[320px]"
              />
            </div>
            
            {isSearchOpen && filteredUsers && filteredUsers.length > 0 && (
              <div className="absolute top-full mt-2 left-0 right-0 bg-card border border-border rounded-2xl shadow-xl overflow-hidden animate-fade-in z-50">
                <div className="py-2">
                  {filteredUsers.map((u) => (
                    <button
                      key={u.id}
                      onClick={() => {
                        router.push(`/profile/${u.sequentialId}`)
                        setIsSearchOpen(false)
                        setSearchQuery("")
                      }}
                      className="w-full flex items-center justify-between px-4 py-3 hover:bg-accent transition-colors text-left"
                    >
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium text-sm">{u.username}</span>
                        {u.isAdmin && <ShieldCheck className="h-3 w-3 text-primary" />}
                      </div>
                      <span className="text-[10px] font-headline text-muted-foreground">#{u.sequentialId}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <Dialog>
            <DialogTrigger asChild>
              <button className="flex items-center gap-2 px-4 py-2 rounded-full bg-card border border-border hover:bg-accent transition-all font-bold shadow-sm">
                <Coins className="h-4 w-4 text-primary" />
                <span className="font-headline">{formatCurrency(coinBalance)}</span>
              </button>
            </DialogTrigger>
            <DialogContent className="bg-background border-border sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle className="text-2xl font-headline font-bold">Buy coins</DialogTitle>
                <DialogDescription>
                  Collect free digital currency to unlock premium features.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                {[
                  { amount: 100, label: "100" },
                  { amount: 500, label: "500" },
                  { amount: 1000, label: "1000" },
                  { amount: 5000, label: "5000" },
                ].map((tier) => (
                  <div key={tier.amount} className="flex items-center justify-between p-4 rounded-xl bg-accent/20 border border-border">
                    <div className="flex items-center gap-3">
                      <Coins className="h-5 w-5 text-primary" />
                      <span className="font-bold text-lg font-headline">{tier.label} Coins</span>
                    </div>
                    <Button 
                      onClick={() => handleBuy(tier.amount)}
                      className="font-bold font-headline"
                    >
                      $0.00
                    </Button>
                  </div>
                ))}
              </div>
            </DialogContent>
          </Dialog>

          <Link 
            href="/settings" 
            className="p-2 rounded-full hover:bg-accent transition-colors"
          >
            <Settings className="h-6 w-6" />
          </Link>
        </div>
      </div>
    </nav>
  )
}
