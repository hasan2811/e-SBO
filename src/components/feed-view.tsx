
'use client';

import * as React from 'react';
import Image from 'next/image';
import { useObservations } from '@/contexts/observation-context';
import type { AllItems, Observation, Inspection, Ptw } from '@/lib/types';
import { RISK_LEVELS, OBSERVATION_STATUSES, OBSERVATION_CATEGORIES } from '@/lib/types';
import { RiskBadge, StatusBadge, InspectionStatusBadge, PtwStatusBadge } from '@/components/status-badges';
import { format } from 'date-fns';
import { FileText, ChevronRight, Home, Download, Wrench, FileSignature as PtwIcon, ChevronDown, Sparkles, Loader2, FilterX, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ObservationDetailSheet } from '@/components/observation-detail-sheet';
import { InspectionDetailSheet } from '@/components/inspection-detail-sheet';
import { PtwDetailSheet } from '@/components/ptw-detail-sheet';
import { StarRating } from '@/components/star-rating';
import { useAuth } from '@/hooks/use-auth';
import { exportToExcel } from '@/lib/export';
import { useToast } from '@/hooks/use-toast';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Label } from '@/components/ui/label';

const ObservationListItem = ({ observation, onSelect }: { observation: Observation, onSelect: () => void }) => {
    return (
      <li>
        <div onClick={onSelect} className="flex items-center gap-4 bg-card p-4 rounded-lg shadow-sm hover:bg-muted/50 transition-colors cursor-pointer overflow-hidden">
          {observation.photoUrl && (
            <div className="relative h-24 w-24 flex-shrink-0 rounded-md overflow-hidden border">
              <Image src={observation.photoUrl} alt={observation.findings} fill sizes="96px" className="object-cover" data-ai-hint="site observation" />
              {observation.aiStatus === 'processing' && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <Loader2 className="h-5 w-5 animate-spin text-white" />
                  </div>
              )}
               {observation.aiStatus === 'completed' && (
                  <div className="absolute bottom-1 right-1 bg-primary/80 backdrop-blur-sm rounded-full p-1">
                      <Sparkles className="h-3 w-3 text-primary-foreground" />
                  </div>
              )}
            </div>
          )}
  
          <div className="flex-1 space-y-2 self-start">
            <div className="flex justify-between items-start">
                <p className="text-xs text-muted-foreground">
                    <span className="font-semibold text-foreground">{format(new Date(observation.date), 'd MMM yyyy, HH:mm')}</span> - {observation.category}
                </p>
                {observation.aiStatus === 'completed' && typeof observation.aiObserverSkillRating === 'number' && (
                    <div title={`Observer Rating: ${observation.aiObserverSkillRating}/5`}>
                        <StarRating rating={observation.aiObserverSkillRating} starClassName="h-3 w-3" />
                    </div>
                )}
            </div>
            <p className="font-semibold leading-snug line-clamp-2">{observation.findings}</p>
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <StatusBadge status={observation.status} />
              <RiskBadge riskLevel={observation.riskLevel} />
              <span className="text-xs text-muted-foreground">{observation.company}</span>
            </div>
          </div>
        </div>
      </li>
    );
  };

