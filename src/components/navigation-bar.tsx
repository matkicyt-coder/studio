
"use client"

import Link from "next/link"
import { Settings, Coins, Home } from "lucide-react"
import { useUser, useFirestore, useDoc, useMemoFirebase } from "@/firebase"
import { doc } from "firebase/firestore"
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

export function NavigationBar() {
  const { user } = useUser()
  const db = useFirestore()
  const { toast } = useToast()

  const userDocRef = useMemoFirebase(() => {
    if (!db || !user?.uid) return null
    return doc(db, "users", user.uid)
  }, [db, user?.uid])

  const { data: userData } = useDoc(userDocRef)

  const handleBuy = () => {
    toast({
      variant: "destructive",
      title: "Error",
      description: "Failed to start the transaction",
    })
  }

  const coinBalance = userData?.coins ?? 0

  return (
    <nav className="fixed top-0 left-0 right-0 h-16 border-b border-border/50 bg-zinc-900/80 backdrop-blur-md z-50 px-6 flex items-center">
      <div className="flex items-center justify-between w-full max-w-7xl mx-auto">
        {/* Left Side: Home Button */}
        <Link 
          href="/home" 
          className="p-2 rounded-full hover:bg-white/10 transition-colors text-white"
          aria-label="Home"
        >
          <Home className="h-6 w-6" />
        </Link>

        {/* Right Side: Coins and Settings */}
        <div className="flex items-center gap-4">
          <Dialog>
            <DialogTrigger asChild>
              <button className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 transition-colors text-white font-headline font-bold">
                <Coins className="h-4 w-4 text-yellow-500" />
                <span>{formatCurrency(coinBalance)}</span>
              </button>
            </DialogTrigger>
            <DialogContent className="bg-zinc-900 border-border text-white">
              <DialogHeader>
                <DialogTitle className="text-2xl font-headline font-bold tracking-tight">Buy Coins</DialogTitle>
                <DialogDescription className="text-zinc-400">
                  Purchase digital currency to unlock premium features.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                {[
                  { amount: "100", price: "$0.99" },
                  { amount: "500", price: "$4.99" },
                  { amount: "1000", price: "$8.99" },
                  { amount: "5000", price: "$39.99" },
                ].map((tier) => (
                  <div key={tier.amount} className="flex items-center justify-between p-4 rounded-lg bg-white/5 border border-white/10">
                    <div className="flex items-center gap-3">
                      <Coins className="h-5 w-5 text-yellow-500" />
                      <span className="font-headline font-bold text-lg">{tier.amount} Coins</span>
                    </div>
                    <Button 
                      onClick={handleBuy}
                      className="bg-blue-600 hover:bg-blue-700 font-headline font-bold"
                    >
                      {tier.price}
                    </Button>
                  </div>
                ))}
              </div>
            </DialogContent>
          </Dialog>

          <Link 
            href="/settings" 
            className="p-2 rounded-full hover:bg-white/10 transition-colors text-white"
            aria-label="Settings"
          >
            <Settings className="h-6 w-6" />
          </Link>
        </div>
      </div>
    </nav>
  )
}
