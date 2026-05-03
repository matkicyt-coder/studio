import Link from "next/link"
import { SignupForm } from "@/components/auth/signup-form"

export default function SignupPage() {
  return (
    <main className="min-h-screen flex items-center justify-center p-6 sm:p-12 lg:p-24 bg-background">
      <div className="w-full max-w-[480px] space-y-10">
        <div className="space-y-2 text-center">
          <h1 className="text-4xl sm:text-5xl font-headline font-bold tracking-tighter">
            Create Account
          </h1>
        </div>

        <div className="bg-card border border-border/50 rounded-2xl shadow-xl p-6 sm:p-8">
          <SignupForm />
        </div>

        <div className="text-center space-y-4">
          <p className="text-muted-foreground font-body">
            Already have an account?{" "}
            <Link 
              href="/login" 
              className="text-primary font-headline font-bold hover:underline transition-colors inline-flex items-center"
            >
              Login!
            </Link>
          </p>
        </div>
      </div>
    </main>
  )
}
