
"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc } from "@/firebase"
import { NavigationBar } from "@/components/navigation-bar"
import { collection, query, orderBy, doc, updateDoc, increment, deleteDoc } from "firebase/firestore"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  Search, 
  Settings2, 
  ShieldCheck, 
  Loader2,
  ArrowLeft,
  Plus,
  Minus,
  Flag,
  Trash2,
  User as UserIcon,
  Clock,
  ShieldAlert,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ExternalLink
} from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter
} from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"
import { errorEmitter } from "@/firebase/error-emitter"
import { FirestorePermissionError } from "@/firebase/errors"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"

export default function AdminPage() {
  const { user, isUserLoading } = useUser()
  const db = useFirestore()
  const router = useRouter()
  const { toast } = useToast()

  const [userSearchQuery, setUserSearchQuery] = useState("")
  const [isUpdating, setIsUpdating] = useState(false)
  const [editingUserId, setEditingUserId] = useState<string | null>(null)
  const [inspectingReportId, setInspectingReportId] = useState<string | null>(null)
  const [newSequentialId, setNewSequentialId] = useState("")
  const [coinAdjustment, setCoinAdjustment] = useState("")

  const userDocRef = useMemoFirebase(() => {
    if (!db || !user?.uid) return null
    return doc(db, "users", user.uid)
  }, [db, user?.uid])
  
  const { data: userData, isLoading: isUserDataLoading } = useDoc(userDocRef)

  const usersQuery = useMemoFirebase(() => {
    if (!db || !userData || userData.isAdmin !== true) return null
    return query(collection(db, "users"), orderBy("sequentialId", "asc"))
  }, [db, userData])

  const reportsQuery = useMemoFirebase(() => {
    if (!db || !userData || userData.isAdmin !== true) return null
    return query(collection(db, "reports"), orderBy("createdAt", "desc"))
  }, [db, userData])

  const { data: allUsers, isLoading: isUsersLoading } = useCollection(usersQuery)
  const { data: allReports, isLoading: isReportsLoading } = useCollection(reportsQuery)

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push("/login")
    }
  }, [user, isUserLoading, router])

  useEffect(() => {
    if (!isUserDataLoading && userData && userData.isAdmin === false) {
      router.push("/home")
    }
  }, [userData, isUserDataLoading, router])

  if (isUserLoading || isUserDataLoading || (userData?.isAdmin === true && (isUsersLoading || isReportsLoading))) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    )
  }

  if (!userData?.isAdmin) return null

  const filteredUsers = allUsers?.filter(u => 
    u.username?.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
    u.sequentialId?.toString().includes(userSearchQuery)
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
          title: "ID updated",
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
          title: "Coins updated",
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

  const handleDeleteReport = async (reportId: string) => {
    if (!db) return
    const reportRef = doc(db, "reports", reportId)
    deleteDoc(reportRef).then(() => {
      toast({ title: "Report cleared" })
    }).catch(error => {
      errorEmitter.emit("permission-error", new FirestorePermissionError({
        path: reportRef.path,
        operation: "delete"
      }))
    })
  }

  const handleClaimReport = async (report: any) => {
    if (!db || !user || !userData) return
    const reportRef = doc(db, "reports", report.id)
    const updateData = {
      claimedById: user.uid,
      claimedByUsername: userData.username,
      status: "pending"
    }
    updateDoc(reportRef, updateData)
      .then(() => {
        toast({ title: "Report claimed" })
      })
      .catch(error => {
        errorEmitter.emit("permission-error", new FirestorePermissionError({
          path: reportRef.path,
          operation: "update",
          requestResourceData: updateData
        }))
      })
  }

  const handleUnclaimReport = async (reportId: string) => {
    if (!db) return
    const reportRef = doc(db, "reports", reportId)
    const updateData = {
      claimedById: null,
      claimedByUsername: null,
      status: "pending"
    }
    updateDoc(reportRef, updateData).then(() => {
      setInspectingReportId(null)
      toast({ title: "Report unclaimed" })
    }).catch(error => {
      errorEmitter.emit("permission-error", new FirestorePermissionError({
        path: reportRef.path,
        operation: "update",
        requestResourceData: updateData
      }))
    })
  }

  const handleUpdateReportStatus = async (reportId: string, status: string) => {
    if (!db) return
    const reportRef = doc(db, "reports", reportId)
    const updateData = { status }
    updateDoc(reportRef, updateData).then(() => {
      toast({ title: "Status updated", description: `Report marked as ${status}.` })
    }).catch(error => {
      errorEmitter.emit("permission-error", new FirestorePermissionError({
        path: reportRef.path,
        operation: "update",
        requestResourceData: updateData
      }))
    })
  }

  const activeReport = allReports?.find(r => r.id === inspectingReportId)
  const reporterProfile = activeReport ? allUsers?.find(u => u.id === activeReport.reporterId) : null
  const targetProfile = activeReport ? allUsers?.find(u => u.id === activeReport.targetUserId) : null

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
          <h1 className="text-4xl font-headline font-bold tracking-tighter">Admin Panel</h1>
        </div>

        <Tabs defaultValue="users" className="space-y-6">
          <TabsList className="bg-card border border-border h-12 p-1 rounded-full grid grid-cols-2 max-w-md">
            <TabsTrigger value="users" className="rounded-full font-headline font-bold uppercase text-[10px] tracking-widest">Users</TabsTrigger>
            <TabsTrigger value="reports" className="rounded-full font-headline font-bold flex items-center gap-2 uppercase text-[10px] tracking-widest">
              Reports
              {allReports && allReports.length > 0 && (
                <span className="bg-destructive text-destructive-foreground px-1.5 py-0.5 rounded-full text-[8px]">
                  {allReports.length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="users" className="space-y-6">
            <div className="relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
              <Input
                placeholder="Search users..."
                value={userSearchQuery}
                onChange={(e) => setUserSearchQuery(e.target.value)}
                className="bg-card border-border h-14 pl-12 text-lg shadow-sm rounded-2xl"
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
                      <span className="text-muted-foreground text-[10px] font-headline uppercase tracking-widest">
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
                        <div className="flex items-center justify-between pr-8">
                          <DialogTitle className="font-headline font-bold text-2xl">{userItem.username}</DialogTitle>
                          <Link href={`/profile/${userItem.sequentialId}`} target="_blank">
                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                          </Link>
                        </div>
                        <DialogDescription>Manage user privileges and account details.</DialogDescription>
                      </DialogHeader>

                      <div className="py-6 space-y-8">
                        <div className="space-y-2">
                          <label className="text-[10px] font-headline font-bold text-muted-foreground uppercase tracking-widest">Permissions</label>
                          <Button
                            onClick={() => handleUpdateAdminStatus(userItem)}
                            disabled={isUpdating}
                            variant={userItem.isAdmin ? "destructive" : "default"}
                            className="w-full h-12 font-bold font-headline uppercase text-xs"
                          >
                            {userItem.isAdmin ? "Remove Admin Privileges" : "Grant Admin Privileges"}
                          </Button>
                        </div>

                        <div className="space-y-2">
                          <label className="text-[10px] font-headline font-bold text-muted-foreground uppercase tracking-widest">System Position</label>
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
                              className="h-12 px-6 font-headline font-bold uppercase text-xs"
                            >
                              Update
                            </Button>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <label className="text-[10px] font-headline font-bold text-muted-foreground uppercase tracking-widest">Currency Control</label>
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
                              className="h-12 bg-primary text-primary-foreground font-bold font-headline uppercase text-xs"
                            >
                              <Plus className="h-4 w-4 mr-2" /> Add
                            </Button>
                            <Button
                              onClick={() => handleAdjustCoins(userItem, 'remove')}
                              disabled={isUpdating || !coinAdjustment}
                              className="h-12 bg-destructive text-destructive-foreground font-bold font-headline uppercase text-xs"
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
                <div className="text-center py-20 text-muted-foreground font-headline text-[10px] uppercase tracking-[0.2em] italic">
                  No users found matching your search.
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="reports" className="space-y-4">
            {allReports?.map((report) => (
              <div key={report.id} className="p-6 rounded-2xl bg-card border border-border space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Flag className="h-5 w-5 text-destructive" />
                    <span className="font-headline font-bold text-lg">Report: {report.targetUsername}</span>
                    {report.status && report.status !== 'pending' && (
                      <Badge variant="outline" className="uppercase text-[8px] tracking-[0.2em] font-bold h-5">
                        {report.status}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {report.claimedById ? (
                      <Button 
                        onClick={() => setInspectingReportId(report.id)}
                        className="bg-primary hover:bg-primary/90 font-headline font-bold text-[10px] uppercase h-8 px-4 rounded-full"
                      >
                        Inspect
                      </Button>
                    ) : (
                      <Button 
                        onClick={() => handleClaimReport(report)}
                        variant="outline"
                        className="font-headline font-bold text-[10px] uppercase h-8 px-4 rounded-full"
                      >
                        Claim
                      </Button>
                    )}
                    <Button 
                      onClick={() => handleDeleteReport(report.id)}
                      variant="ghost" 
                      size="icon" 
                      className="text-muted-foreground hover:text-destructive rounded-full"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                
                <div className="flex gap-4">
                  <div className="flex-1 space-y-1">
                    <p className="text-[10px] font-headline font-bold text-muted-foreground uppercase tracking-widest">Category: {report.category || "General"}</p>
                    <p className="bg-muted/30 p-4 rounded-xl text-sm italic border border-border/50 line-clamp-2">
                      "{report.reason}"
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <div className="flex items-center gap-4 text-[10px] text-muted-foreground font-headline uppercase tracking-widest">
                    <div className="flex items-center gap-1">
                      <UserIcon className="h-3 w-3" />
                      {report.reporterUsername}
                    </div>
                    {report.claimedByUsername && (
                      <div className="flex items-center gap-1 text-primary">
                        <ShieldCheck className="h-3 w-3" />
                        {report.claimedByUsername}
                      </div>
                    )}
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {new Date(report.createdAt).toLocaleString()}
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {/* Inspect Dialog */}
            <Dialog open={!!inspectingReportId} onOpenChange={(open) => !open && setInspectingReportId(null)}>
              <DialogContent className="bg-background border-border sm:max-w-[500px]">
                {activeReport && (
                  <>
                    <DialogHeader>
                      <DialogTitle className="font-headline font-bold text-2xl flex items-center gap-2">
                        <ShieldAlert className="h-6 w-6 text-destructive" />
                        Inspect Report
                      </DialogTitle>
                      <DialogDescription>
                        Moderation terminal for report against {activeReport.targetUsername}.
                      </DialogDescription>
                    </DialogHeader>

                    <div className="py-6 space-y-6">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <h4 className="text-[10px] font-headline font-bold text-muted-foreground uppercase tracking-widest">Target Object</h4>
                          <Badge variant="secondary" className="uppercase text-[8px] tracking-[0.2em]">{activeReport.reportTarget || "Unknown"}</Badge>
                        </div>
                        <div className="space-y-1">
                          <h4 className="text-[10px] font-headline font-bold text-muted-foreground uppercase tracking-widest">Category</h4>
                          <Badge variant="secondary" className="uppercase text-[8px] tracking-[0.2em]">{activeReport.category || "Other"}</Badge>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <h4 className="text-[10px] font-headline font-bold text-muted-foreground uppercase tracking-widest">Reason</h4>
                        <p className="bg-muted/30 p-4 rounded-xl text-sm italic border border-border/50">
                          "{activeReport.reason}"
                        </p>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <h4 className="text-[10px] font-headline font-bold text-muted-foreground uppercase tracking-widest">Target</h4>
                          <div className="flex flex-col gap-1">
                            <p className="font-medium">{activeReport.targetUsername}</p>
                            {targetProfile && (
                              <Link href={`/profile/${targetProfile.sequentialId}`}>
                                <Button variant="link" size="sm" className="h-auto p-0 text-[10px] text-primary uppercase font-bold tracking-widest">View Profile</Button>
                              </Link>
                            )}
                          </div>
                        </div>
                        <div className="space-y-1">
                          <h4 className="text-[10px] font-headline font-bold text-muted-foreground uppercase tracking-widest">Reporter</h4>
                          <div className="flex flex-col gap-1">
                            <p className="font-medium">{activeReport.reporterUsername}</p>
                            {reporterProfile && (
                              <Link href={`/profile/${reporterProfile.sequentialId}`}>
                                <Button variant="link" size="sm" className="h-auto p-0 text-[10px] text-primary uppercase font-bold tracking-widest">View Profile</Button>
                              </Link>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="space-y-4 pt-4 border-t border-border/50">
                        <h4 className="text-[10px] font-headline font-bold text-muted-foreground uppercase tracking-widest">Set Status</h4>
                        <div className="grid grid-cols-3 gap-2">
                          <Button 
                            variant={activeReport.status === 'solved' ? "default" : "outline"}
                            size="sm"
                            className="font-headline text-[8px] font-bold uppercase tracking-widest gap-1"
                            onClick={() => handleUpdateReportStatus(activeReport.id, 'solved')}
                          >
                            <CheckCircle2 className="h-3 w-3" /> Solved
                          </Button>
                          <Button 
                            variant={activeReport.status === 'unsolved' ? "default" : "outline"}
                            size="sm"
                            className="font-headline text-[8px] font-bold uppercase tracking-widest gap-1"
                            onClick={() => handleUpdateReportStatus(activeReport.id, 'unsolved')}
                          >
                            <XCircle className="h-3 w-3" /> Unsolved
                          </Button>
                          <Button 
                            variant={activeReport.status === 'troll' ? "default" : "outline"}
                            size="sm"
                            className="font-headline text-[8px] font-bold uppercase tracking-widest gap-1"
                            onClick={() => handleUpdateReportStatus(activeReport.id, 'troll')}
                          >
                            <AlertTriangle className="h-3 w-3" /> Troll
                          </Button>
                        </div>
                      </div>

                      <div className="space-y-4 pt-4 border-t border-border/50">
                        <h4 className="text-[10px] font-headline font-bold text-muted-foreground uppercase tracking-widest">Moderation Actions</h4>
                        <div className="grid grid-cols-2 gap-2">
                          <Button variant="outline" className="opacity-50 cursor-not-allowed font-headline text-[8px] font-bold uppercase tracking-widest">
                            Warn
                          </Button>
                          <Button variant="outline" className="opacity-50 cursor-not-allowed font-headline text-[8px] font-bold uppercase tracking-widest">
                            Perm Ban
                          </Button>
                          <Button variant="outline" className="opacity-50 cursor-not-allowed font-headline text-[8px] font-bold uppercase tracking-widest">
                            Temp Ban (1D)
                          </Button>
                          <Button variant="outline" className="opacity-50 cursor-not-allowed font-headline text-[8px] font-bold uppercase tracking-widest">
                            Temp Ban (7D)
                          </Button>
                        </div>
                        <p className="text-[10px] text-muted-foreground italic text-center font-headline uppercase tracking-tighter opacity-50">Moderation actions are currently in development.</p>
                      </div>
                    </div>

                    <DialogFooter className="flex-col sm:flex-col gap-2">
                      <Button 
                        onClick={() => handleUnclaimReport(activeReport.id)}
                        variant="secondary"
                        className="w-full font-headline font-bold uppercase text-[10px] tracking-widest"
                      >
                        Unclaim Report
                      </Button>
                    </DialogFooter>
                  </>
                )}
              </DialogContent>
            </Dialog>
            
            {allReports?.length === 0 && (
              <div className="text-center py-24 space-y-4 bg-muted/10 rounded-3xl border border-dashed border-border">
                <ShieldCheck className="h-12 w-12 text-muted-foreground mx-auto opacity-20" />
                <p className="text-muted-foreground font-headline text-[10px] uppercase tracking-[0.2em] italic">The terminal is quiet. No reports to review.</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </main>
  )
}
