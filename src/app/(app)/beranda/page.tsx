
'use client';

import * as React from 'react';
import Image from 'next/image';
import { useObservations } from '@/contexts/observation-context';
import type { Observation, RiskLevel, Inspection, Ptw, InspectionStatus } from '@/lib/types';
import { RiskBadge, StatusBadge, InspectionStatusBadge, PtwStatusBadge } from '@/components/status-badges';
import { format, isSameDay, subDays, isToday, addDays } from 'date-fns';
import { id as indonesianLocale } from 'date-fns/locale';
import { FileText, ChevronRight, ChevronLeft, Home, Download, Wrench, FileSignature as PtwIcon, ChevronDown, Sparkles, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { ObservationDetailSheet } from '@/components/observation-detail-sheet';
import { InspectionDetailSheet } from '@/components/inspection-detail-sheet';
import { PtwDetailSheet } from '@/components/ptw-detail-sheet';
import { StarRating } from '@/components/star-rating';
import { useAuth } from '@/hooks/use-auth';
import { exportToExcel } from '@/lib/export';
import { useToast } from '@/hooks/use-toast';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';


const riskColorMap: Record<RiskLevel, string> = {
  Critical: 'bg-destructive',
  High: 'bg-chart-5',
  Medium: 'bg-chart-4',
  Low: 'bg-chart-2',
};

const inspectionStatusColorMap: Record<InspectionStatus, string> = {
  'Pass': 'bg-chart-2',
  'Fail': 'bg-destructive',
  'Needs Repair': 'bg-chart-4',
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

const InspectionListItem = ({ inspection, onSelect }: { inspection: Inspection, onSelect: () => void }) => {
  const statusColor = inspectionStatusColorMap[inspection.status] || 'bg-muted';
  return (
    <li>
      <div onClick={onSelect} className="relative flex items-center gap-4 bg-card p-4 pl-6 rounded-lg shadow-sm hover:bg-muted/50 transition-colors cursor-pointer overflow-hidden">
        <div className={cn("absolute left-0 top-0 h-full w-2", statusColor)} />
        
        {inspection.photoUrl && (
          <div className="relative h-24 w-24 flex-shrink-0 rounded-md overflow-hidden border">
            <Image src={inspection.photoUrl} alt={inspection.equipmentName} fill sizes="96px" className="object-cover" data-ai-hint="equipment inspection" />
             {inspection.aiStatus === 'processing' && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <Loader2 className="h-5 w-5 animate-spin text-white" />
                </div>
            )}
             {inspection.aiStatus === 'completed' && (
                <div className="absolute bottom-1 right-1 bg-primary/80 backdrop-blur-sm rounded-full p-1">
                    <Sparkles className="h-3 w-3 text-primary-foreground" />
                </div>
            )}
          </div>
        )}
        
        <div className="flex-1 space-y-2 self-start">
          <p className="text-xs text-muted-foreground">
            <span className="font-semibold text-foreground">{format(new Date(inspection.date), 'HH:mm')}</span> - {inspection.equipmentType}
          </p>
          <p className="font-semibold leading-snug line-clamp-2">{inspection.equipmentName}</p>
          <p className="text-sm text-muted-foreground line-clamp-1">{inspection.findings}</p>
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <InspectionStatusBadge status={inspection.status} />
            <span className="text-xs text-muted-foreground">{inspection.location}</span>
          </div>
        </div>
      </div>
    </li>
  );
};

const PtwListItem = ({ ptw, onSelect }: { ptw: Ptw, onSelect: () => void }) => (
  <li>
    <div onClick={onSelect} className="relative flex items-center bg-card p-4 rounded-lg shadow-sm hover:bg-muted/50 transition-colors cursor-pointer overflow-hidden">
      <div className="flex-1 space-y-2 pr-4">
        <p className="text-xs text-muted-foreground">
          <span className="font-semibold text-foreground">{format(new Date(ptw.date), 'HH:mm')}</span> - {ptw.contractor}
        </p>
        <p className="font-semibold leading-snug line-clamp-2">{ptw.workDescription}</p>
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <PtwStatusBadge status={ptw.status} />
          <span className="text-xs text-muted-foreground">{ptw.location}</span>
        </div>
      </div>
      <div className="ml-auto flex items-center pl-2">
        <ChevronRight className="h-6 w-6 text-muted-foreground" />
      </div>
    </div>
  </li>
);

export default function BerandaPage() {
  const { observations, inspections, ptws, loading } = useObservations();
  const { user } = useAuth();
  const [selectedDate, setSelectedDate] = React.useState<Date | undefined>(new Date());
  
  const [selectedObservationId, setSelectedObservationId] = React.useState<string | null>(null);
  const [selectedInspectionId, setSelectedInspectionId] = React.useState<string | null>(null);
  const [selectedPtwId, setSelectedPtwId] = React.useState<string | null>(null);
  
  const [viewType, setViewType] = React.useState<'observations' | 'inspections' | 'ptws'>('observations');
  const { toast } = useToast();

  const displayObservation = React.useMemo(() => 
    selectedObservationId ? observations.find(o => o.id === selectedObservationId) ?? null : null,
    [selectedObservationId, observations]
  );
  
  const displayInspection = React.useMemo(() =>
    selectedInspectionId ? inspections.find(i => i.id === selectedInspectionId) ?? null : null,
    [selectedInspectionId, inspections]
  );
  
  const displayPtw = React.useMemo(() =>
    selectedPtwId ? ptws.find(p => p.id === selectedPtwId) ?? null : null,
    [selectedPtwId, ptws]
  );

  const viewConfig = {
    observations: { label: 'Beranda Observasi', icon: Home, data: observations },
    inspections: { label: 'Beranda Inspeksi', icon: Wrench, data: inspections },
    ptws: { label: 'Beranda PTW', icon: PtwIcon, data: ptws },
  };

  const filteredData = React.useMemo(() => {
    if (!selectedDate || !user) return [];
    
    const filterByDate = (item: { date: string }) => isSameDay(new Date(item.date), selectedDate);

    if (viewType === 'observations') {
       return observations
        .filter(obs => obs.userId === user.uid)
        .filter(filterByDate);
    }
    if (viewType === 'inspections') {
      return inspections.filter(insp => insp.userId === user.uid).filter(filterByDate);
    }
    if (viewType === 'ptws') {
      return ptws
        .filter(ptw => ptw.userId === user.uid)
        .filter(filterByDate);
    }
    return [];
  }, [observations, inspections, ptws, selectedDate, user, viewType]);
  
  const handlePrevDay = () => {
    if (selectedDate) {
      setSelectedDate(subDays(selectedDate, 1));
    }
  };

  const handleNextDay = () => {
    if (selectedDate && !(isToday(selectedDate) || selectedDate > new Date())) {
      setSelectedDate(addDays(selectedDate, 1));
    }
  };

  const isNextDayDisabled = selectedDate ? isToday(selectedDate) || selectedDate > new Date() : true;

  const dateButtonText = React.useMemo(() => {
    if (!selectedDate) return 'Pilih tanggal';

    const formattedDate = format(selectedDate, 'd MMMM yyyy', { locale: indonesianLocale });
    
    if (isToday(selectedDate)) {
      return `Hari ini, ${formattedDate}`;
    }
    if (isSameDay(selectedDate, subDays(new Date(), 1))) {
      return `Kemarin, ${formattedDate}`;
    }
    return format(selectedDate, 'EEEE, d MMMM yyyy', { locale: indonesianLocale });
  }, [selectedDate]);

  const handleExport = () => {
     if (viewType !== 'observations') {
      toast({ title: 'Fitur Dalam Pengembangan', description: 'Ekspor untuk tipe data ini akan segera hadir.' });
      return;
    }
    if (filteredData.length === 0) {
      toast({
        variant: 'destructive',
        title: 'Tidak Ada Data untuk Diekspor',
        description: 'Anda tidak memiliki laporan pribadi untuk tanggal yang dipilih.',
      });
      return;
    }
    const fileName = `Laporan_Pribadi_${format(selectedDate!, 'yyyy-MM-dd')}`;
    exportToExcel(filteredData as Observation[], fileName);
  };

  const EmptyState = () => {
    const config = viewConfig[viewType];
    return (
      <div className="text-center py-16 text-muted-foreground bg-card rounded-lg">
        {React.createElement(config.icon, { className: "mx-auto h-12 w-12" })}
        <h3 className="mt-4 text-xl font-semibold">Tidak Ada Laporan Pribadi</h3>
        <p className="mt-2 text-sm max-w-xs mx-auto">Anda belum menyimpan {config.label.replace('Beranda ', '').toLowerCase()} pribadi untuk tanggal ini.</p>
      </div>
    )
  };


  return (
    <>
     <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="text-2xl font-bold tracking-tight -ml-2 p-2 h-auto">
                  {viewConfig[viewType].label}
                  <ChevronDown className="h-6 w-6 ml-2" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuItem onSelect={() => setViewType('observations')}>{viewConfig.observations.label}</DropdownMenuItem>
                <DropdownMenuItem onSelect={() => setViewType('inspections')}>{viewConfig.inspections.label}</DropdownMenuItem>
                <DropdownMenuItem onSelect={() => setViewType('ptws')}>{viewConfig.ptws.label}</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          <Button variant="outline" size="sm" onClick={handleExport} disabled={filteredData.length === 0 || loading}>
              <Download className="mr-2 h-4 w-4" />
              Export
          </Button>
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="default" size="icon" className="h-9 w-9 shadow-sm" onClick={handlePrevDay}>
            <ChevronLeft className="h-5 w-5" />
          </Button>

          <div className="flex h-9 min-w-[240px] items-center justify-center rounded-md border border-primary/20 bg-primary/10 px-4 text-sm font-semibold text-primary shadow-sm">
            {dateButtonText}
          </div>
        
          <Button variant="default" size="icon" className="h-9 w-9 shadow-sm" onClick={handleNextDay} disabled={isNextDayDisabled}>
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>
      </div>

      <main>
        {loading ? (
          <ul className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
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
        ) : filteredData.length > 0 ? (
          <ul className="space-y-3">
             {viewType === 'observations' && filteredData.map(obs => (
              <ObservationListItem key={(obs as Observation).id} observation={obs as Observation} onSelect={() => setSelectedObservationId((obs as Observation).id)} />
            ))}
            {viewType === 'inspections' && filteredData.map(insp => (
              <InspectionListItem key={(insp as Inspection).id} inspection={insp as Inspection} onSelect={() => setSelectedInspectionId((insp as Inspection).id)} />
            ))}
            {viewType === 'ptws' && filteredData.map(ptw => (
              <PtwListItem key={(ptw as Ptw).id} ptw={ptw as Ptw} onSelect={() => setSelectedPtwId((ptw as Ptw).id)} />
            ))}
          </ul>
        ) : (
          <EmptyState />
        )}
      </main>
    </div>
    {displayObservation && (
        <ObservationDetailSheet 
            observation={displayObservation}
            isOpen={!!displayObservation}
            onOpenChange={(isOpen) => {
                if (!isOpen) {
                    setSelectedObservationId(null);
                }
            }}
        />
    )}
    {displayInspection && (
        <InspectionDetailSheet 
            inspection={displayInspection}
            isOpen={!!displayInspection}
            onOpenChange={(isOpen) => {
                if (!isOpen) {
                    setSelectedInspectionId(null);
                }
            }}
        />
    )}
    {displayPtw && (
        <PtwDetailSheet 
            ptw={displayPtw}
            isOpen={!!displayPtw}
            onOpenChange={(isOpen) => {
                if (!isOpen) {
                    setSelectedPtwId(null);
                }
            }}
        />
    )}
   </>
  );
}
