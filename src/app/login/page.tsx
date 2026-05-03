import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ChevronRight, Lock, User } from "lucide-react"

export default function LoginPage() {
  return (
    <main className="min-h-screen flex items-center justify-center p-6 bg-background">
      <div className="w-full max-w-[440px] space-y-8 animate-fade-in">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-headline font-bold tracking-tight text-white uppercase tracking-tighter">
            Login
          </h1>
          <p className="text-muted-foreground">Access your terminal.</p>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <div className="relative">
              <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Username" className="pl-10" />
            </div>
          </div>
          <div className="space-y-2">
            <div className="relative">
              <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input type="password" placeholder="Password" className="pl-10" />
            </div>
          </div>
          <Button className="w-full bg-blue-600 hover:bg-blue-700 h-12 text-lg font-headline font-medium group transition-fluid text-white">
            Access Terminal
            <ChevronRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
          </Button>
        </div>

        <p className="text-center text-muted-foreground">
          New user?{" "}
          <Link href="/signup" className="text-primary font-bold hover:underline">
            Register here
          </Link>
        </p>
      </div>
    </main>
  )
}
