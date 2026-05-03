
"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc } from "@/firebase"
import { NavigationBar } from "@/components/navigation-bar"
import { collection, query, orderBy, doc, updateDoc, increment } from "firebase/firestore"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { 
  Search, 
  Settings2, 
  ShieldCheck, 
  Loader2,
  ArrowLeft,
  Plus,
  Minus
} from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"
import { errorEmitter } from "@/firebase/error-emitter"
import { FirestorePermissionError } from "@/firebase/errors"
import Link from "next/link"

export default function AdminPage() {
  const { user, isUserLoading } = useUser()
  const db = useFirestore()
  const router = useRouter()
  const { toast } = useToast()

  const [searchQuery, setSearchQuery] = useState("")
  const [isUpdating, setIsUpdating] = useState(false)
  const [editingUserId, setEditingUserId] = useState<string | null>(null)
  const [newSequentialId, setNewSequentialId] = useState("")
  const [coinAdjustment, setCoinAdjustment] = useState("")

  const userDocRef = useMemoFirebase(() => {
    if (!db || !user?.uid) return null
    return doc(db, "users", user.uid)
  }, [db, user?.uid])
  
  const { data: userData, isLoading: isUserDataLoading } = useDoc(userDocRef)

  const usersQuery = useMemoFirebase(() => {
    // Strictly wait for userData to confirm admin status before querying all users
    if (!db || !userData || userData.isAdmin !== true) return null
    return query(collection(db, "users"), orderBy("sequentialId", "asc"))
  }, [db, userData])

  const { data: allUsers, isLoading: isUsersLoading } = useCollection(usersQuery)

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push("/login")
    }
  }, [user, isUserLoading, router])

  useEffect(() => {
    if (userData && userData.isAdmin === false) {
      router.push("/home")
    }
  }, [userData, router])

  if (isUserLoading || isUserDataLoading || (userData?.isAdmin === true && isUsersLoading)) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    )
  }

  if (!userData?.isAdmin) return null

  const filteredUsers = allUsers?.filter(u => 
    u.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.sequentialId?.toString().includes(searchQuery)
  )

  const handleUpdateAdminStatus = async (targetUser: any) => {
    if (!db) return
    setIsUpdating(true)
    const targetRef = doc(db, "users", targetUser.id)
    const updateData = { isAdmin: !targetUser.isAdmin }

    updateDoc(targetRef, updateData)
      .then(() => {
        toast({
          title: "Admin Status Updated",
          description: `${targetUser.username} is now ${updateData.isAdmin ? "an administrator" : "a standard user"}.`,
        })
      })
      .catch(async (error) => {
        errorEmitter.emit("permission-error", new FirestorePermissionError({
          path: targetRef.path,
          operation: "update",
          requestResourceData: updateData,
        }))
      })
      .finally(() => setIsUpdating(false))
  }

  const handleUpdateSequentialId = async (targetUser: any) => {
    if (!db || !newSequentialId) return
    const numericId = parseInt(newSequentialId)
    if (isNaN(numericId)) return

    setIsUpdating(true)
    const targetRef = doc(db, "users", targetUser.id)
    const updateData = { sequentialId: numericId }

    updateDoc(targetRef, updateData)
      .then(() => {
        toast({
          title: "ID Updated",
          description: `User ${targetUser.username} position set to #${numericId}.`,
        })
        setEditingUserId(null)
      })
      .catch(async (error) => {
        errorEmitter.emit("permission-error", new FirestorePermissionError({
          path: targetRef.path,
          operation: "update",
          requestResourceData: updateData,
        }))
      })
      .finally(() => setIsUpdating(false))
  }

  const handleAdjustCoins = async (targetUser: any, method: 'add' | 'remove') => {
    if (!db || !coinAdjustment) return
    const amount = parseInt(coinAdjustment)
    if (isNaN(amount) || amount <= 0) return

    setIsUpdating(true)
    const targetRef = doc(db, "users", targetUser.id)
    const adjustment = method === 'add' ? amount : -amount
    const updateData = { coins: increment(adjustment) }

    updateDoc(targetRef, updateData)
      .then(() => {
        toast({
          title: "Coins Updated",
          description: `${method === 'add' ? "Added" : "Removed"} ${amount} coins for ${targetUser.username}.`,
        })
        setCoinAdjustment("")
      })
      .catch(async (error) => {
        errorEmitter.emit("permission-error", new FirestorePermissionError({
          path: targetRef.path,
          operation: "update",
          requestResourceData: updateData,
        }))
      })
      .finally(() => setIsUpdating(false))
  }

  return (
    <main className="min-h-screen bg-background w-full pt-24 px-6 pb-20">
      <NavigationBar />
      
      <div className="max-w-4xl mx-auto space-y-8 animate-fade-in">
        <div className="flex items-center gap-4">
          <Link href="/settings">
            <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground rounded-full">
              <ArrowLeft className="h-6 w-6" />
            </Button>
          </Link>
          <h1 className="text-4xl font-headline font-bold">Admin Management</h1>
        </div>

        <div className="relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
          <Input
            placeholder="Search by username or ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-card border-border h-14 pl-12 text-lg shadow-sm"
          />
        </div>

        <div className="space-y-4">
          {filteredUsers?.map((userItem) => (
            <div 
              key={userItem.id} 
              className="flex items-center justify-between p-5 rounded-2xl bg-card border border-border hover:border-primary/30 transition-all shadow-sm"
            >
              <div className="flex items-center gap-4">
                <div className="flex flex-col">
                  <span className="font-medium text-lg flex items-center gap-2">
                    {userItem.username}
                    {userItem.isAdmin && <ShieldCheck className="h-4 w-4 text-primary" />}
                  </span>
                  <span className="text-muted-foreground text-sm font-headline">
                    ID: #{userItem.sequentialId} | Coins: {userItem.coins ?? 0}
                  </span>
                </div>
              </div>

              <Dialog open={editingUserId === userItem.id} onOpenChange={(open) => {
                if (!open) setEditingUserId(null)
              }}>
                <DialogTrigger asChild>
                  <Button 
                    onClick={() => {
                      setEditingUserId(userItem.id)
                      setNewSequentialId(userItem.sequentialId.toString())
                    }}
                    variant="ghost" 
                    size="icon" 
                    className="rounded-full hover:bg-accent transition-colors"
                  >
                    <Settings2 className="h-5 w-5" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-background border-border sm:max-w-[425px]">
                  <DialogHeader>
                    <DialogTitle className="font-headline font-bold text-2xl">{userItem.username}</DialogTitle>
                    <DialogDescription>Manage user privileges and account details.</DialogDescription>
                  </DialogHeader>

                  <div className="py-6 space-y-8">
                    <div className="space-y-2">
                      <label className="text-xs font-headline font-bold text-muted-foreground uppercase tracking-wider">Permissions</label>
                      <Button
                        onClick={() => handleUpdateAdminStatus(userItem)}
                        disabled={isUpdating}
                        variant={userItem.isAdmin ? "destructive" : "default"}
                        className="w-full h-12 font-bold font-headline"
                      >
                        {userItem.isAdmin ? "Remove Admin Privileges" : "Grant Admin Privileges"}
                      </Button>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-headline font-bold text-muted-foreground uppercase tracking-wider">System Position</label>
                      <div className="flex gap-2">
                        <Input
                          type="number"
                          value={newSequentialId}
                          onChange={(e) => setNewSequentialId(e.target.value)}
                          className="h-12 bg-muted/30"
                        />
                        <Button
                          onClick={() => handleUpdateSequentialId(userItem)}
                          disabled={isUpdating || !newSequentialId}
                          className="h-12 px-6 font-headline font-bold"
                        >
                          Update
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-headline font-bold text-muted-foreground uppercase tracking-wider">Currency Control</label>
                      <div className="grid grid-cols-2 gap-3">
                        <Input
                          type="number"
                          placeholder="Amount"
                          value={coinAdjustment}
                          onChange={(e) => setCoinAdjustment(e.target.value)}
                          className="col-span-2 h-12 bg-muted/30"
                        />
                        <Button
                          onClick={() => handleAdjustCoins(userItem, 'add')}
                          disabled={isUpdating || !coinAdjustment}
                          className="h-12 bg-primary text-primary-foreground font-bold font-headline"
                        >
                          <Plus className="h-4 w-4 mr-2" /> Add
                        </Button>
                        <Button
                          onClick={() => handleAdjustCoins(userItem, 'remove')}
                          disabled={isUpdating || !coinAdjustment}
                          className="h-12 bg-destructive text-destructive-foreground font-bold font-headline"
                        >
                          <Minus className="h-4 w-4 mr-2" /> Remove
                        </Button>
                      </div>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          ))}
          
          {filteredUsers?.length === 0 && (
            <div className="text-center py-20 text-muted-foreground font-headline text-lg italic">
              No results found.
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
