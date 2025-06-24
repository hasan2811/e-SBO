'use client';

import { useState, useTransition } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import Image from 'next/image';
import { MoreHorizontal, Eye, Download, Bot, Loader2 } from 'lucide-react';

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
import type { Inspection } from '@/lib/types';
import { getAiSummary } from '@/lib/actions';
import { useToast } from '@/hooks/use-toast';
import type { SummarizeInspectionDataOutput } from '@/ai/flows/summarize-inspection-data';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';

const StatusBadge = ({ status }: { status: Inspection['status'] }) => {
  const variant: 'default' | 'secondary' | 'outline' =
    status === 'Completed'
      ? 'default'
      : status === 'In Progress'
      ? 'secondary'
      : 'outline';
  return <Badge variant={variant}>{status}</Badge>;
};

const ActionsCell = ({ row }: { row: { original: Inspection } }) => {
  const inspection = row.original;
  const [isPhotoViewerOpen, setPhotoViewerOpen] = useState(false);
  const [isAiSummaryOpen, setAiSummaryOpen] = useState(false);
  const [aiSummary, setAiSummary] = useState<SummarizeInspectionDataOutput | null>(null);
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  const handleDownloadReport = () => {
    const reportContent = `
      Inspection Report: ${inspection.id}
      ---------------------------------
      Date: ${inspection.date}
      Location: ${inspection.location}
      Submitted By: ${inspection.submittedBy}
      Status: ${inspection.status}
      Category: ${inspection.category}
      
      Findings:
      ${inspection.findings}
    `;
    const blob = new Blob([reportContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `inspection-report-${inspection.id}.txt`;
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
          const result = await getAiSummary(inspection);
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
          <DropdownMenuItem onClick={handleGetAiSummary}>
            <Bot className="mr-2 h-4 w-4" />
            <span>Get AI Summary</span>
          </DropdownMenuItem>
          {inspection.photoUrl && (
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
      {inspection.photoUrl && (
         <Dialog open={isPhotoViewerOpen} onOpenChange={setPhotoViewerOpen}>
            <DialogContent className="max-w-3xl">
              <DialogHeader>
                <DialogTitle>Photo for {inspection.id}</DialogTitle>
                <DialogDescription>{inspection.location}</DialogDescription>
              </DialogHeader>
              <div className="relative aspect-video w-full">
                <Image
                  src={inspection.photoUrl}
                  alt={`Inspection at ${inspection.location}`}
                  fill
                  className="object-contain rounded-md"
                  data-ai-hint="construction site"
                />
              </div>
            </DialogContent>
          </Dialog>
      )}

      {/* AI Summary Dialog */}
      <Dialog open={isAiSummaryOpen} onOpenChange={setAiSummaryOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>AI-Powered Summary for {inspection.id}</DialogTitle>
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

export const columns: ColumnDef<Inspection>[] = [
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
    accessorKey: 'findings',
    header: 'Findings',
    cell: ({ row }) => (
      <div className="max-w-xs whitespace-nowrap overflow-hidden text-ellipsis">{row.original.findings}</div>
    ),
  },
  {
    accessorKey: 'category',
    header: 'Category',
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => <StatusBadge status={row.original.status} />,
  },
  {
    accessorKey: 'date',
    header: 'Date',
  },
  {
    id: 'actions',
    cell: ActionsCell,
  },
];
