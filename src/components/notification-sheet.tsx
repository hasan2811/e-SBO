
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
import { useRouter } from 'next/navigation';

export function NotificationSheet() {
  const { user } = useAuth();
  const router = useRouter();
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
  
  const getLinkForItem = (notification: Notification) => {
      const pluralType = `${notification.itemType}s`;
      return `/proyek/${notification.projectId}/${pluralType}?openItem=${notification.itemId}`;
  }

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
  
  const handleNotificationClick = (e: React.MouseEvent, notification: Notification) => {
      e.preventDefault();
      setIsSheetOpen(false);
      const link = getLinkForItem(notification);
      // Timeout to allow sheet to close before navigating
      setTimeout(() => {
        router.push(link);
      }, 150);
  }

  return (
    <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" onClick={handleOpenSheet}>
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute top-1.5 right-1.5 flex h-4 w-4">
              <span className={cn(
                  "absolute -top-1 -right-1 inline-flex items-center justify-center px-1.5 py-0.5 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-destructive rounded-full",
                  unreadCount > 9 && "px-1" // Adjust padding for double digits
              )}>
                  {unreadCount > 99 ? '99+' : unreadCount}
              </span>
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
                  <Link 
                    href={getLinkForItem(notification)}
                    onClick={(e) => handleNotificationClick(e, notification)}
                    className={cn(
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
