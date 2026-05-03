"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Settings, Coins, Home } from "lucide-react"
import { useUser, useFirestore, useDoc, useMemoFirebase } from "@/firebase"
import { doc, updateDoc, increment } from "firebase/firestore"
import { formatCurrency } from "@/lib/utils"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { errorEmitter } from "@/firebase/error-emitter"
import { FirestorePermissionError } from "@/firebase/errors"

export function NavigationBar() {
  const { user } = useUser()
  const db = useFirestore()
  const { toast } = useToast()

  const userDocRef = useMemoFirebase(() => {
    if (!db || !user?.uid) return null
    return doc(db, "users", user.uid)
  }, [db, user?.uid])

  const { data: userData } = useDoc(userDocRef)

  const handleBuy = (amount: number) => {
    if (!userDocRef) return

    const updateData = {
      coins: increment(amount),
    }

    updateDoc(userDocRef, updateData)
      .then(() => {
        toast({
          title: "Purchase Successful",
          description: "thank you your purchase has been completed and added to your balance",
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
    <nav className="fixed top-0 left-0 right-0 h-16 border-b border-border/50 bg-secondary/80 backdrop-blur-md z-50 px-6 flex items-center">
      <div className="flex items-center justify-between w-full max-w-7xl mx-auto">
        {/* Left Side: Home Button */}
        <Link 
          href="/home" 
          className="p-2 rounded-full hover:bg-accent transition-colors"
          aria-label="Home"
        >
          <Home className="h-6 w-6" />
        </Link>

        {/* Right Side: Coins and Settings */}
        <div className="flex items-center gap-4">
          <Dialog>
            <DialogTrigger asChild>
              <button className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-background border border-border hover:bg-accent transition-colors font-headline font-bold shadow-sm">
                <Coins className="h-4 w-4 text-yellow-500" />
                <span>{formatCurrency(coinBalance)}</span>
              </button>
            </DialogTrigger>
            <DialogContent className="bg-background border-border">
              <DialogHeader>
                <DialogTitle className="text-2xl font-headline font-bold tracking-tight">Buy coins</DialogTitle>
                <DialogDescription className="text-muted-foreground">
                  Collect free digital currency to unlock premium terminal features.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                {[
                  { amount: 100, label: "100" },
                  { amount: 500, label: "500" },
                  { amount: 1000, label: "1000" },
                  { amount: 5000, label: "5000" },
                ].map((tier) => (
                  <div key={tier.amount} className="flex items-center justify-between p-4 rounded-lg bg-accent/50 border border-border">
                    <div className="flex items-center gap-3">
                      <Coins className="h-5 w-5 text-yellow-500" />
                      <span className="font-headline font-bold text-lg">{tier.label} Coins</span>
                    </div>
                    <Button 
                      onClick={() => handleBuy(tier.amount)}
                      className="bg-primary text-primary-foreground hover:bg-primary/90 font-headline font-bold"
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
            aria-label="Settings"
          >
            <Settings className="h-6 w-6" />
          </Link>
        </div>
      </div>
    </nav>
  )
}
