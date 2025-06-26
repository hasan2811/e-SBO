'use client';

import * as React from 'react';
import Link from 'next/link';
import { useObservations } from '@/contexts/observation-context';
import type { Observation } from '@/lib/types';
import { RiskBadge } from '@/components/status-badges';
import { format, subDays, addDays, isToday, isYesterday } from 'date-fns';
import { id } from 'date-fns/locale';
import { FileText, ChevronRight, ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

const ObservationListItem = ({ observation }: { observation: Observation }) => {
  return (
    <li>
      <Link href={`/observation/${observation.id}`} className="flex items-center bg-card p-4 rounded-lg shadow-sm hover:bg-muted/50 transition-colors cursor-pointer">
        <div className="flex-1 space-y-1 pr-4">
          <p className="text-xs text-muted-foreground">
            <span className="font-semibold text-foreground">{format(new Date(observation.date), 'HH:mm')}</span> - {observation.category}
          </p>
          <p className="font-semibold leading-snug line-clamp-2">{observation.findings}</p>
          <div className="flex items-center gap-2 pt-1">
            <RiskBadge riskLevel={observation.riskLevel} />
            <span className="text-xs text-muted-foreground">{observation.company}</span>
          </div>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <div className="hidden sm:flex items-center justify-center h-12 w-12 rounded-full bg-primary/10">
            <FileText className="h-6 w-6 text-primary" />
          </div>
          <ChevronRight className="h-6 w-6 text-muted-foreground" />
        </div>
      </Link>
    </li>
  );
};

export default function JurnalPage() {
  const { observations, loading } = useObservations();
  const [selectedDate, setSelectedDate] = React.useState<Date>(new Date());

  const handlePreviousDay = () => {
    setSelectedDate(subDays(selectedDate, 1));
  };

  const handleNextDay = () => {
    if (!isToday(selectedDate)) {
       setSelectedDate(addDays(selectedDate, 1));
    }
  };

  const filteredObservations = React.useMemo(() => {
    if (!selectedDate) {
      return [];
    }
    const startOfDay = new Date(selectedDate);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(selectedDate);
    endOfDay.setHours(23, 59, 59, 999);

    return observations.filter(obs => {
      const obsDate = new Date(obs.date);
      return obsDate >= startOfDay && obsDate <= endOfDay;
    });
  }, [observations, selectedDate]);
  
  const formatDateDisplay = (date: Date): string => {
    const dayAndDateString = format(date, "eeee, d MMMM yyyy", { locale: id });
    if (isToday(date)) return `Hari ini, ${dayAndDateString}`;
    if (isYesterday(date)) return `Kemarin, ${dayAndDateString}`;
    return dayAndDateString;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <h2 className="text-2xl font-bold tracking-tight">
          Jurnal Observasi
        </h2>
        <div className="flex items-center gap-1 border rounded-lg p-1 bg-card shadow-sm w-full sm:w-auto">
            <Button variant="ghost" size="icon" onClick={handlePreviousDay} className="h-9 w-9 flex-shrink-0" aria-label="Previous Day">
              <ChevronLeft className="h-5 w-5" />
            </Button>
            
            <div
              className="flex items-center justify-center h-9 w-full flex-1 px-2 text-center font-semibold text-sm whitespace-nowrap"
            >
              {formatDateDisplay(selectedDate)}
            </div>

            <Button variant="ghost" size="icon" onClick={handleNextDay} disabled={isToday(selectedDate)} className="h-9 w-9 flex-shrink-0" aria-label="Next Day">
              <ChevronRight className="h-5 w-5" />
            </Button>
        </div>
      </div>
      
      <main>
        {loading ? (
          <ul className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <li key={i}>
                <div className="flex items-center bg-card p-4 rounded-lg shadow-sm">
                  <div className="flex-1 space-y-2 pr-4">
                    <Skeleton className="h-4 w-1/3" />
                    <Skeleton className="h-5 w-full" />
                    <Skeleton className="h-5 w-2/3" />
                  </div>
                   <div className="hidden sm:block">
                     <Skeleton className="h-12 w-12 rounded-full" />
                   </div>
                </div>
              </li>
            ))}
          </ul>
        ) : filteredObservations.length > 0 ? (
          <ul className="space-y-3">
            {filteredObservations.map(obs => (
              <ObservationListItem key={obs.id} observation={obs} />
            ))}
          </ul>
        ) : (
          <div className="text-center py-16 text-muted-foreground bg-card rounded-lg">
            <FileText className="mx-auto h-12 w-12" />
            <h3 className="mt-4 text-xl font-semibold">Tidak Ada Observasi</h3>
            <p className="mt-2 text-sm max-w-xs mx-auto">Tidak ada data observasi untuk tanggal yang dipilih. Silakan pilih tanggal lain.</p>
          </div>
        )}
      </main>
    </div>
  );
}