const InspectionListItem = ({ inspection, onSelect }: { inspection: Inspection, onSelect: () => void }) => {
  return (
    <li>
      <div onClick={onSelect} className="flex items-center gap-4 bg-card p-4 rounded-lg shadow-sm hover:bg-muted/50 transition-colors cursor-pointer overflow-hidden">
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
            <span className="font-semibold text-foreground">{format(new Date(inspection.date), 'd MMM yyyy, HH:mm')}</span> - {inspection.equipmentType}
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
          <span className="font-semibold text-foreground">{format(new Date(ptw.date), 'd MMM yyyy, HH:mm')}</span> - {ptw.contractor}
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

interface FeedViewProps {
  mode: 'public' | 'personal';
}

export function FeedView({ mode }: FeedViewProps) {
  const { allItems, loading } = useObservations();
  const { user } = useAuth();
  
  const [selectedObservationId, setSelectedObservationId] = React.useState<string | null>(null);
  const [selectedInspectionId, setSelectedInspectionId] = React.useState<string | null>(null);
  const [selectedPtwId, setSelectedPtwId] = React.useState<string | null>(null);
  
  const [viewType, setViewType] = React.useState<'observations' | 'inspections' | 'ptws'>('observations');
  
  // Filters for observations
  const [statusFilter, setStatusFilter] = React.useState('all');
  const [riskFilter, setRiskFilter] = React.useState('all');
  const [categoryFilter, setCategoryFilter] = React.useState('all');
  
  const { toast } = useToast();

  const titlePrefix = mode === 'personal' ? 'Proyek Saya' : 'Publik';

  const viewConfig = {
    observations: { label: 'Observasi', icon: Home },
    inspections: { label: 'Inspeksi', icon: Wrench },
    ptws: { label: 'PTW', icon: PtwIcon },
  };

  const pageTitle = `${titlePrefix}: ${viewConfig[viewType].label}`;
  
  const clearFilters = () => {
    setStatusFilter('all');
    setRiskFilter('all');
    setCategoryFilter('all');
  };

  const filteredData = React.useMemo(() => {
    if (mode === 'personal' && !user) return [];

    let data: AllItems[] = allItems;
    
    if (mode === 'personal' && user) {
        data = data.filter(item => item.scope === 'private' && item.userId === user.uid);
    } else {
        data = data.filter(item => item.scope === 'public');
    }
    
    if (viewType === 'observations') {
        let observationData = data.filter((item): item is Observation & { itemType: 'observation' } => item.itemType === 'observation');
        if (statusFilter !== 'all') {
            observationData = observationData.filter(obs => obs.status === statusFilter);
        }
        if (riskFilter !== 'all') {
            observationData = observationData.filter(obs => obs.riskLevel === riskFilter);
        }
        if (categoryFilter !== 'all') {
            observationData = observationData.filter(obs => obs.category === categoryFilter);
        }
        return observationData;
    }
    if (viewType === 'inspections') {
      return data.filter((item): item is Inspection & { itemType: 'inspection' } => item.itemType === 'inspection');
    }
    if (viewType === 'ptws') {
      return data.filter((item): item is Ptw & { itemType: 'ptw' } => item.itemType === 'ptw');
    }
    
    return [];
  }, [allItems, user, mode, viewType, statusFilter, riskFilter, categoryFilter]);

  const displayObservation = React.useMemo(() => 
    selectedObservationId ? allItems.find(o => o.id === selectedObservationId) as Observation : null,
    [selectedObservationId, allItems]
  );
  
  const displayInspection = React.useMemo(() =>
    selectedInspectionId ? allItems.find(i => i.id === selectedInspectionId) as Inspection : null,
    [selectedInspectionId, allItems]
  );
  
  const displayPtw = React.useMemo(() =>
    selectedPtwId ? allItems.find(p => p.id === selectedPtwId) as Ptw : null,
    [selectedPtwId, allItems]
  );

  const handleExport = () => {
    const dataToExport = filteredData;
    if (viewType !== 'observations') {
      toast({ title: 'Fitur Dalam Pengembangan', description: 'Ekspor untuk tipe data ini akan segera hadir.' });
      return;
    }
    if (dataToExport.length === 0) {
      toast({
        variant: 'destructive',
        title: 'Tidak Ada Data untuk Diekspor',
        description: `Tidak ada data observasi untuk diekspor.`,
      });
      return;
    }
    const fileName = `${titlePrefix}_Observasi_${format(new Date(), 'yyyy-MM-dd')}`;
    exportToExcel(dataToExport as Observation[], fileName);
  };
  
  const areFiltersActive = statusFilter !== 'all' || riskFilter !== 'all' || categoryFilter !== 'all';

  const EmptyState = () => {
    const config = viewConfig[viewType];
    const emptyText = mode === 'personal' 
        ? `Anda belum membuat ${config.label.toLowerCase()} pribadi.`
        : `Tidak ada ${config.label.toLowerCase()} publik yang tersedia.`
    
    const filterText = `Tidak ada ${config.label.toLowerCase()} yang cocok dengan filter Anda.`;

    return (
      <div className="text-center py-16 text-muted-foreground bg-card rounded-lg">
        {areFiltersActive ? <FilterX className="mx-auto h-12 w-12" /> : React.createElement(config.icon, { className: "mx-auto h-12 w-12" })}
        <h3 className="mt-4 text-xl font-semibold">{areFiltersActive ? 'Tidak Ada Hasil' : 'Tidak Ada Laporan'}</h3>
        <p className="mt-2 text-sm max-w-xs mx-auto">{areFiltersActive ? filterText : emptyText}</p>
         {areFiltersActive && <Button variant="default" className="mt-6" onClick={clearFilters}><FilterX className="mr-2 h-4 w-4"/>Hapus Filter</Button>}
      </div>
    )
  };

  return (
    <>
     <div className="space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="text-2xl font-bold tracking-tight -ml-2 p-2 h-auto text-left">
                  {pageTitle}
                  <ChevronDown className="h-6 w-6 ml-2" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuItem onSelect={() => setViewType('observations')}>{viewConfig.observations.label}</DropdownMenuItem>
                <DropdownMenuItem onSelect={() => setViewType('inspections')}>{viewConfig.inspections.label}</DropdownMenuItem>
                <DropdownMenuItem onSelect={() => setViewType('ptws')}>{viewConfig.ptws.label}</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            
            <div className="flex items-center gap-2 self-end sm:self-center">
                {viewType === 'observations' && (
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button variant="outline" size="sm" className="relative">
                                <Filter className="mr-2 h-4 w-4" />
                                Filter
                                {areFiltersActive && (
                                    <span className="absolute -top-1 -right-1 flex h-3 w-3">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-3 w-3 bg-primary"></span>
                                    </span>
                                )}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-80" align="end">
                            <div className="space-y-4">
                                <div className="space-y-1">
                                    <h4 className="font-medium leading-none">Filter Observasi</h4>
                                    <p className="text-sm text-muted-foreground">
                                        Persempit hasil berdasarkan kriteria.
                                    </p>
                                </div>
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <Label>Status</Label>
                                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                                            <SelectTrigger><SelectValue placeholder="Pilih status" /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all">Semua Status</SelectItem>
                                                {OBSERVATION_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Tingkat Risiko</Label>
                                        <Select value={riskFilter} onValueChange={setRiskFilter}>
                                            <SelectTrigger><SelectValue placeholder="Pilih risiko" /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all">Semua Risiko</SelectItem>
                                                {RISK_LEVELS.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Kategori</Label>
                                        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                                            <SelectTrigger><SelectValue placeholder="Pilih kategori" /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all">Semua Kategori</SelectItem>
                                                {OBSERVATION_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                                {areFiltersActive && (
                                    <Button variant="ghost" onClick={clearFilters} disabled={!areFiltersActive} className="w-full justify-center mt-4">
                                        <FilterX className="mr-2 h-4 w-4" />
                                        Hapus Filter
                                    </Button>
                                )}
                            </div>
                        </PopoverContent>
                    </Popover>
                )}
                <Button variant="outline" size="sm" onClick={handleExport} disabled={filteredData.length === 0 || loading}>
                  <Download className="mr-2 h-4 w-4" />
                  Export
              </Button>
            </div>
        </div>

      <main>
        {loading ? (
          <ul className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <li key={i}>
                <div className="flex items-center bg-card p-4 rounded-lg shadow-sm h-[120px]">
                  <Skeleton className="h-24 w-24 rounded-md" />
                  <div className="flex-1 space-y-3 ml-4"><Skeleton className="h-4 w-1/3" /><Skeleton className="h-5 w-full" /><Skeleton className="h-5 w-2/3" /></div>
                </div>
              </li>
            ))}
          </ul>
        ) : filteredData.length > 0 ? (
          <ul className="space-y-3">
             {filteredData.map(item => {
                switch(item.itemType) {
                  case 'observation':
                    return <ObservationListItem key={item.id} observation={item} onSelect={() => setSelectedObservationId(item.id)} />;
                  case 'inspection':
                    return <InspectionListItem key={item.id} inspection={item} onSelect={() => setSelectedInspectionId(item.id)} />;
                  case 'ptw':
                    return <PtwListItem key={item.id} ptw={item} onSelect={() => setSelectedPtwId(item.id)} />;
                  default:
                    return null;
                }
             })}
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
            onOpenChange={(isOpen) => { if (!isOpen) setSelectedObservationId(null); }}
        />
    )}
    {displayInspection && (
        <InspectionDetailSheet 
            inspection={displayInspection}
            isOpen={!!displayInspection}
            onOpenChange={(isOpen) => { if (!isOpen) setSelectedInspectionId(null); }}
        />
    )}
    {displayPtw && (
        <PtwDetailSheet 
            ptw={displayPtw}
            isOpen={!!displayPtw}
            onOpenChange={(isOpen) => { if (!isOpen) setSelectedPtwId(null); }}
        />
    )}
   </>
  );
}
