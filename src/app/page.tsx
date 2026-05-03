
"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"
import { useUser } from "@/firebase"

export default function Home() {
  const router = useRouter()
  const { user, isUserLoading } = useUser()

  useEffect(() => {
    if (!isUserLoading) {
      if (user) {
        router.push("/home")
      } else {
        router.push("/signup")
      }
    }
  }, [user, isUserLoading, router])

  return (
    <div className="flex h-screen w-full items-center justify-center bg-black">
      <Loader2 className="h-6 w-6 animate-spin text-primary" />
    </div>
  )
}
