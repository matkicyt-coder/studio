
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
import { doc, setDoc, runTransaction, collection, query, where, limit, getDocs, addDoc, updateDoc, arrayUnion } from "firebase/firestore"
import { useToast } from "@/hooks/use-toast"

const signupSchema = z.object({
  dob: z.string().min(1, "Date of birth is required"),
  username: z.string()
    .min(3, "Username must be at least 3 characters")
    .regex(/^[a-zA-Z0-9_]+$/, "Username must not contain emojis or special characters"),
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
    defaultValues: { dob: "", username: "", password: "", terms: false },
  })

  async function onSubmit(data: SignupFormValues) {
    setIsLoading(true)
    try {
      const email = `${data.username.toLowerCase()}@portal.io`
      const userCredential = await createUserWithEmailAndPassword(auth, email, data.password)
      const user = userCredential.user

      const counterRef = doc(db, "counters", "users")
      const sequentialId = await runTransaction(db, async (transaction) => {
        const counterDoc = await transaction.get(counterRef)
        let nextId = 1
        if (counterDoc.exists()) nextId = counterDoc.data().count + 1
        transaction.set(counterRef, { count: nextId })
        return nextId
      })

      const isAdmin = sequentialId === 1
      const userData = {
        id: user.uid,
        username: data.username,
        description: "",
        dateOfBirth: data.dob,
        gender: data.gender,
        sequentialId: sequentialId,
        coins: 1000,
        isAdmin,
        isVerified: isAdmin,
        badges: isAdmin ? ["admin"] : [],
        pastUsernames: [],
        moderationHistory: [],
        createdAt: new Date().toISOString(),
      }

      await setDoc(doc(db, "users", user.uid), userData)

      // Auto-Friend & Auto-Follow ID 2 (Welcome Bot)
      if (sequentialId !== 2) {
        const botQuery = query(collection(db, "users"), where("sequentialId", "==", 2), limit(1))
        const botSnap = await getDocs(botQuery)
        if (!botSnap.empty) {
          const botId = botSnap.docs[0].id
          // Auto Friend
          addDoc(collection(db, "friendships"), {
            user1: user.uid < botId ? user.uid : botId,
            user2: user.uid < botId ? botId : user.uid,
            status: 'accepted',
            requestSentBy: botId,
            createdAt: new Date().toISOString()
          })
          // Bot follows User
          addDoc(collection(db, "follows"), { followerId: botId, followingId: user.uid, createdAt: new Date().toISOString() })
          // User follows Bot
          addDoc(collection(db, "follows"), { followerId: user.uid, followingId: botId, createdAt: new Date().toISOString() })
        }
      }

      router.push("/home")
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message })
      setIsLoading(false)
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField control={form.control} name="dob" render={({ field }) => (
          <FormItem><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
        )} />
        <FormField control={form.control} name="username" render={({ field }) => (
          <FormItem><FormControl><div className="relative"><UserIcon className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input placeholder="Username" className="pl-10" {...field} /></div></FormControl><FormMessage /></FormItem>
        )} />
        <FormField control={form.control} name="password" render={({ field }) => (
          <FormItem><FormControl><div className="relative"><Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input type="password" placeholder="Password" className="pl-10" {...field} /></div></FormControl><FormMessage /></FormItem>
        )} />
        <FormField control={form.control} name="gender" render={({ field }) => (
          <FormItem><Select onValueChange={field.onChange}><FormControl><SelectTrigger><SelectValue placeholder="Gender" /></SelectTrigger></FormControl><SelectContent><SelectItem value="male">Male</SelectItem><SelectItem value="female">Female</SelectItem><SelectItem value="non-binary">Non-binary</SelectItem></SelectContent></Select></FormItem>
        )} />
        <FormField control={form.control} name="terms" render={({ field }) => (
          <FormItem className="flex items-center space-x-2"><FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl><span className="text-xs">Agree to Terms</span></FormItem>
        )} />
        <Button type="submit" className="w-full h-12 font-headline font-bold uppercase" disabled={isLoading}>Sign Up</Button>
      </form>
    </Form>
  )
}
