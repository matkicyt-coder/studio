
"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc } from "@/firebase"
import { NavigationBar } from "@/components/navigation-bar"
import { collection, query, orderBy, doc, updateDoc, arrayUnion, where, limit } from "firebase/firestore"
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
  Clock,
  ShieldAlert,
  History,
  Coins,
  CreditCard,
  Sparkles,
  CheckSquare,
  Square,
  Zap
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

export default function AdminPage() {
  const { user, isUserLoading } = useUser()
  const db = useFirestore()
  const router = useRouter()
  const { toast } = useToast()

  const [userSearchQuery, setUserSearchQuery] = useState("")
  const [inspectingUserId, setInspectingUserId] = useState<string | null>(null)
  const [isUpdating, setIsUpdating] = useState(false)
  const [selectedReports, setSelectedReports] = useState<string[]>([])
  const [isAiProcessing, setIsAiProcessing] = useState(false)

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

  const reportsQuery = useMemoFirebase(() => {
    if (!db || !userData?.isAdmin) return null
    return query(collection(db, "reports"), orderBy("createdAt", "desc"), limit(50))
  }, [db, userData])
  const { data: allReports } = useCollection(reportsQuery)

  const inspectingUser = allUsers?.find(u => u.id === inspectingUserId)
  
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
      isBanned: type !== 'warning' && type !== 'none',
      banType: type,
      banReason: reason,
      moderationHistory: arrayUnion(logEntry)
    })
    toast({ title: "Sanction Applied" })
  }

  const handleClaimReport = async (reportId: string) => {
    if (!db || !user) return
    const rRef = doc(db, "reports", reportId)
    await updateDoc(rRef, { status: "claimed", adminId: user.uid })
    toast({ title: "Report Claimed" })
  }

  const handleAiReview = async (reportIds: string[]) => {
    if (!db) return
    setIsAiProcessing(true)
    try {
      for (const id of reportIds) {
        const report = allReports?.find(r => r.id === id)
        if (!report) continue

        const review = await reviewReport({
          reportId: report.id,
          reportReason: report.reason || "No reason specified."
        })

        const aiSummary = `Verdict: ${review.verdict.toUpperCase()} | Suggested: ${review.suggestedAction.toUpperCase()} | Reasoning: ${review.reasoning}`
        await updateDoc(doc(db, "reports", report.id), { aiReview: aiSummary })
      }
      toast({ title: "AI Analysis Complete", description: `Processed ${reportIds.length} reports.` })
      setSelectedReports([])
    } catch (e: any) {
      toast({ variant: "destructive", title: "AI Error", description: e.message })
    } finally {
      setIsAiProcessing(false)
    }
  }

  const toggleReportSelection = (id: string) => {
    setSelectedReports(prev => prev.includes(id) ? prev.filter(rid => rid !== id) : [...prev, id])
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
          <TabsList className="bg-card border h-12 rounded-full grid grid-cols-3 max-w-lg">
            <TabsTrigger value="users" className="rounded-full text-[10px] font-bold uppercase">Users</TabsTrigger>
            <TabsTrigger value="requests" className="rounded-full text-[10px] font-bold uppercase">Verify</TabsTrigger>
            <TabsTrigger value="reports" className="rounded-full text-[10px] font-bold uppercase">Reports</TabsTrigger>
          </TabsList>

          <TabsContent value="users" className="space-y-6">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input placeholder="Search user ID or name..." value={userSearchQuery} onChange={(e) => setUserSearchQuery(e.target.value)} className="pl-12 h-14 rounded-2xl" />
            </div>

            <div className="grid gap-3">
              {filteredUsers?.map((u) => (
                <div key={u.id} className="p-4 bg-card border rounded-2xl flex items-center justify-between hover:border-primary/50 transition-all shadow-sm">
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
              <div key={req.id} className="p-5 bg-card border rounded-2xl flex items-center justify-between shadow-sm">
                <div>
                  <p className="font-bold text-base">{req.username}</p>
                  <p className="text-[8px] font-headline font-bold text-muted-foreground uppercase tracking-widest">Requested {new Date(req.requestedAt).toLocaleDateString()}</p>
                </div>
                <div className="flex gap-2">
                  <Button onClick={() => handleApproveVerification(req)} size="sm" className="rounded-full font-bold uppercase text-[10px] px-4">Approve</Button>
                  <Button variant="outline" size="sm" className="rounded-full font-bold uppercase text-[10px] px-4" onClick={() => updateDoc(doc(db!, "verificationRequests", req.id), { status: "denied" })}>Deny</Button>
                </div>
              </div>
            ))}
            {vRequests?.filter(r => r.status === 'pending').length === 0 && (
              <div className="text-center py-20 italic text-muted-foreground text-[10px] uppercase">No pending requests</div>
            )}
          </TabsContent>

          <TabsContent value="reports" className="space-y-6">
            <div className="flex items-center justify-between bg-card p-4 rounded-2xl border shadow-sm">
              <div className="space-y-1">
                <h3 className="text-xs font-headline font-bold uppercase tracking-widest">Queue Control</h3>
                <p className="text-[10px] text-muted-foreground uppercase">{selectedReports.length} Reports Selected</p>
              </div>
              <Button 
                onClick={() => handleAiReview(selectedReports)} 
                disabled={selectedReports.length === 0 || isAiProcessing}
                className="rounded-full font-headline font-bold uppercase text-[10px] gap-2 px-6"
              >
                {isAiProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                AI Review Selection
              </Button>
            </div>

            <div className="grid gap-4">
              {allReports?.map(report => (
                <div key={report.id} className={cn("p-5 bg-card border rounded-2xl space-y-4 transition-all hover:border-primary/30 shadow-sm", selectedReports.includes(report.id) && "ring-2 ring-primary border-primary")}>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <Button variant="ghost" size="icon" className="rounded-full" onClick={() => toggleReportSelection(report.id)}>
                        {selectedReports.includes(report.id) ? <CheckSquare className="h-5 w-5 text-primary" /> : <Square className="h-5 w-5 text-muted-foreground" />}
                      </Button>
                      <div>
                        <p className="font-bold text-sm">Target ID: {report.targetUserId}</p>
                        <p className="text-[10px] font-headline font-bold text-muted-foreground uppercase tracking-widest">Reason: {report.reason}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {report.status !== 'claimed' && <Button size="sm" variant="outline" className="rounded-full text-[8px] font-bold uppercase h-8" onClick={() => handleClaimReport(report.id)}>Claim</Button>}
                      <Button size="sm" className="rounded-full text-[8px] font-bold uppercase h-8 gap-1" onClick={() => handleAiReview([report.id])} disabled={isAiProcessing}>
                        <Zap className="h-3 w-3" /> AI Inspect
                      </Button>
                    </div>
                  </div>
                  {report.aiReview && (
                    <div className="p-3 bg-primary/5 border border-primary/20 rounded-xl text-[10px] font-medium leading-relaxed italic text-primary">
                      <Sparkles className="h-3 w-3 inline mr-1" /> {report.aiReview}
                    </div>
                  )}
                  {report.status === 'claimed' && (
                    <div className="flex items-center gap-1.5 text-[8px] font-headline font-bold text-amber-500 uppercase tracking-widest">
                      <Clock className="h-3 w-3" /> Claimed by {report.adminId === user?.uid ? "You" : "Another Admin"}
                    </div>
                  )}
                </div>
              ))}
            </div>
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

              <section className="space-y-3">
                <h3 className="text-[10px] font-headline font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                  <CreditCard className="h-3 w-3" /> Transaction Ledger
                </h3>
                <div className="space-y-2">
                  {inspectionTransactions?.map((t: any) => (
                    <div key={t.id} className="p-3 bg-muted/30 rounded-xl flex justify-between items-center text-xs">
                      <div className="flex items-center gap-2">
                        {t.type === 'coin_purchase' ? <Coins className="h-3 w-3 text-primary" /> : <CreditCard className="h-3 w-3 text-amber-500" />}
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
