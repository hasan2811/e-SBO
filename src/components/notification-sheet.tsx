
'use client';

import * as React from 'react';
import Link from 'next/link';
import { Bell, Loader2, ClipboardList, Wrench, FileSignature, BellRing } from 'lucide-react';
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
import type { Notification, AllItems } from '@/lib/types';
import { formatDistanceToNow } from 'date-fns';
import { id as indonesianLocale } from 'date-fns/locale';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';

const NotificationIcon = ({ itemType }: { itemType: AllItems['itemType'] }) => {
  const icons: Record<AllItems['itemType'], React.ReactElement> = {
    observation: <ClipboardList className="h-5 w-5" />,
    inspection: <Wrench className="h-5 w-5" />,
    ptw: <FileSignature className="h-5 w-5" />,
  };
  const colors: Record<AllItems['itemType'], string> = {
    observation: 'text-primary bg-primary/10',
    inspection: 'text-chart-2 bg-chart-2/10',
    ptw: 'text-chart-5 bg-chart-5/10',
  }
  return (
    <div className={cn("h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0", colors[itemType] || 'text-muted-foreground bg-muted')}>
      {icons[itemType] || <Bell className="h-5 w-5" />}
    </div>
  );
};


export function NotificationSheet() {
  const { user } = useAuth();
  const router = useRouter();
  const [notifications, setNotifications] = React.useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = React.useState(0);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSheetOpen, setIsSheetOpen] = React.useState(false);

  const pathMap: Record<AllItems['itemType'], string> = {
    observation: 'observasi',
    inspection: 'inspeksi',
    ptw: 'ptw',
  };

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
    const pathSegment = pathMap[notification.itemType] || 'observasi';
    return `/proyek/${notification.projectId}/${pathSegment}?openItem=${notification.itemId}`;
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
            <span className="absolute top-1.5 right-1.5 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-destructive p-1 text-[10px] font-bold leading-none text-destructive-foreground">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent className="flex flex-col h-full p-0">
        <SheetHeader className="p-6 pb-4 border-b">
          <SheetTitle>Notifikasi</SheetTitle>
          <SheetDescription>Pembaruan terbaru dari proyek Anda.</SheetDescription>
        </SheetHeader>
        <ScrollArea className="flex-1">
          {isLoading ? (
            <div className="flex items-center justify-center p-10">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : notifications.length > 0 ? (
            <div className="divide-y">
              {notifications.map(notification => (
                <Link 
                    key={notification.id}
                    href={getLinkForItem(notification)}
                    onClick={(e) => handleNotificationClick(e, notification)}
                    className={cn(
                      "flex items-start gap-4 p-4 hover:bg-muted/50 transition-colors",
                      !notification.isRead && "bg-primary/5"
                  )}>
                    <NotificationIcon itemType={notification.itemType} />
                    <div className="flex-1 space-y-1">
                        <p className="text-sm font-medium leading-snug">{notification.message}</p>
                        <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true, locale: indonesianLocale })}
                        </p>
                    </div>
                    {!notification.isRead && (
                        <div className="h-2.5 w-2.5 rounded-full bg-primary mt-1 flex-shrink-0" />
                    )}
                  </Link>
              ))}
            </div>
          ) : (
            <div className="text-center p-10 text-muted-foreground flex flex-col items-center justify-center h-full">
                <BellRing className="h-12 w-12 mb-4" />
                <h3 className="font-semibold text-lg text-foreground">Semua sudah terbaca</h3>
                <p className="text-sm mt-1">Anda akan melihat notifikasi baru di sini.</p>
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
