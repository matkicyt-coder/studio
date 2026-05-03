"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useUser } from "@/firebase"
import { NavigationBar } from "@/components/navigation-bar"

export default function SettingsPage() {
  const { user, isUserLoading } = useUser()
  const router = useRouter()

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push("/login")
    }
  }, [user, isUserLoading, router])

  if (isUserLoading || !user) {
    return null
  }

  return (
    <main className="min-h-screen bg-black w-full pt-16">
      <NavigationBar />
      <div className="p-6 text-white font-headline">
        {/* Settings content will go here */}
      </div>
    </main>
  )
}
