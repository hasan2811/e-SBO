
'use client';

import * as React from 'react';
import Image from 'next/image';
import dynamic from 'next/dynamic';
import type { AllItems, Observation, Inspection, Ptw, RiskLevel } from '@/lib/types';
import { PtwStatusBadge, InspectionStatusBadge } from '@/components/status-badges';
import { format } from 'date-fns';
import { Sparkles, Loader2, Search, Eye, X, ClipboardList, Wrench, FileSignature, SearchCheck, Clock, CheckCircle2, User, Trash2, MoreVertical, ListChecks, Filter, FileDown, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { usePathname, useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { useObservations } from '@/hooks/use-observations';
import { AnimatePresence, motion } from 'framer-motion';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from './ui/badge';
import { ListItemSkeleton } from './list-item-skeleton';
import { usePerformance } from '@/contexts/performance-context';
import { ObservationContext } from '@/contexts/observation-context';
import { Checkbox } from './ui/checkbox';
import { cn } from '@/lib/utils';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';
import { exportToExcel } from '@/lib/export';
import { RISK_LEVELS, OBSERVATION_STATUSES, INSPECTION_STATUSES, PTW_STATUSES } from '@/lib/types';


const ITEMS_PER_PAGE = 10;

// Lazy load detail sheets to reduce initial bundle size
const ObservationDetailSheet = dynamic(() => import('@/components/observation-detail-sheet').then(mod => mod.ObservationDetailSheet), { ssr: false });
const InspectionDetailSheet = dynamic(() => import('@/components/inspection-detail-sheet').then(mod => mod.InspectionDetailSheet), { ssr: false });
const PtwDetailSheet = dynamic(() => import('@/components/ptw-detail-sheet').then(mod => mod.PtwDetailSheet), { ssr: false });
const DeleteMultipleDialog = dynamic(() => import('@/components/delete-multiple-dialog').then(mod => mod.DeleteMultipleDialog), { ssr: false });


const riskColorMap: Record<RiskLevel, string> = {
    Low: 'bg-chart-2',
    Medium: 'bg-chart-4',
    High: 'bg-chart-5',
    Critical: 'bg-destructive',
};

const ObservationListItem = React.memo(function ObservationListItem({ observation, onSelect, isSelected, onToggle, isSelectionMode, isPriority }: { observation: Observation, onSelect: () => void, isSelected: boolean, onToggle: () => void, isSelectionMode: boolean, isPriority?: boolean }) {
    if (observation.optimisticState === 'uploading') {
        return <ListItemSkeleton key={observation.id} />;
    }
    const isCompleted = observation.status === 'Completed';
    const isPending = !isCompleted;

    const handleCardClick = () => {
        if (isSelectionMode) {
            onToggle();
        } else {
            onSelect();
        }
    };

    return (
        <Card onClick={handleCardClick} className={cn("transition-all cursor-pointer hover:border-primary/50 relative overflow-hidden", isSelected && "ring-2 ring-primary border-primary")}>
            <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${riskColorMap[observation.riskLevel]}`} />
            
            {(isPending || isCompleted) && !isSelectionMode && (
              <div className="absolute top-2 right-2">
                <TooltipProvider delayDuration={100}>
                  <Tooltip>
                    <TooltipTrigger>
                      {isPending && <Clock className="h-4 w-4 text-chart-5" />}
                      {isCompleted && <CheckCircle2 className="h-4 w-4 text-green-600" />}
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Status: {observation.status}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            )}
            
            <CardContent className="p-4 pl-6 flex items-start gap-4">
                 {isSelectionMode && (
                    <div className="flex items-center h-16">
                        <Checkbox checked={isSelected} onCheckedChange={onToggle} aria-label={`Select ${observation.referenceId}`} />
                    </div>
                )}
                {observation.photoUrl ? (
                    <div className="relative h-16 w-16 flex-shrink-0 rounded-md overflow-hidden border">
                        <Image src={observation.photoUrl} alt={observation.findings} fill sizes="64px" className="object-cover" priority={isPriority} data-ai-hint="site observation" />
                    </div>
                ) : (
                     <div className="relative h-16 w-16 flex-shrink-0 rounded-md bg-muted flex items-center justify-center">
                         <ClipboardList className="h-8 w-8 text-muted-foreground" />
                     </div>
                )}
                <div className="flex-1 space-y-1 overflow-hidden">
                    <Badge variant="outline" className="text-primary border-primary py-0.5 px-2 text-xs">{observation.category}</Badge>
                    <p className="font-semibold leading-snug truncate pr-8">{observation.findings}</p>
                    <div className="text-xs text-muted-foreground pt-1">
                        {observation.company} &bull; {observation.location} &bull; {format(new Date(observation.date), 'd MMM yy')}
                    </div>
                     {observation.responsiblePersonName && (
                        <div className="text-xs text-muted-foreground pt-1 flex items-center gap-1.5">
                            <User className="h-3 w-3" />
                            <span>{observation.responsiblePersonName}</span>
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
});


const InspectionListItem = React.memo(function InspectionListItem({ inspection, onSelect, isSelected, onToggle, isSelectionMode, isPriority }: { inspection: Inspection, onSelect: () => void, isSelected: boolean, onToggle: () => void, isSelectionMode: boolean, isPriority?: boolean }) {
    if (inspection.optimisticState === 'uploading') {
        return <ListItemSkeleton key={inspection.id} />;
    }

    const isCompleted = inspection.status === 'Pass';
    const isPending = !isCompleted;

    const handleCardClick = () => {
        if (isSelectionMode) {
            onToggle();
        } else {
            onSelect();
        }
    };
    
    return (
        <Card onClick={handleCardClick} className={cn("transition-all cursor-pointer hover:border-primary/50 relative overflow-hidden", isSelected && "ring-2 ring-primary border-primary")}>
            <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-muted-foreground" />
            
            {(isPending || isCompleted) && !isSelectionMode && (
              <div className="absolute top-2 right-2">
                <TooltipProvider delayDuration={100}>
                  <Tooltip>
                    <TooltipTrigger>
                      {isPending && <Clock className="h-4 w-4 text-chart-5" />}
                      {isCompleted && <CheckCircle2 className="h-4 w-4 text-green-600" />}
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Status: {inspection.status}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            )}
            
            <CardContent className="p-4 pl-6 flex items-start gap-4">
                {isSelectionMode && (
                    <div className="flex items-center h-16">
                        <Checkbox checked={isSelected} onCheckedChange={onToggle} aria-label={`Select ${inspection.referenceId}`} />
                    </div>
                )}
                {inspection.photoUrl ? (
                    <div className="relative h-16 w-16 flex-shrink-0 rounded-md overflow-hidden border">
                        <Image src={inspection.photoUrl} alt={inspection.equipmentName} fill sizes="64px" className="object-cover" priority={isPriority} data-ai-hint="equipment inspection" />
                    </div>
                ) : (
                     <div className="relative h-16 w-16 flex-shrink-0 rounded-md bg-muted flex items-center justify-center">
                         <Wrench className="h-8 w-8 text-muted-foreground" />
                     </div>
                )}
                <div className="flex-1 space-y-1 overflow-hidden">
                    <p className="font-semibold leading-snug truncate pr-8">{inspection.equipmentName}</p>
                    <p className="text-sm text-muted-foreground truncate pr-8">{inspection.findings}</p>
                     <div className="flex flex-wrap items-center gap-2 pt-1">
                        <InspectionStatusBadge status={inspection.status} />
                        <span className="text-xs text-muted-foreground">{inspection.location} &bull; {format(new Date(inspection.date), 'd MMM yy')}</span>
                    </div>
                    {inspection.responsiblePersonName && (
                        <div className="text-xs text-muted-foreground pt-1 flex items-center gap-1.5">
                            <User className="h-3 w-3" />
                            <span>{inspection.responsiblePersonName}</span>
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
});

const PtwListItem = React.memo(function PtwListItem({ ptw, onSelect, isSelected, onToggle, isSelectionMode }: { ptw: Ptw, onSelect: () => void, isSelected: boolean, onToggle: () => void, isSelectionMode: boolean }) {
    if (ptw.optimisticState === 'uploading') {
        return <ListItemSkeleton key={ptw.id} />;
    }

    const isCompleted = ptw.status === 'Approved' || ptw.status === 'Closed';
    const isPending = !isCompleted && ptw.status !== 'Rejected';

    const handleCardClick = () => {
        if (isSelectionMode) {
            onToggle();
        } else {
            onSelect();
        }
    };
    
    return (
       <Card onClick={handleCardClick} className={cn("transition-all cursor-pointer hover:border-primary/50 relative overflow-hidden", isSelected && "ring-2 ring-primary border-primary")}>
            <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-muted-foreground" />

             {(isPending || isCompleted) && !isSelectionMode && (
              <div className="absolute top-2 right-2">
                <TooltipProvider delayDuration={100}>
                  <Tooltip>
                    <TooltipTrigger>
                      {isPending && <Clock className="h-4 w-4 text-chart-5" />}
                      {isCompleted && <CheckCircle2 className="h-4 w-4 text-green-600" />}
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Status: {ptw.status}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            )}

            <CardContent className="p-4 pl-6 flex items-start gap-4">
                {isSelectionMode && (
                    <div className="flex items-center h-16">
                        <Checkbox checked={isSelected} onCheckedChange={onToggle} aria-label={`Select ${ptw.referenceId}`} />
                    </div>
                )}
                <div className="relative h-16 w-16 flex-shrink-0 rounded-md bg-muted flex items-center justify-center">
                    <FileSignature className="h-8 w-8 text-muted-foreground" />
                </div>
                <div className="flex-1 space-y-1 overflow-hidden">
                    <p className="font-semibold leading-snug truncate pr-8">{ptw.workDescription}</p>
                     <div className="flex flex-wrap items-center gap-2 pt-2">
                        <PtwStatusBadge status={ptw.status} />
                        <span className="text-xs text-muted-foreground">{ptw.location}</span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                        {ptw.contractor} &bull; {format(new Date(ptw.date), 'd MMM yy')}
                    </div>
                    {ptw.responsiblePersonName && (
                        <div className="text-xs text-muted-foreground pt-1 flex items-center gap-1.5">
                            <User className="h-3 w-3" />
                            <span>Approver: {ptw.responsiblePersonName}</span>
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    )
});

interface FeedViewProps {
  projectId: string;
  itemTypeFilter: 'observation' | 'inspection' | 'ptw';
  itemIdToOpen?: string | null;
  title: string;
}

export function FeedView({ projectId, itemTypeFilter, itemIdToOpen, title }: FeedViewProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();
  const { isFastConnection } = usePerformance();
  
  const context = React.useContext(ObservationContext)!;
  const itemsForFeed = context.items[itemTypeFilter];
  const isLoading = context.isLoading[itemTypeFilter];
  const { getObservationById, getInspectionById, getPtwById } = context;
  useObservations(projectId, itemTypeFilter);
  
  const [selectedObservationId, setSelectedObservationId] = React.useState<string | null>(null);
  const [selectedInspectionId, setSelectedInspectionId] = React.useState<string | null>(null);
  const [selectedPtwId, setSelectedPtwId] = React.useState<string | null>(null);
  
  // --- Filter and Search State ---
  const [searchTerm, setSearchTerm] = React.useState('');
  const [isFilterVisible, setIsFilterVisible] = React.useState(false);
  const [statusFilter, setStatusFilter] = React.useState('all');
  const [riskFilter, setRiskFilter] = React.useState('all');


  const [visibleCount, setVisibleCount] = React.useState(ITEMS_PER_PAGE);
  const [isLoadingMore, setIsLoadingMore] = React.useState(false);

  // --- Bulk Actions State ---
  const [isSelectionMode, setIsSelectionMode] = React.useState(false);
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());
  const [isBulkDeleteOpen, setBulkDeleteOpen] = React.useState(false);
  const [isExporting, setIsExporting] = React.useState(false);

  
  const triggeredOpen = React.useRef(false);
  
  React.useEffect(() => {
    const openItemFromUrl = async () => {
        if (itemIdToOpen && !isLoading && !triggeredOpen.current) {
            triggeredOpen.current = true;
            let itemExists = false;
            
            switch (itemTypeFilter) {
                case 'observation': if (getObservationById(itemIdToOpen)) { setSelectedObservationId(itemIdToOpen); itemExists = true; } break;
                case 'inspection': if (getInspectionById(itemIdToOpen)) { setSelectedInspectionId(itemIdToOpen); itemExists = true; } break;
                case 'ptw': if (getPtwById(itemIdToOpen)) { setSelectedPtwId(itemIdToOpen); itemExists = true; } break;
            }

            if (!itemExists) toast({ variant: 'destructive', title: 'Report Not Found' });
            router.replace(pathname, { scroll: false });
        }
    };
    openItemFromUrl();
  }, [itemIdToOpen, isLoading, itemTypeFilter, getObservationById, getInspectionById, getPtwById, pathname, router, toast]);

  const filterOptions = React.useMemo(() => {
    const all = { value: 'all', label: 'All' };
    let statusOptions = [all];
    let riskOptions = [all];

    switch (itemTypeFilter) {
      case 'observation':
        statusOptions.push(...OBSERVATION_STATUSES.map(s => ({ value: s, label: s })));
        riskOptions.push(...RISK_LEVELS.map(r => ({ value: r, label: r })));
        break;
      case 'inspection':
        statusOptions.push(...INSPECTION_STATUSES.map(s => ({ value: s, label: s })));
        break;
      case 'ptw':
        statusOptions.push(...PTW_STATUSES.map(s => ({ value: s, label: s })));
        break;
    }
    return { statusOptions, riskOptions };
  }, [itemTypeFilter]);

  const filteredData = React.useMemo(() => {
    let items = itemsForFeed as AllItems[];

    if (searchTerm) {
        const lowercasedSearch = searchTerm.toLowerCase();
        items = items.filter(item => {
            if (item.itemType === 'observation') return item.findings.toLowerCase().includes(lowercasedSearch) || item.recommendation.toLowerCase().includes(lowercasedSearch) || item.company.toLowerCase().includes(lowercasedSearch) || item.location.toLowerCase().includes(lowercasedSearch);
            if (item.itemType === 'inspection') return item.findings.toLowerCase().includes(lowercasedSearch) || item.equipmentName.toLowerCase().includes(lowercasedSearch) || item.location.toLowerCase().includes(lowercasedSearch);
            if (item.itemType === 'ptw') return item.workDescription.toLowerCase().includes(lowercasedSearch) || item.contractor.toLowerCase().includes(lowercasedSearch) || item.location.toLowerCase().includes(lowercasedSearch);
            return false;
        });
    }

    if (statusFilter !== 'all') {
        items = items.filter(item => item.status === statusFilter);
    }
    
    if (itemTypeFilter === 'observation' && riskFilter !== 'all') {
        items = items.filter(item => (item as Observation).riskLevel === riskFilter);
    }

    return items;
  }, [itemsForFeed, searchTerm, statusFilter, riskFilter, itemTypeFilter]);

  const itemsToDisplay = React.useMemo(() => filteredData.slice(0, visibleCount), [filteredData, visibleCount]);
  const hasMore = visibleCount < filteredData.length;

  const loadMore = () => {
      setIsLoadingMore(true);
      setTimeout(() => {
          setVisibleCount(prev => prev + ITEMS_PER_PAGE);
          setIsLoadingMore(false);
      }, 500);
  };
  
  const handleToggleSelection = (id: string) => {
    setSelectedIds(prev => {
        const newSet = new Set(prev);
        if (newSet.has(id)) {
            newSet.delete(id);
        } else {
            newSet.add(id);
        }
        return newSet;
    });
  };

  const handleSelectionMode = (enable: boolean) => {
    setIsSelectionMode(enable);
    if (!enable) {
        setSelectedIds(new Set());
    }
  };
  
  const handleResetFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setRiskFilter('all');
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
        if (filteredData.length === 0) {
            toast({ variant: 'destructive', title: 'No Data', description: 'There is no data to export with the current filters.' });
            return;
        }
        const fileName = `${title.replace(/\s/g, '_')}_${format(new Date(), 'yyyy-MM-dd')}`;
        const success = await exportToExcel(filteredData, fileName);
        if (success) {
            toast({ title: 'Export Started', description: 'Your Excel file is being downloaded.' });
        }
    } catch (error) {
        toast({ variant: 'destructive', title: 'Export Failed', description: 'An error occurred while exporting the data.' });
    } finally {
        setIsExporting(false);
    }
  };

  const itemsToDelete = React.useMemo(() => {
    return (itemsForFeed as AllItems[]).filter(item => selectedIds.has(item.id));
  }, [selectedIds, itemsForFeed]);

  function EmptyState() {
    const messages = {
        observation: { icon: ClipboardList, title: 'No Observations Yet', text: 'There are no observation reports for this project yet.' },
        inspection: { icon: Wrench, title: 'No Inspections Yet', text: 'There are no inspection reports for this project yet.' },
        ptw: { icon: FileSignature, title: 'No Permits to Work Yet', text: 'There are no work permits for this project yet.' },
    };
    if (searchTerm || statusFilter !== 'all' || riskFilter !== 'all') return <div className="text-center py-16 text-muted-foreground bg-card rounded-lg border-dashed"><Search className="mx-auto h-12 w-12" /><h3 className="mt-4 text-xl font-semibold">No Results</h3><p className="mt-2 text-sm max-w-xs mx-auto">No reports match your filters.</p></div>;
    const currentType = messages[itemTypeFilter];
    return <div className="text-center py-16 text-muted-foreground bg-card rounded-lg border-dashed"><currentType.icon className="mx-auto h-12 w-12" /><h3 className="mt-4 text-xl font-semibold">{currentType.title}</h3><p className="mt-2 text-sm max-w-xs mx-auto">{currentType.text}</p></div>;
  }

  const FeedSkeleton = () => <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <ListItemSkeleton key={i} />)}</div>;

  const containerVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: isFastConnection ? 0.05 : 0 } }
  };
  const itemVariants = {
    hidden: { y: isFastConnection ? 20 : 0, opacity: 0 },
    show: { y: 0, opacity: 1 }
  };

  return (
    <>
     <div className="space-y-4">
        <div className="flex flex-row justify-between items-center gap-4">
            {isSelectionMode ? (
                <div className="flex items-center gap-4 w-full">
                    <Button variant="ghost" onClick={() => handleSelectionMode(false)}>Cancel</Button>
                    <p className="font-semibold text-sm flex-1">{selectedIds.size} selected</p>
                    <Button size="sm" variant="destructive" disabled={selectedIds.size === 0} onClick={() => setBulkDeleteOpen(true)}>
                        <Trash2 /> Delete
                    </Button>
                </div>
            ) : (
                <>
                    <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                              <MoreVertical />
                              <span className="sr-only">More Options</span>
                          </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                          <DropdownMenuItem onSelect={() => setIsFilterVisible(prev => !prev)}>
                              <Filter /><span>Filter & Search</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem onSelect={() => handleSelectionMode(true)}>
                              <ListChecks /><span>Select Reports</span>
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onSelect={handleExport} disabled={isExporting}>
                              <FileDown /><span>Export to Excel</span>
                          </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                </>
            )}
        </div>
        
        <AnimatePresence>
        {isFilterVisible && !isSelectionMode && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
                <Card className="p-4">
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        <div className="relative sm:col-span-2 lg:col-span-2">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input placeholder="Search by keyword..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9 w-full" autoFocus/>
                            {searchTerm && <Button variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7" onClick={() => setSearchTerm('')}><X className="h-4 w-4"/></Button>}
                        </div>
                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                            <SelectTrigger><SelectValue/></SelectTrigger>
                            <SelectContent>
                                <SelectGroup>
                                    <SelectLabel>Status</SelectLabel>
                                    {filterOptions.statusOptions.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}
                                </SelectGroup>
                            </SelectContent>
                        </Select>
                        {itemTypeFilter === 'observation' && (
                            <Select value={riskFilter} onValueChange={setRiskFilter}>
                                <SelectTrigger><SelectValue/></SelectTrigger>
                                <SelectContent>
                                    <SelectGroup>
                                        <SelectLabel>Risk Level</SelectLabel>
                                        {filterOptions.riskOptions.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}
                                    </SelectGroup>
                                </SelectContent>
                            </Select>
                        )}
                        <Button variant="ghost" onClick={handleResetFilters} className="sm:col-span-2 lg:col-span-4 mt-2">
                           <RotateCcw /> Reset Filters
                        </Button>
                    </div>
                </Card>
            </motion.div>
        )}
        </AnimatePresence>

      <main className="mt-6">
        {isLoading && itemsToDisplay.length === 0 ? <FeedSkeleton /> : itemsToDisplay.length > 0 ? (
          <motion.div className="space-y-3" variants={containerVariants} initial="hidden" animate="show">
             {itemsToDisplay.map((item, index) => (
                <motion.div key={item.id} variants={itemVariants}>
                    {(() => {
                        const isPriority = index < 3;
                        const commonProps = { isSelectionMode, isSelected: selectedIds.has(item.id), onToggle: () => handleToggleSelection(item.id) };
                        switch(item.itemType) {
                            case 'observation': return <ObservationListItem observation={item as Observation} onSelect={() => setSelectedObservationId(item.id)} isPriority={isPriority} {...commonProps} />;
                            case 'inspection': return <InspectionListItem inspection={item as Inspection} onSelect={() => setSelectedInspectionId(item.id)} isPriority={isPriority} {...commonProps} />;
                            case 'ptw': return <PtwListItem ptw={item as Ptw} onSelect={() => setSelectedPtwId(item.id)} {...commonProps} />;
                            default: return null;
                        }
                    })()}
                </motion.div>
             ))}
          </motion.div>
        ) : <EmptyState />}

        {hasMore && (
            <div className="flex justify-center mt-6">
                <Button onClick={loadMore} variant="outline" disabled={isLoadingMore}>
                    {isLoadingMore && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Load More
                </Button>
            </div>
        )}
      </main>
    </div>

    {selectedObservationId && <ObservationDetailSheet isOpen={!!selectedObservationId} onOpenChange={(isOpen) => { if (!isOpen) setSelectedObservationId(null); }} observationId={selectedObservationId} />}
    {selectedInspectionId && <InspectionDetailSheet isOpen={!!selectedInspectionId} onOpenChange={(isOpen) => { if(!isOpen) setSelectedInspectionId(null); }} inspectionId={selectedInspectionId} />}
    {selectedPtwId && <PtwDetailSheet isOpen={!!selectedPtwId} onOpenChange={(isOpen) => { if(!isOpen) setSelectedPtwId(null); }} ptwId={selectedPtwId} />}
    {isBulkDeleteOpen && (
        <DeleteMultipleDialog
            isOpen={isBulkDeleteOpen}
            onOpenChange={setBulkDeleteOpen}
            itemsToDelete={itemsToDelete}
            onSuccess={() => handleSelectionMode(false)}
        />
    )}
   </>
  );
}
