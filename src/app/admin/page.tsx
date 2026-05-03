"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc } from "@/firebase"
import { NavigationBar } from "@/components/navigation-bar"
import { collection, query, orderBy, doc, updateDoc } from "firebase/firestore"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { 
  Search, 
  Settings2, 
  ShieldCheck, 
  ShieldX, 
  Hash, 
  Loader2,
  ArrowLeft
} from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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

  // Fetch current user to verify admin status
  const userDocRef = useMemoFirebase(() => {
    if (!db || !user?.uid) return null
    return doc(db, "users", user.uid)
  }, [db, user?.uid])
  const { data: userData } = useDoc(userDocRef)

  // Fetch all users
  const usersQuery = useMemoFirebase(() => {
    if (!db) return null
    return query(collection(db, "users"), orderBy("sequentialId", "asc"))
  }, [db])
  const { data: allUsers, isLoading: isUsersLoading } = useCollection(usersQuery)

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push("/login")
    }
  }, [user, isUserLoading, router])

  // Security check: only admins can see this
  useEffect(() => {
    if (userData && !userData.isAdmin) {
      router.push("/home")
    }
  }, [userData, router])

  if (isUserLoading || isUsersLoading || !userData?.isAdmin) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    )
  }

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
          title: "Admin status updated",
          description: `${targetUser.username} is now ${updateData.isAdmin ? "an admin" : "not an admin"}.`,
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
          title: "ID updated",
          description: `User ${targetUser.username} ID set to ${numericId}.`,
        })
        setEditingUserId(null)
        setNewSequentialId("")
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
          <h1 className="text-4xl font-headline font-bold tracking-tighter">
            Admin Management
          </h1>
        </div>

        {/* Search Bar */}
        <div className="relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
          <Input
            placeholder="Search by username or sequential ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-card border-border h-14 pl-12 text-lg focus:ring-primary/20"
          />
        </div>

        {/* User List */}
        <div className="space-y-4">
          {filteredUsers?.map((userItem) => (
            <div 
              key={userItem.id} 
              className="flex items-center justify-between p-4 rounded-xl bg-card border border-border hover:border-primary/30 transition-colors"
            >
              <div className="flex items-center gap-4">
                <div className="flex flex-col">
                  <span className="font-medium text-lg flex items-center gap-2">
                    {userItem.username}
                    {userItem.isAdmin && <ShieldCheck className="h-4 w-4 text-primary" />}
                  </span>
                  <span className="text-muted-foreground text-sm font-headline tracking-widest">
                    ID: #{userItem.sequentialId}
                  </span>
                </div>
              </div>

              <Dialog open={editingUserId === userItem.id} onOpenChange={(open) => {
                if (!open) {
                  setEditingUserId(null)
                  setNewSequentialId("")
                }
              }}>
                <DialogTrigger asChild>
                  <Button 
                    onClick={() => {
                      setEditingUserId(userItem.id)
                      setNewSequentialId(userItem.sequentialId.toString())
                    }}
                    variant="ghost" 
                    size="icon" 
                    className="text-muted-foreground hover:text-foreground hover:bg-accent"
                  >
                    <Settings2 className="h-5 w-5" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-background border-border">
                  <DialogHeader>
                    <DialogTitle className="font-headline font-bold text-2xl">Manage User: {userItem.username}</DialogTitle>
                    <DialogDescription className="text-muted-foreground">
                      Update permissions and system placement.
                    </DialogDescription>
                  </DialogHeader>

                  <div className="py-6 space-y-6">
                    {/* Admin Toggle */}
                    <div className="space-y-2">
                      <label className="text-xs font-headline font-bold text-muted-foreground tracking-widest uppercase">Admin Privileges</label>
                      <Button
                        onClick={() => handleUpdateAdminStatus(userItem)}
                        disabled={isUpdating}
                        variant={userItem.isAdmin ? "destructive" : "default"}
                        className="w-full h-12 font-headline font-bold gap-2"
                      >
                        {userItem.isAdmin ? (
                          <>
                            <ShieldX className="h-5 w-5" />
                            Remove Admin Rights
                          </>
                        ) : (
                          <>
                            <ShieldCheck className="h-5 w-5" />
                            Make Administrator
                          </>
                        )}
                      </Button>
                    </div>

                    {/* Sequential ID Change */}
                    <div className="space-y-2">
                      <label className="text-xs font-headline font-bold text-muted-foreground tracking-widest uppercase">Sequential ID Position</label>
                      <div className="relative">
                        <Hash className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                          type="number"
                          placeholder="Position Number"
                          value={newSequentialId}
                          onChange={(e) => setNewSequentialId(e.target.value)}
                          className="bg-background border-border pl-10 h-12"
                        />
                      </div>
                      <Button
                        onClick={() => handleUpdateSequentialId(userItem)}
                        disabled={isUpdating || !newSequentialId || newSequentialId === userItem.sequentialId.toString()}
                        className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-headline font-bold h-12"
                      >
                        {isUpdating ? <Loader2 className="h-4 w-4 animate-spin" /> : "Update ID Position"}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          ))}
          
          {filteredUsers?.length === 0 && (
            <div className="text-center py-20 text-muted-foreground font-headline">
              No matching users found.
            </div>
          )}
        </div>
      </div>
    </main>
  )
}