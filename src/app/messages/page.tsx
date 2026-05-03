
"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useUser, useFirestore, useCollection, useMemoFirebase, updateDocumentNonBlocking, deleteDocumentNonBlocking, useDoc } from "@/firebase"
import { NavigationBar } from "@/components/navigation-bar"
import { collection, query, where, orderBy, doc } from "firebase/firestore"
import { Mail, MailOpen, Loader2, ArrowLeft, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { format } from "date-fns"

export default function MessagesPage() {
  const { user, isUserLoading } = useUser()
  const db = useFirestore()
  const router = useRouter()
  const [selectedMessage, setSelectedMessage] = useState<any>(null)

  const userDocRef = useMemoFirebase(() => {
    if (!db || !user?.uid) return null
    return doc(db, "users", user.uid)
  }, [db, user?.uid])
  const { data: userData, isLoading: isUserDataLoading } = useDoc(userDocRef)

  const messagesQuery = useMemoFirebase(() => {
    // Only query if user is logged in and we have their record
    if (!db || !user?.uid || !userData) return null
    return query(
      collection(db, "messages"),
      where("receiverId", "==", user.uid),
      orderBy("timestamp", "desc")
    )
  }, [db, user?.uid, userData])

  const { data: messages, isLoading: isMessagesLoading } = useCollection(messagesQuery)

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push("/login")
    }
  }, [user, isUserLoading, router])

  const handleReadMessage = (message: any) => {
    setSelectedMessage(message)
    if (!message.isRead && db) {
      const messageRef = doc(db, "messages", message.id)
      updateDocumentNonBlocking(messageRef, { isRead: true })
    }
  }

  const handleDeleteMessage = (messageId: string) => {
    if (!db) return
    const messageRef = doc(db, "messages", messageId)
    deleteDocumentNonBlocking(messageRef)
    
    if (selectedMessage?.id === messageId) {
      setSelectedMessage(null)
    }
  }

  if (isUserLoading || isUserDataLoading || (userData && isMessagesLoading)) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <main className="min-h-screen bg-background w-full pt-20">
      <NavigationBar />
      
      <div className="max-w-6xl mx-auto px-6 py-8 grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-1 space-y-4">
          <div className="flex items-center gap-4 mb-6">
            <Link href="/home">
              <Button variant="ghost" size="icon" className="rounded-full">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <h1 className="text-3xl font-headline font-bold">Messages</h1>
          </div>

          <div className="space-y-2 overflow-y-auto max-h-[70vh] pr-2">
            {messages?.length === 0 && (
              <div className="text-center py-10 text-muted-foreground font-headline">
                No messages yet.
              </div>
            )}
            {messages?.map((msg) => (
              <div
                key={msg.id}
                onClick={() => handleReadMessage(msg)}
                className={`p-4 rounded-xl border transition-all cursor-pointer ${
                  selectedMessage?.id === msg.id 
                    ? "bg-primary/10 border-primary" 
                    : msg.isRead 
                    ? "bg-card border-border" 
                    : "bg-card border-primary/40 shadow-sm"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <h3 className={`font-bold truncate ${!msg.isRead ? "text-primary" : "text-foreground"}`}>
                      {msg.subject}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      {msg.timestamp ? format(new Date(msg.timestamp), "MMM d, h:mm a") : ""}
                    </p>
                  </div>
                  {!msg.isRead ? (
                    <Mail className="h-4 w-4 text-primary shrink-0" />
                  ) : (
                    <MailOpen className="h-4 w-4 text-muted-foreground shrink-0" />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="md:col-span-2">
          {selectedMessage ? (
            <div className="bg-card border border-border rounded-2xl p-8 space-y-6 animate-fade-in h-full flex flex-col">
              <div className="flex justify-between items-start border-b border-border pb-6">
                <div>
                  <h2 className="text-2xl font-headline font-bold text-primary mb-2">
                    {selectedMessage.subject}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    From: System Administrator
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Received: {selectedMessage.timestamp ? format(new Date(selectedMessage.timestamp), "MMMM do yyyy, h:mm a") : ""}
                  </p>
                </div>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="text-muted-foreground hover:text-destructive"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteMessage(selectedMessage.id);
                  }}
                >
                  <Trash2 className="h-5 w-5" />
                </Button>
              </div>
              
              <div className="flex-1 text-lg leading-relaxed whitespace-pre-wrap font-body">
                {selectedMessage.content}
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-muted-foreground bg-card/50 border border-dashed border-border rounded-2xl p-12">
              <Mail className="h-12 w-12 mb-4 opacity-20" />
              <p className="font-headline">Select a message to read</p>
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
