'use client';

import * as React from 'react';
import Link from 'next/link';
import { Bell, Loader2 } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/use-auth';
import { db } from '@/lib/firebase';
import { collection, query, where, onSnapshot, orderBy, writeBatch, doc } from 'firebase/firestore';
import type { Notification } from '@/lib/types';
import { formatDistanceToNow } from 'date-fns';
import { id as indonesianLocale } from 'date-fns/locale';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

export function NotificationSheet() {
  const { user } = useAuth();
  const [notifications, setNotifications] = React.useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = React.useState(0);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSheetOpen, setIsSheetOpen] = React.useState(false);

  React.useEffect(() => {
    if (!user) {
      setIsLoading(false);
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    setIsLoading(true);
    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const newNotifications = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Notification[];
      setNotifications(newNotifications);
      setUnreadCount(newNotifications.filter(n => !n.isRead).length);
      setIsLoading(false);
    }, (error) => {
      console.error("Failed to fetch notifications:", error);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const handleOpenSheet = async () => {
    setIsSheetOpen(true);
    if (unreadCount > 0) {
      // Mark all as read
      const unreadNotifications = notifications.filter(n => !n.isRead);
      const batch = writeBatch(db);
      unreadNotifications.forEach(n => {
        const docRef = doc(db, 'notifications', n.id);
        batch.update(docRef, { isRead: true });
      });
      try {
        await batch.commit();
      } catch (error) {
        console.error("Failed to mark notifications as read:", error);
      }
    }
  };

  return (
    <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" onClick={handleOpenSheet}>
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute top-1.5 right-1.5 flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-destructive"></span>
            </span>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent className="flex flex-col h-full p-0">
        <SheetHeader className="p-4 border-b">
          <SheetTitle>Notifikasi</SheetTitle>
          <SheetDescription>Pembaruan terbaru dari proyek Anda.</SheetDescription>
        </SheetHeader>
        <ScrollArea className="flex-1">
          {isLoading ? (
            <div className="flex items-center justify-center p-10">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : notifications.length > 0 ? (
            <ul className="divide-y">
              {notifications.map(notification => (
                <li key={notification.id}>
                  <Link href={`/proyek/${notification.projectId}?openObservation=${notification.observationId}`} onClick={() => setIsSheetOpen(false)} className={cn(
                    "block p-4 hover:bg-muted/50 transition-colors",
                    !notification.isRead && "bg-primary/5"
                  )}>
                    <p className="text-sm font-medium">{notification.message}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true, locale: indonesianLocale })}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <div className="text-center p-10 text-muted-foreground">
              <p>Anda belum memiliki notifikasi.</p>
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
