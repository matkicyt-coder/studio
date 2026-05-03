"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { 
  User, 
  Lock, 
  Calendar, 
  Eye,
  EyeOff
} from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { useAuth, useFirestore } from "@/firebase"
import { createUserWithEmailAndPassword } from "firebase/auth"
import { doc, setDoc } from "firebase/firestore"
import { useToast } from "@/hooks/use-toast"

const signupSchema = z.object({
  dob: z.string().min(1, "Date of birth is required"),
  username: z.string()
    .min(3, "Username must be at least 3 characters")
    .regex(/^[a-zA-Z0-9_]+$/, "Username must not contain emojis or special characters")
    .refine((val) => !/\p{Emoji_Presentation}/u.test(val), "Emojis are not allowed"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  gender: z.enum(["male", "female", "non-binary", "prefer-not-to-say"], {
    required_error: "Please select a gender",
  }),
  terms: z.boolean().refine((val) => val === true, "You must agree to the terms"),
})

type SignupFormValues = z.infer<typeof signupSchema>

export function SignupForm() {
  const router = useRouter()
  const auth = useAuth()
  const db = useFirestore()
  const { toast } = useToast()
  const [showPassword, setShowPassword] = React.useState(false)
  const [isLoading, setIsLoading] = React.useState(false)

  const form = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      dob: "",
      username: "",
      password: "",
      terms: false,
    },
  })

  async function onSubmit(data: SignupFormValues) {
    setIsLoading(true)
    try {
      const email = `${data.username.toLowerCase()}@blauberia.io`
      const userCredential = await createUserWithEmailAndPassword(auth, email, data.password)
      const user = userCredential.user

      await setDoc(doc(db, "users", user.uid), {
        id: user.uid,
        username: data.username,
        dateOfBirth: data.dob,
        gender: data.gender,
        agreedToTerms: data.terms,
        createdAt: new Date().toISOString(),
      })

      router.push("/")
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Registration failed",
        description: error.message || "An unexpected error occurred.",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="grid gap-6 animate-fade-in">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
          {/* 1. Date of Birth */}
          <FormField
            control={form.control}
            name="dob"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-3 h-4 w-4 text-muted-foreground pointer-events-none" />
                    <Input 
                      type="date" 
                      className="pl-10 transition-fluid block w-full bg-background" 
                      {...field} 
                    />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* 2. Username */}
          <FormField
            control={form.control}
            name="username"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <div className="relative">
                    <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input 
                      placeholder="Username" 
                      className="pl-10 transition-fluid bg-background" 
                      {...field} 
                    />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* 3. Password */}
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input 
                      type={showPassword ? "text" : "password"} 
                      placeholder="Password" 
                      className="pl-10 pr-10 transition-fluid bg-background" 
                      {...field} 
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-3 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* 4. Gender */}
          <FormField
            control={form.control}
            name="gender"
            render={({ field }) => (
              <FormItem>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger className="transition-fluid bg-background">
                      <SelectValue placeholder="Select gender" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="non-binary">Non-binary</SelectItem>
                    <SelectItem value="prefer-not-to-say">Prefer not to say</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="terms"
            render={({ field }) => (
              <FormItem className="flex flex-row items-start space-x-3 space-y-0 p-4 border rounded-lg bg-muted/30">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <div className="text-sm font-normal text-muted-foreground leading-snug">
                    I agree to the <span className="text-primary hover:underline cursor-pointer font-medium">Terms of Service</span> and <span className="text-primary hover:underline cursor-pointer font-medium">Privacy Policy</span>.
                  </div>
                </div>
              </FormItem>
            )}
          />

          <Button 
            type="submit" 
            className="w-full bg-blue-600 hover:bg-blue-700 text-white h-12 text-base font-headline font-bold transition-fluid group"
            disabled={isLoading}
          >
            {isLoading ? "Creating account..." : "Sign Up"}
          </Button>
        </form>
      </Form>
    </div>
  )
}
