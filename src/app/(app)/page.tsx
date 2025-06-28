'use client';

import * as React from 'react';
import { useObservations } from '@/contexts/observation-context';
import type { Observation, RiskLevel } from '@/lib/types';
import { RiskBadge, StatusBadge } from '@/components/status-badges';
import { format, isToday, isYesterday, subDays, addDays } from 'date-fns';
import { id as indonesianLocale } from 'date-fns/locale';
import { FileText, ChevronRight, ChevronLeft, Calendar as CalendarIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import { ObservationDetailSheet } from '@/components/observation-detail-sheet';
import { StarRating } from '@/components/star-rating';

const riskColorMap: Record<RiskLevel, string> = {
  Critical: 'bg-destructive',
  High: 'bg-chart-5',
  Medium: 'bg-chart-4',
  Low: 'bg-chart-2',
};

const ObservationListItem = ({ observation, onSelect }: { observation: Observation, onSelect: () => void }) => {
  const riskColor = riskColorMap[observation.riskLevel] || 'bg-muted';
  
  return (
    <li>
      <div onClick={onSelect} className="relative flex items-center bg-card p-4 pl-6 rounded-lg shadow-sm hover:bg-muted/50 transition-colors cursor-pointer overflow-hidden">
        <div className={cn("absolute left-0 top-0 h-full w-2", riskColor)} />
        
        {observation.aiStatus === 'completed' && typeof observation.aiObserverSkillRating === 'number' && (
          <div className="absolute top-2 right-2" title={`Observer Rating: ${observation.aiObserverSkillRating}/5`}>
            <StarRating rating={observation.aiObserverSkillRating} starClassName="h-3 w-3" />
          </div>
        )}

        <div className="flex-1 space-y-2 pr-4">
          <p className="text-xs text-muted-foreground">
            <span className="font-semibold text-foreground">{format(new Date(observation.date), 'HH:mm')}</span> - {observation.category}
          </p>
          <p className="font-semibold leading-snug line-clamp-2">{observation.findings}</p>
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <StatusBadge status={observation.status} />
            <RiskBadge riskLevel={observation.riskLevel} />
            <span className="text-xs text-muted-foreground">{observation.company}</span>
          </div>
        </div>
        <div className="ml-auto flex items-center pl-2">
          <ChevronRight className="h-6 w-6 text-muted-foreground" />
        </div>
      </div>
    </li>
  );
};

export default function JurnalPage() {
  const { observations, loading } = useObservations();
  const [selectedDate, setSelectedDate] = React.useState<Date | undefined>(new Date());
  const [selectedObservation, setSelectedObservation] = React.useState<Observation | null>(null);
  const [isCalendarOpen, setCalendarOpen] = React.useState(false);

  const handlePreviousDay = () => {
    if (selectedDate) {
      setSelectedDate(subDays(selectedDate, 1));
    }
  };

  const handleNextDay = () => {
    if (selectedDate && !isToday(selectedDate)) {
       setSelectedDate(addDays(selectedDate, 1));
    }
  };

  const filteredObservations = React.useMemo(() => {
    if (!selectedDate) return [];
    
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
    if (isToday(date)) return `Hari ini, ${format(date, "eeee, d MMMM yyyy", { locale: indonesianLocale })}`;
    if (isYesterday(date)) return `Kemarin, ${format(date, "eeee, d MMMM yyyy", { locale: indonesianLocale })}`;
    return format(date, "eeee, d MMMM yyyy", { locale: indonesianLocale });
  };


  return (
    <>
     <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <h2 className="text-2xl font-bold tracking-tight">
          Jurnal Observasi
        </h2>
        <div className="flex items-center gap-1 border rounded-lg p-1 bg-card shadow-sm w-full sm:w-auto">
            <Button variant="ghost" size="icon" onClick={handlePreviousDay} className="h-9 w-9 flex-shrink-0" aria-label="Previous Day">
              <ChevronLeft className="h-5 w-5" />
            </Button>
            
            <Dialog open={isCalendarOpen} onOpenChange={setCalendarOpen}>
              <DialogTrigger asChild>
                <Button
                  variant={"ghost"}
                  className="h-9 flex-1 px-2 text-center font-semibold text-sm whitespace-nowrap"
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {selectedDate ? formatDateDisplay(selectedDate) : <span>Pilih tanggal</span>}
                </Button>
              </DialogTrigger>
              <DialogContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => {
                    setSelectedDate(date);
                    setCalendarOpen(false);
                  }}
                  initialFocus
                />
              </DialogContent>
            </Dialog>

            <Button variant="ghost" size="icon" onClick={handleNextDay} disabled={isToday(selectedDate || new Date())} className="h-9 w-9 flex-shrink-0" aria-label="Next Day">
              <ChevronRight className="h-5 w-5" />
            </Button>
        </div>
      </div>
      
      <main>
        {loading ? (
          <ul className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <li key={i}>
                <div className="flex items-center bg-card p-4 rounded-lg shadow-sm h-[118px]">
                  <div className="flex-1 space-y-3">
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
              <ObservationListItem key={obs.id} observation={obs} onSelect={() => setSelectedObservation(obs)} />
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
    {selectedObservation && (
        <ObservationDetailSheet 
            observation={selectedObservation}
            isOpen={!!selectedObservation}
            onOpenChange={(isOpen) => {
                if (!isOpen) {
                    setSelectedObservation(null);
                }
            }}
        />
    )}
   </>
  );
}
