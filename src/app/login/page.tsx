"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Lock, User, Loader2 } from "lucide-react"
import { useAuth, useFirestore } from "@/firebase"
import { signInWithEmailAndPassword } from "firebase/auth"
import { collection, query, where, getDocs, limit } from "firebase/firestore"
import { useToast } from "@/hooks/use-toast"

export default function LoginPage() {
  const [identifier, setIdentifier] = useState("")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const auth = useAuth()
  const db = useFirestore()
  const router = useRouter()
  const { toast } = useToast()

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    if (!identifier || !password) return

    setIsLoading(true)
    try {
      let finalEmail = ""
      const isPhone = /^\+?[0-9\s\-]{7,}$/.test(identifier)

      if (isPhone) {
        const usersRef = collection(db, "users")
        const q = query(usersRef, where("phoneNumber", "==", identifier), limit(1))
        const querySnapshot = await getDocs(q)
        
        if (querySnapshot.empty) {
          throw new Error("No account found with that phone number.")
        }
        
        const userData = querySnapshot.docs[0].data()
        finalEmail = `${userData.username.toLowerCase()}@portal.io`
      } else {
        finalEmail = `${identifier.toLowerCase()}@portal.io`
      }

      await signInWithEmailAndPassword(auth, finalEmail, password)
      router.push("/home")
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Login failed",
        description: error.message === "No account found with that phone number." 
          ? error.message 
          : "Invalid credentials. Please verify your identity.",
      })
      setIsLoading(false)
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-6 bg-background">
      <div className="w-full max-w-[440px] space-y-8 animate-fade-in">
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-headline font-bold tracking-tighter uppercase">
            Portal Access
          </h1>
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Dashboard Entry Protocol</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-2">
            <div className="relative">
              <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Username or Phone" 
                className="pl-10 h-12 rounded-xl" 
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                required
              />
            </div>
          </div>
          <div className="space-y-2">
            <div className="relative">
              <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input 
                type="password" 
                placeholder="Password" 
                className="pl-10 h-12 rounded-xl" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </div>
          <Button 
            type="submit"
            className="w-full h-14 rounded-2xl text-lg font-headline font-bold uppercase transition-all shadow-lg shadow-primary/20"
            disabled={isLoading}
          >
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Verify Identity"}
          </Button>
        </form>

        <div className="flex flex-col items-center gap-4">
          <p className="text-center text-sm font-medium text-muted-foreground">
            Don't have an account?{" "}
            <Link href="/signup" className="text-primary font-bold hover:underline">
              Sign Up!
            </Link>
          </p>
        </div>
      </div>
    </main>
  )
}
