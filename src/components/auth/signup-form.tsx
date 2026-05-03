
"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { 
  User as UserIcon, 
  Lock, 
  Calendar
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
import { doc, setDoc, runTransaction, collection, query, where, limit, getDocs, addDoc } from "firebase/firestore"
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
      const email = `${data.username.toLowerCase()}@terminal.io`
      const userCredential = await createUserWithEmailAndPassword(auth, email, data.password)
      const user = userCredential.user

      const counterRef = doc(db, "counters", "users")
      const sequentialId = await runTransaction(db, async (transaction) => {
        const counterDoc = await transaction.get(counterRef)
        let nextId = 1
        if (counterDoc.exists()) {
          nextId = counterDoc.data().count + 1
        }
        transaction.set(counterRef, { count: nextId })
        return nextId
      })

      const userData = {
        id: user.uid,
        username: data.username,
        description: "",
        dateOfBirth: data.dob,
        gender: data.gender,
        sequentialId: sequentialId,
        coins: 0,
        isAdmin: sequentialId === 1,
        isVerified: sequentialId === 1,
        pastUsernames: [],
        agreedToTerms: data.terms,
        createdAt: new Date().toISOString(),
      }

      const userDocRef = doc(db, "users", user.uid)
      await setDoc(userDocRef, userData)

      // Auto-friend User ID 2 (Welcome Friend)
      if (sequentialId > 2) {
        const user2Query = query(collection(db, "users"), where("sequentialId", "==", 2), limit(1))
        const user2Snapshot = await getDocs(user2Query)
        
        if (!user2Snapshot.empty) {
          const user2Doc = user2Snapshot.docs[0]
          const user2Id = user2Doc.id
          
          await addDoc(collection(db, "friendships"), {
            user1: user.uid < user2Id ? user.uid : user2Id,
            user2: user.uid < user2Id ? user2Id : user.uid,
            status: 'accepted',
            requestSentBy: user2Id,
            bestFriendOf: [],
            createdAt: new Date().toISOString()
          })
        }
      }

      router.push("/home")
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Registration failed",
        description: error.message || "An unexpected error occurred.",
      })
      setIsLoading(false)
    }
  }

  return (
    <div className="grid gap-6 animate-fade-in">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
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
                      className="pl-10 block w-full bg-background" 
                      {...field} 
                    />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="username"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <div className="relative">
                    <UserIcon className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input 
                      placeholder="Username" 
                      className="pl-10 bg-background" 
                      {...field} 
                    />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input 
                      type="password" 
                      placeholder="Password" 
                      className="pl-10 bg-background" 
                      {...field} 
                    />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="gender"
            render={({ field }) => (
              <FormItem>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger className="bg-background">
                      <SelectValue placeholder="Gender" />
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
              <FormItem className="flex flex-row items-start space-x-3 space-y-0 p-4 border rounded-lg bg-muted/10">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <div className="text-sm font-normal text-muted-foreground leading-snug">
                    I agree to the <span className="text-primary hover:underline cursor-pointer font-medium">Terms of Service</span>.
                  </div>
                </div>
              </FormItem>
            )}
          />

          <Button 
            type="submit" 
            className="w-full bg-primary text-primary-foreground hover:bg-primary/90 h-12 text-base font-headline font-bold transition-all"
            disabled={isLoading}
          >
            {isLoading ? "Creating account..." : "Sign Up"}
          </Button>
        </form>
      </Form>
    </div>
  )
}
