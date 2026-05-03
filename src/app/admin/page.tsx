"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc } from "@/firebase"
import { NavigationBar } from "@/components/navigation-bar"
import { collection, query, orderBy, doc, updateDoc, arrayUnion, where, limit, arrayRemove } from "firebase/firestore"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  Search, 
  Settings2, 
  ShieldCheck, 
  Loader2,
  ArrowLeft,
  User as UserIcon,
  ShieldAlert,
  Coins,
  CreditCard,
  Sparkles,
  CheckSquare,
  Square,
  UserPlus,
  UserMinus,
  CheckCircle2,
  Award,
  Trash2
} from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { VerifiedBadge } from "@/components/verified-badge"
import { cn } from "@/lib/utils"
import { reviewReport } from "@/ai/flows/review-report-flow"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export default function AdminPage() {
  const { user, userDocId, isUserLoading } = useUser()
  const db = useFirestore()
  const router = useRouter()
  const { toast } = useToast()

  const [userSearchQuery, setUserSearchQuery] = useState("")
  const [inspectingUserId, setInspectingUserId] = useState<string | null>(null)
  const [isUpdating, setIsUpdating] = useState(false)
  const [selectedReports, setSelectedReports] = useState<string[]>([])
  const [isAiProcessing, setIsAiProcessing] = useState(false)

  const userDocRef = useMemoFirebase(() => {
    if (!db || !userDocId) return null
    return doc(db, "users", userDocId)
  }, [db, userDocId])
  const { data: userData } = useDoc(userDocRef)

  const usersQuery = useMemoFirebase(() => {
    if (!db || !userData?.isAdmin) return null
    return query(collection(db, "users"), orderBy("sequentialId", "asc"))
  }, [db, userData])
  const { data: allUsers } = useCollection(usersQuery)

  const reportsQuery = useMemoFirebase(() => {
    if (!db || !userData?.isAdmin) return null
    return query(collection(db, "reports"), orderBy("createdAt", "desc"), limit(50))
  }, [db, userData])
  const { data: allReports } = useCollection(reportsQuery)

  const inspectingUser = allUsers?.find(u => u.uid === inspectingUserId)
  
  const transactionsQuery = useMemoFirebase(() => {
    if (!db || !inspectingUserId) return null
    return query(collection(db, "transactions"), where("userId", "==", inspectingUserId), orderBy("createdAt", "desc"))
  }, [db, inspectingUserId])
  const { data: inspectionTransactions } = useCollection(transactionsQuery)

  useEffect(() => {
    if (!isUserLoading && !user) router.push("/login")
    if (!isUserLoading && userData && !userData.isAdmin) router.push("/home")
  }, [user, isUserLoading, userData, router])

  const handleUpdateUserStatus = async (uid: string, field: string, value: any) => {
    if (!db) return
    setIsUpdating(true)
    const uRef = doc(db, "users", uid)
    await updateDoc(uRef, { [field]: value })
    toast({ title: "Status Updated" })
    setIsUpdating(false)
  }

  const handleBadgeToggle = async (uid: string, badgeId: string, hasBadge: boolean) => {
    if (!db) return
    const uRef = doc(db, "users", uid)
    await updateDoc(uRef, {
      badges: hasBadge ? arrayRemove(badgeId) : arrayUnion(badgeId)
    })
    toast({ title: "Badge Updated" })
  }

  const handleApplySanction = async (uid: string, type: string, reason: string) => {
    if (!db) return
    const uRef = doc(db, "users", uid)
    const now = new Date()
    let expiry = null
    
    if (type === 'temp-1') {
      expiry = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString()
    } else if (type === 'temp-7') {
      expiry = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString()
    }

    const logEntry = { type, reason, timestamp: now.toISOString() }
    const updateData: any = {
      isBanned: type !== 'none' && type !== 'warning',
      banType: type,
      banReason: reason,
      banExpiry: expiry,
      needsToAcceptTerms: type === 'warning' || type === 'temp-1' || type === 'temp-7',
      moderationHistory: arrayUnion(logEntry)
    }

    if (type === 'perm') {
      updateData.description = "Content Deleted"
    }

    await updateDoc(uRef, updateData)
    toast({ title: "Sanction Applied" })
  }

  const handleClaimReport = async (reportId: string) => {
    if (!db || !userDocId) return
    const rRef = doc(db, "reports", reportId)
    await updateDoc(rRef, { status: "claimed", adminId: userDocId })
    toast({ title: "Report Claimed" })
  }

  const handleAiReview = async (reportIds: string[]) => {
    if (!db) return
    setIsAiProcessing(true)
    try {
      for (const id of reportIds) {
        const report = allReports?.find(r => r.id === id)
        if (!report) continue
        const review = await reviewReport({ reportId: report.id, reportReason: report.reason || "No reason specified." })
        const aiSummary = `Verdict: ${review.verdict.toUpperCase()} | Suggested: ${review.suggestedAction.toUpperCase()} | Reasoning: ${review.reasoning}`
        await updateDoc(doc(db, "reports", report.id), { aiReview: aiSummary })
      }
      toast({ title: "AI Analysis Complete" })
      setSelectedReports([])
    } catch (e: any) {
      toast({ variant: "destructive", title: "AI Error", description: e.message })
    } finally {
      setIsAiProcessing(false)
    }
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
          <Link href="/home"><Button variant="ghost" size="icon" className="rounded-full"><ArrowLeft className="h-6 w-6" /></Button></Link>
          <h1 className="text-3xl font-headline font-bold uppercase tracking-tight">Management Dashboard</h1>
        </div>
        
        <Tabs defaultValue="users" className="space-y-6">
          <TabsList className="bg-card border h-12 rounded-full grid grid-cols-2 max-w-sm">
            <TabsTrigger value="users" className="rounded-full text-[10px] font-bold uppercase">User Registry</TabsTrigger>
            <TabsTrigger value="reports" className="rounded-full text-[10px] font-bold uppercase">Moderation</TabsTrigger>
          </TabsList>

          <TabsContent value="users" className="space-y-6">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input placeholder="Search user ID or name..." value={userSearchQuery} onChange={(e) => setUserSearchQuery(e.target.value)} className="pl-12 h-14 rounded-2xl" />
            </div>
            <div className="grid gap-3">
              {filteredUsers?.map((u) => (
                <div key={u.uid} className="p-4 bg-card border rounded-2xl flex items-center justify-between hover:border-primary/50 transition-all shadow-sm">
                  <div className="flex items-center gap-3">
                    <UserIcon className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-bold text-sm flex items-center gap-1.5">{u.username} {u.isVerified && <VerifiedBadge className="h-3 w-3" />}</p>
                      <p className="text-[8px] font-headline font-bold text-muted-foreground uppercase tracking-widest">ID #{u.sequentialId}</p>
                    </div>
                  </div>
                  <Button onClick={() => setInspectingUserId(u.uid)} variant="ghost" size="icon" className="rounded-full"><Settings2 className="h-4 w-4" /></Button>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="reports" className="space-y-6">
            <div className="flex items-center justify-between bg-card p-4 rounded-2xl border shadow-sm">
              <div className="space-y-1">
                <h3 className="text-xs font-headline font-bold uppercase tracking-widest">Incident Queue</h3>
                <p className="text-[10px] text-muted-foreground uppercase">{selectedReports.length} Selected</p>
              </div>
              <Button onClick={() => handleAiReview(selectedReports)} disabled={selectedReports.length === 0 || isAiProcessing} className="rounded-full font-headline font-bold uppercase text-[10px] gap-2 px-6">
                {isAiProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                AI Review
              </Button>
            </div>
            <div className="grid gap-4">
              {allReports?.map(report => (
                <div key={report.id} className={cn("p-5 bg-card border rounded-2xl space-y-4 shadow-sm", selectedReports.includes(report.id) && "ring-2 ring-primary border-primary")}>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <Button variant="ghost" size="icon" className="rounded-full" onClick={() => setSelectedReports(prev => prev.includes(report.id) ? prev.filter(rid => rid !== report.id) : [...prev, report.id])}>
                        {selectedReports.includes(report.id) ? <CheckSquare className="h-5 w-5 text-primary" /> : <Square className="h-5 w-5 text-muted-foreground" />}
                      </Button>
                      <div>
                        <p className="font-bold text-sm">Subject ID: {report.targetUserId}</p>
                        <p className="text-[10px] font-headline font-bold text-muted-foreground uppercase">Reason: {report.reason}</p>
                        {report.status === 'claimed' && <Badge variant="secondary" className="mt-2 text-[8px] font-bold">CLAIMED</Badge>}
                        {report.aiReview && <p className="mt-2 text-[8px] text-primary font-medium italic">{report.aiReview}</p>}
                      </div>
                    </div>
                    {report.status !== 'claimed' && (
                      <Button size="sm" variant="outline" className="rounded-full text-[8px] font-bold uppercase" onClick={() => handleClaimReport(report.id)}>Claim</Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>

        <Dialog open={!!inspectingUserId} onOpenChange={(open) => !open && setInspectingUserId(null)}>
          <DialogContent className="max-w-2xl rounded-[40px] max-h-[90vh] overflow-y-auto bg-white border-none shadow-2xl">
            <DialogHeader>
              <DialogTitle className="text-2xl font-headline font-bold uppercase tracking-tight flex items-center gap-3">
                <UserIcon className="h-6 w-6" /> 
                User Profile: {inspectingUser?.username}
              </DialogTitle>
            </DialogHeader>
            
            <div className="py-6 space-y-8">
              <section className="grid grid-cols-2 gap-6">
                <div className="space-y-4 p-6 bg-muted/20 rounded-3xl border border-border/50">
                  <h3 className="text-[10px] font-headline font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                    <ShieldCheck className="h-3 w-3" /> Privileges
                  </h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Verified Status</span>
                      <Button 
                        size="sm" 
                        variant={inspectingUser?.isVerified ? "default" : "outline"}
                        className="rounded-full h-8 text-[10px] font-bold"
                        onClick={() => handleUpdateUserStatus(inspectingUserId!, 'isVerified', !inspectingUser?.isVerified)}
                      >
                        {inspectingUser?.isVerified ? "Revoke" : "Verify"}
                      </Button>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Admin Rights</span>
                      <Button 
                        size="sm" 
                        variant={inspectingUser?.isAdmin ? "destructive" : "outline"}
                        className="rounded-full h-8 text-[10px] font-bold"
                        onClick={() => handleUpdateUserStatus(inspectingUserId!, 'isAdmin', !inspectingUser?.isAdmin)}
                      >
                        {inspectingUser?.isAdmin ? "Remove Admin" : "Grant Admin"}
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="space-y-4 p-6 bg-muted/20 rounded-3xl border border-border/50">
                  <h3 className="text-[10px] font-headline font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                    <Award className="h-3 w-3" /> Badges
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {['admin', 'premium', 'friendship'].map(bid => (
                      <Badge 
                        key={bid} 
                        variant={inspectingUser?.badges?.includes(bid) ? "default" : "outline"}
                        className="cursor-pointer uppercase text-[8px] h-6"
                        onClick={() => handleBadgeToggle(inspectingUserId!, bid, !!inspectingUser?.badges?.includes(bid))}
                      >
                        {bid}
                      </Badge>
                    ))}
                  </div>
                </div>
              </section>

              <section className="space-y-4 p-6 bg-destructive/5 rounded-3xl border border-destructive/20">
                <h3 className="text-[10px] font-headline font-bold text-destructive uppercase tracking-widest flex items-center gap-2">
                  <ShieldAlert className="h-3 w-3" /> Discipline Registry
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <Button variant="outline" className="rounded-2xl h-12 text-[10px] font-bold uppercase" onClick={() => handleApplySanction(inspectingUserId!, 'warning', 'Manual Policy Warning')}>Issue Warning</Button>
                  <Button variant="outline" className="rounded-2xl h-12 text-[10px] font-bold uppercase" onClick={() => handleApplySanction(inspectingUserId!, 'temp-1', '24 Hour Suspension')}>1 Day Ban</Button>
                  <Button variant="outline" className="rounded-2xl h-12 text-[10px] font-bold uppercase" onClick={() => handleApplySanction(inspectingUserId!, 'temp-7', 'Policy Violation Suspension')}>7 Day Ban</Button>
                  <Button variant="destructive" className="rounded-2xl h-12 text-[10px] font-bold uppercase" onClick={() => handleApplySanction(inspectingUserId!, 'perm', 'Permanent Account Closure')}>Permanent Ban</Button>
                </div>
              </section>

              <section className="space-y-4">
                <h3 className="text-[10px] font-headline font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                  <CreditCard className="h-3 w-3" /> Financial History
                </h3>
                <div className="space-y-2 max-h-[200px] overflow-y-auto pr-2">
                  {inspectionTransactions?.map((t: any) => (
                    <div key={t.id} className="p-3 bg-muted/10 rounded-xl flex justify-between items-center text-xs border border-border/30">
                      <div className="flex items-center gap-2"><Coins className="h-3 w-3 text-primary" /><span className="font-bold uppercase">{t.type}</span></div>
                      <p className="font-bold">{t.amount} COINS</p>
                    </div>
                  ))}
                  {(!inspectionTransactions || inspectionTransactions.length === 0) && (
                    <p className="text-[10px] text-muted-foreground italic text-center py-4">No transactions recorded.</p>
                  )}
                </div>
              </section>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </main>
  )
}
