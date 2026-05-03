"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"

export default function Home() {
  const router = useRouter()
  const [isChecking, setIsChecking] = useState(true)

  useEffect(() => {
    const checkAuth = async () => {
      // Simulate checking for a session cookie or local storage token
      const isLoggedIn = localStorage.getItem("blauberia_session") === "true"
      
      if (!isLoggedIn) {
        router.push("/signup")
      } else {
        setIsChecking(false)
      }
    }

    const timer = setTimeout(checkAuth, 1000)
    return () => clearTimeout(timer)
  }, [router])

  if (isChecking) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="text-4xl font-headline font-bold text-primary tracking-tighter">
            BLAUBERIA
          </div>
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    )
  }

  return (
    <div className="p-8">
      <h1 className="text-3xl font-headline font-bold mb-4">Welcome back to Blauberia</h1>
      <p className="text-muted-foreground">You are successfully authenticated.</p>
    </div>
  )
}
