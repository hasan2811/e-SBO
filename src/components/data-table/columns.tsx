'use client';

import { useState, useTransition } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import Image from 'next/image';
import { MoreHorizontal, Eye, Download, Bot, Loader2, ClipboardCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import type { Observation, RiskLevel, ObservationStatus } from '@/lib/types';
import { getAiSummary } from '@/lib/actions';
import { useToast } from '@/hooks/use-toast';
import type { SummarizeObservationDataOutput } from '@/ai/flows/summarize-observation-data';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { useObservations } from '@/contexts/observation-context';
import { TakeActionDialog } from '../take-action-dialog';

const StatusBadge = ({ status }: { status: Observation['status'] }) => {
  const variant: 'default' | 'secondary' | 'outline' =
    status === 'Completed'
      ? 'default'
      : status === 'In Progress'
      ? 'secondary'
      : 'outline';
  return <Badge variant={variant}>{status}</Badge>;
};

const RiskBadge = ({ riskLevel }: { riskLevel: Observation['riskLevel'] }) => {
  const riskStyles: Record<RiskLevel, string> = {
    Low: 'bg-chart-2 border-transparent text-primary-foreground hover:bg-chart-2/80',
    Medium: 'bg-chart-4 border-transparent text-secondary-foreground hover:bg-chart-4/80',
    High: 'bg-chart-5 border-transparent text-secondary-foreground hover:bg-chart-5/80',
    Critical: 'bg-destructive border-transparent text-destructive-foreground hover:bg-destructive/80',
  };

  return <Badge className={cn(riskStyles[riskLevel])}>{riskLevel}</Badge>;
};

const ActionsCell = ({ row }: { row: { original: Observation } }) => {
  const observation = row.original;
  const { updateObservation } = useObservations();
  const [isPhotoViewerOpen, setPhotoViewerOpen] = useState(false);
  const [isAiSummaryOpen, setAiSummaryOpen] = useState(false);
  const [isActionDialogOpen, setActionDialogOpen] = useState(false);
  const [aiSummary, setAiSummary] = useState<SummarizeObservationDataOutput | null>(null);
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();
  
  const handleUpdate = async (id: string, data: Partial<Observation>) => {
    await updateObservation(id, data);
    setActionDialogOpen(false);
  };

  const handleDownloadReport = () => {
    const reportContent = `
      Observation Report: ${observation.id}
      ---------------------------------
      Date: ${new Date(observation.date).toLocaleString()}
      Location: ${observation.location}
      Company: ${observation.company}
      Submitted By: ${observation.submittedBy}
      Status: ${observation.status}
      Category: ${observation.category}
      Risk Level: ${observation.riskLevel}
      
      Findings:
      ${observation.findings}

      Recommendation:
      ${observation.recommendation}
    `;
    const blob = new Blob([reportContent.trim()], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `observation-report-${observation.id}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleGetAiSummary = () => {
    setAiSummaryOpen(true);
    if (!aiSummary) {
      startTransition(async () => {
        try {
          const result = await getAiSummary(observation);
          setAiSummary(result);
        } catch (error) {
          setAiSummaryOpen(false);
          toast({
            variant: 'destructive',
            title: 'Error',
            description: 'Failed to generate AI summary. Please try again.',
          });
        }
      });
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-8 w-8 p-0">
            <span className="sr-only">Open menu</span>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Actions</DropdownMenuLabel>
           {observation.status !== 'Completed' && (
            <DropdownMenuItem onClick={() => setActionDialogOpen(true)}>
              <ClipboardCheck className="mr-2 h-4 w-4" />
              <span>Take Action</span>
            </DropdownMenuItem>
          )}
          <DropdownMenuItem onClick={handleGetAiSummary}>
            <Bot className="mr-2 h-4 w-4" />
            <span>Get AI Summary</span>
          </DropdownMenuItem>
          {observation.photoUrl && (
            <DropdownMenuItem onClick={() => setPhotoViewerOpen(true)}>
              <Eye className="mr-2 h-4 w-4" />
              <span>View Photo</span>
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleDownloadReport}>
            <Download className="mr-2 h-4 w-4" />
            <span>Download Report</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Photo Viewer Dialog */}
      {observation.photoUrl && (
         <Dialog open={isPhotoViewerOpen} onOpenChange={setPhotoViewerOpen}>
            <DialogContent className="max-w-3xl">
              <DialogHeader>
                <DialogTitle>Photo for {observation.id}</DialogTitle>
                <DialogDescription>{observation.location}</DialogDescription>
              </DialogHeader>
              <div className="relative aspect-video w-full">
                <Image
                  src={observation.photoUrl}
                  alt={`Observation at ${observation.location}`}
                  fill
                  className="object-contain rounded-md"
                  data-ai-hint="construction site"
                />
              </div>
            </DialogContent>
          </Dialog>
      )}
      
      {/* Take Action Dialog */}
      <TakeActionDialog
        isOpen={isActionDialogOpen}
        onOpenChange={setActionDialogOpen}
        observation={observation}
        onUpdate={handleUpdate}
      />

      {/* AI Summary Dialog */}
      <Dialog open={isAiSummaryOpen} onOpenChange={setAiSummaryOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>AI-Powered Summary for {observation.id}</DialogTitle>
            <DialogDescription>
              This summary is generated by AI and should be reviewed for accuracy.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {isPending ? (
              <div className="flex items-center justify-center h-48">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="ml-4 text-muted-foreground">Generating summary...</p>
              </div>
            ) : (
              aiSummary && (
                <div className="space-y-4">
                  <Alert>
                    <AlertTitle>Summary of Findings</AlertTitle>
                    <AlertDescription>{aiSummary.summary}</AlertDescription>
                  </Alert>
                  <Alert>
                    <AlertTitle>Potential Risks</AlertTitle>
                    <AlertDescription>{aiSummary.risks}</AlertDescription>
                  </Alert>
                  <Alert>
                    <AlertTitle>Suggested Actions</AlertTitle>
                    <AlertDescription>{aiSummary.suggestedActions}</AlertDescription>
                  </Alert>
                </div>
              )
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAiSummaryOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export const columns: ColumnDef<Observation>[] = [
  {
    accessorKey: 'id',
    header: 'ID',
  },
  {
    accessorKey: 'location',
    header: 'Location',
    cell: ({ row }) => <div className="font-medium">{row.original.location}</div>,
  },
    {
    accessorKey: 'submittedBy',
    header: 'Submitted By',
  },
  {
    accessorKey: 'findings',
    header: 'Findings',
    cell: ({ row }) => (
      <div className="max-w-xs whitespace-nowrap overflow-hidden text-ellipsis">{row.original.findings}</div>
    ),
  },
  {
    accessorKey: 'riskLevel',
    header: 'Risk Level',
    cell: ({ row }) => <RiskBadge riskLevel={row.original.riskLevel} />,
  },
  {
    accessorKey: 'company',
    header: 'Company',
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => <StatusBadge status={row.original.status} />,
  },
  {
    accessorKey: 'date',
    header: 'Date',
    cell: ({ row }) => <div className="text-sm">{new Date(row.original.date).toLocaleString()}</div>
  },
  {
    id: 'actions',
    cell: ActionsCell,
  },
];
