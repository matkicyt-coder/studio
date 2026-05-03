
"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Lock, User, Loader2 } from "lucide-react"
import { useAuth } from "@/firebase"
import { signInWithEmailAndPassword } from "firebase/auth"
import { useToast } from "@/hooks/use-toast"

export default function LoginPage() {
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const auth = useAuth()
  const router = useRouter()
  const { toast } = useToast()

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    if (!username || !password) return

    setIsLoading(true)
    try {
      const email = `${username.toLowerCase()}@terminal.io`
      await signInWithEmailAndPassword(auth, email, password)
      router.push("/home")
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Login failed",
        description: "Invalid username or password.",
      })
      setIsLoading(false)
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-6 bg-black">
      <div className="w-full max-w-[440px] space-y-8 animate-fade-in">
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-headline font-bold tracking-tighter text-white">
            Login
          </h1>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-2">
            <div className="relative">
              <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Username" 
                className="pl-10 bg-background" 
                value={username}
                onChange={(e) => setUsername(e.target.value)}
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
                className="pl-10 bg-background" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </div>
          <Button 
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 h-12 text-lg font-headline font-bold transition-fluid text-white"
            disabled={isLoading}
          >
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Login"}
          </Button>
        </form>

        <p className="text-center text-muted-foreground">
          Don't have an account?{" "}
          <Link href="/signup" className="text-primary font-bold hover:underline">
            Sign Up!
          </Link>
        </p>
      </div>
    </main>
  )
}
