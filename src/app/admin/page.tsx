
"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc, useAuth } from "@/firebase"
import { NavigationBar } from "@/components/navigation-bar"
import { collection, query, orderBy, doc, updateDoc, increment, deleteDoc, arrayUnion, arrayRemove, where } from "firebase/firestore"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  Search, 
  Settings2, 
  ShieldCheck, 
  Loader2,
  ArrowLeft,
  Trash2,
  User as UserIcon,
  Clock,
  ShieldAlert,
  Ban,
  Check,
  Crown,
  Wifi,
  History,
  Coins,
  CreditCard,
  FileText
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
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { VerifiedBadge } from "@/components/verified-badge"
import { PremiumBadge } from "@/components/premium-badge"
import { cn } from "@/lib/utils"

export default function AdminPage() {
  const { user, isUserLoading } = useUser()
  const db = useFirestore()
  const router = useRouter()
  const { toast } = useToast()

  const [userSearchQuery, setUserSearchQuery] = useState("")
  const [inspectingUserId, setInspectingUserId] = useState<string | null>(null)
  const [isUpdating, setIsUpdating] = useState(false)

  const userDocRef = useMemoFirebase(() => {
    if (!db || !user?.uid) return null
    return doc(db, "users", user.uid)
  }, [db, user?.uid])
  const { data: userData } = useDoc(userDocRef)

  const usersQuery = useMemoFirebase(() => {
    if (!db || !userData?.isAdmin) return null
    return query(collection(db, "users"), orderBy("sequentialId", "asc"))
  }, [db, userData])
  const { data: allUsers } = useCollection(usersQuery)

  const requestsQuery = useMemoFirebase(() => {
    if (!db || !userData?.isAdmin) return null
    return query(collection(db, "verificationRequests"), orderBy("requestedAt", "desc"))
  }, [db, userData])
  const { data: vRequests } = useCollection(requestsQuery)

  const inspectingUser = allUsers?.find(u => u.id === inspectingUserId)
  
  // Inspection sub-queries
  const transactionsQuery = useMemoFirebase(() => {
    if (!db || !inspectingUserId) return null
    return query(collection(db, "transactions"), where("userId", "==", inspectingUserId), orderBy("createdAt", "desc"))
  }, [db, inspectingUserId])
  const { data: inspectionTransactions } = useCollection(transactionsQuery)

  useEffect(() => {
    if (!isUserLoading && !user) router.push("/login")
    if (!isUserLoading && userData && !userData.isAdmin) router.push("/home")
  }, [user, isUserLoading, userData, router])

  const handleApproveVerification = async (req: any) => {
    if (!db) return
    setIsUpdating(true)
    const uRef = doc(db, "users", req.userId)
    const rRef = doc(db, "verificationRequests", req.id)
    
    await updateDoc(uRef, { isVerified: true })
    await updateDoc(rRef, { status: "approved" })
    toast({ title: "User Verified" })
    setIsUpdating(false)
  }

  const handleApplySanction = async (userId: string, type: string, reason: string) => {
    if (!db) return
    const uRef = doc(db, "users", userId)
    const logEntry = { type, reason, timestamp: new Date().toISOString() }
    
    await updateDoc(uRef, {
      isBanned: type !== 'warning',
      banType: type,
      banReason: reason,
      moderationHistory: arrayUnion(logEntry)
    })
    toast({ title: "Sanction Applied" })
  }

  if (isUserLoading || !userData?.isAdmin) return null

  const filteredUsers = allUsers?.filter(u => 
    u.username?.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
    u.sequentialId?.toString().includes(userSearchQuery)
  )

  return (
    <main className="min-h-screen bg-background pt-24 px-4 pb-20">
      <NavigationBar />
      <div className="max-w-4xl mx-auto space-y-8 animate-fade-in">
        <div className="flex items-center gap-4">
          <Link href="/settings"><Button variant="ghost" size="icon" className="rounded-full"><ArrowLeft className="h-6 w-6" /></Button></Link>
          <h1 className="text-3xl font-headline font-bold uppercase tracking-tight">Admin Terminal</h1>
        </div>

        <Tabs defaultValue="users" className="space-y-6">
          <TabsList className="bg-card border h-12 rounded-full grid grid-cols-2 max-w-md">
            <TabsTrigger value="users" className="rounded-full text-[10px] font-bold uppercase">Users</TabsTrigger>
            <TabsTrigger value="requests" className="rounded-full text-[10px] font-bold uppercase">Verification</TabsTrigger>
          </TabsList>

          <TabsContent value="users" className="space-y-6">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input placeholder="Search user ID or name..." value={userSearchQuery} onChange={(e) => setUserSearchQuery(e.target.value)} className="pl-12 h-14 rounded-2xl" />
            </div>

            <div className="grid gap-3">
              {filteredUsers?.map((u) => (
                <div key={u.id} className="p-4 bg-card border rounded-2xl flex items-center justify-between hover:border-primary/50 transition-all">
                  <div className="flex items-center gap-3">
                    <UserIcon className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-bold text-sm flex items-center gap-1.5">{u.username} {u.isVerified && <VerifiedBadge className="h-3 w-3" />}</p>
                      <p className="text-[8px] font-headline font-bold text-muted-foreground uppercase tracking-widest">ID #{u.sequentialId}</p>
                    </div>
                  </div>
                  <Button onClick={() => setInspectingUserId(u.id)} variant="ghost" size="icon" className="rounded-full"><Settings2 className="h-4 w-4" /></Button>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="requests" className="space-y-4">
            {vRequests?.filter(r => r.status === 'pending').map(req => (
              <div key={req.id} className="p-5 bg-card border rounded-2xl flex items-center justify-between">
                <div>
                  <p className="font-bold text-base">{req.username}</p>
                  <p className="text-[8px] font-headline font-bold text-muted-foreground uppercase tracking-widest">Requested {new Date(req.requestedAt).toLocaleDateString()}</p>
                </div>
                <div className="flex gap-2">
                  <Button onClick={() => handleApproveVerification(req)} size="sm" className="rounded-full font-bold uppercase text-[10px] px-4">Approve</Button>
                  <Button variant="outline" size="sm" className="rounded-full font-bold uppercase text-[10px] px-4" onClick={() => updateDoc(doc(db, "verificationRequests", req.id), { status: "denied" })}>Deny</Button>
                </div>
              </div>
            ))}
            {vRequests?.filter(r => r.status === 'pending').length === 0 && (
              <div className="text-center py-20 italic text-muted-foreground text-[10px] uppercase">No pending requests</div>
            )}
          </TabsContent>
        </Tabs>

        {/* Inspection Terminal */}
        <Dialog open={!!inspectingUserId} onOpenChange={(open) => !open && setInspectingUserId(null)}>
          <DialogContent className="max-w-2xl rounded-[40px] max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-2xl font-headline font-bold uppercase tracking-tight flex items-center gap-2">
                <History className="h-6 w-6 text-primary" /> Inspect Dossier: {inspectingUser?.username}
              </DialogTitle>
            </DialogHeader>
            
            <div className="py-6 space-y-10">
              {/* Role History */}
              <section className="space-y-3">
                <h3 className="text-[10px] font-headline font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                  <ShieldCheck className="h-3 w-3" /> Identity & Privileges
                </h3>
                <div className="flex flex-wrap gap-2">
                  {inspectingUser?.isAdmin && <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20">ADMINISTRATOR</Badge>}
                  {inspectingUser?.isPremium && <Badge variant="secondary" className="bg-amber-500/10 text-amber-500 border-amber-500/20">PREMIUM CLUB</Badge>}
                  {inspectingUser?.isVerified && <Badge variant="secondary" className="bg-blue-500/10 text-blue-500 border-blue-500/20">VERIFIED STATUS</Badge>}
                  <Badge variant="outline">JOINED {new Date(inspectingUser?.createdAt || "").toLocaleDateString()}</Badge>
                </div>
              </section>

              {/* Moderation History */}
              <section className="space-y-3">
                <h3 className="text-[10px] font-headline font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                  <ShieldAlert className="h-3 w-3" /> Moderation Log
                </h3>
                <div className="space-y-2">
                  {inspectingUser?.moderationHistory?.map((log: any, idx: number) => (
                    <div key={idx} className="p-3 bg-muted/30 rounded-xl flex justify-between items-center text-xs">
                      <div>
                        <span className="font-bold uppercase tracking-tighter text-destructive mr-2">{log.type}</span>
                        <span className="italic">"{log.reason}"</span>
                      </div>
                      <span className="text-[10px] opacity-50">{new Date(log.timestamp).toLocaleDateString()}</span>
                    </div>
                  ))}
                  {!inspectingUser?.moderationHistory?.length && <p className="text-xs italic text-muted-foreground">Clean behavioral history.</p>}
                </div>
              </section>

              {/* Purchase History */}
              <section className="space-y-3">
                <h3 className="text-[10px] font-headline font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                  <CreditCard className="h-3 w-3" /> Transaction Ledger
                </h3>
                <div className="space-y-2">
                  {inspectionTransactions?.map((t: any) => (
                    <div key={t.id} className="p-3 bg-muted/30 rounded-xl flex justify-between items-center text-xs">
                      <div className="flex items-center gap-2">
                        {t.type === 'coin_purchase' ? <Coins className="h-3 w-3 text-primary" /> : <Crown className="h-3 w-3 text-amber-500" />}
                        <span className="font-bold uppercase tracking-tighter">{t.type.replace('_', ' ')}</span>
                      </div>
                      <div className="text-right">
                        <p className="font-bold">{t.amount > 0 ? `+${t.amount}` : t.amount} COINS</p>
                        <p className="text-[8px] opacity-50">{new Date(t.createdAt).toLocaleDateString()}</p>
                      </div>
                    </div>
                  ))}
                  {!inspectionTransactions?.length && <p className="text-xs italic text-muted-foreground">No financial activity recorded.</p>}
                </div>
              </section>

              {/* Quick Actions */}
              <div className="grid grid-cols-2 gap-3 pt-6 border-t">
                <Button variant="outline" onClick={() => handleApplySanction(inspectingUserId!, 'warning', 'Manual intervention')}>Issue Warning</Button>
                <Button variant="destructive" onClick={() => handleApplySanction(inspectingUserId!, 'perm', 'Admin discretion')}>Terminal Ban</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </main>
  )
}
