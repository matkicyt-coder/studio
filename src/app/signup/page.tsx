import Link from "next/link"
import { SignupForm } from "@/components/auth/signup-form"

export default function SignupPage() {
  return (
    <main className="min-h-screen flex items-center justify-center p-6 sm:p-12 lg:p-24 bg-background">
      <div className="w-full max-w-[480px] space-y-10">
        <div className="space-y-2 text-center">
          <div className="inline-block px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-headline font-bold uppercase tracking-widest mb-4">
            Join the collective
          </div>
          <h1 className="text-4xl sm:text-5xl font-headline font-bold tracking-tighter text-secondary">
            Blauberia
          </h1>
          <p className="text-muted-foreground text-lg font-body max-w-sm mx-auto">
            Design your digital identity and step into the future of decentralized imagination.
          </p>
        </div>

        <div className="bg-card border border-border/50 rounded-2xl shadow-xl shadow-primary/5 p-6 sm:p-8">
          <SignupForm />
        </div>

        <div className="text-center space-y-4">
          <p className="text-muted-foreground font-body">
            Already have an account?{" "}
            <Link 
              href="/login" 
              className="text-secondary font-headline font-bold hover:text-primary transition-colors inline-flex items-center"
            >
              Login!
            </Link>
          </p>
          
          <div className="flex items-center justify-center gap-6 pt-4 border-t border-border/50">
            <span className="text-[10px] text-muted-foreground uppercase font-headline font-bold tracking-widest">
              Blauberia © 2024
            </span>
          </div>
        </div>
      </div>
    </main>
  )
}
