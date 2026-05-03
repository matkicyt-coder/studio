"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"
import { useUser } from "@/firebase"

export default function Home() {
  const router = useRouter()
  const { user, isUserLoading } = useUser()

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push("/signup")
    }
  }, [user, isUserLoading, router])

  if (isUserLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="text-4xl font-headline font-bold text-primary tracking-tighter">
            PORTAL
          </div>
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    )
  }

  return (
    <div className="p-8">
      <h1 className="text-3xl font-headline font-bold mb-4">Welcome back</h1>
      <p className="text-muted-foreground">You are successfully authenticated.</p>
    </div>
  )
}
