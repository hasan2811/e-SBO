'use client';

import * as React from 'react';
import Link from 'next/link';
import { useObservations } from '@/contexts/observation-context';
import type { Observation } from '@/lib/types';
import { RiskBadge } from '@/components/status-badges';
import { SubmitObservationDialog } from '@/components/submit-observation-dialog';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { Plus, FileText, ChevronRight } from 'lucide-react';

const ObservationListItem = ({ observation }: { observation: Observation }) => {
  return (
    <li>
      <Link href={`/observation/${observation.id}`} className="flex items-center bg-card p-3.5 rounded-lg shadow-sm hover:bg-muted/50 transition-colors cursor-pointer">
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
          <ChevronRight className="h-5 w-5 text-muted-foreground" />
        </div>
      </Link>
    </li>
  );
};

export default function JurnalPage() {
  const { observations, addObservation } = useObservations();
  const [isAddDialogOpen, setAddDialogOpen] = React.useState(false);

  const groupedObservations = React.useMemo(() => {
    return observations.reduce((acc, obs) => {
      const dateKey = format(new Date(obs.date), 'yyyy-MM-dd');
      if (!acc[dateKey]) {
        acc[dateKey] = [];
      }
      acc[dateKey].push(obs);
      return acc;
    }, {} as Record<string, Observation[]>);
  }, [observations]);
  
  const sortedDates = React.useMemo(() => Object.keys(groupedObservations).sort((a, b) => new Date(b).getTime() - new Date(a).getTime()), [groupedObservations]);

  return (
    <>
      <div className="space-y-6">
        <h2 className="text-2xl font-bold tracking-tight">Jurnal Observasi</h2>

        {observations.length > 0 ? (
          <div className="space-y-6">
            {sortedDates.map(date => (
              <div key={date}>
                <h3 className="font-semibold text-lg mb-3">
                  {format(new Date(date), "EEEE, d MMMM yyyy", { locale: id })}
                </h3>
                <ul className="space-y-3">
                  {groupedObservations[date].map(obs => (
                    <ObservationListItem key={obs.id} observation={obs} />
                  ))}
                </ul>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-16 text-muted-foreground">
            <FileText className="mx-auto h-12 w-12" />
            <h3 className="mt-4 text-xl font-semibold">Belum Ada Observasi</h3>
            <p className="mt-2">Tekan tombol '+' untuk membuat laporan observasi pertama Anda.</p>
          </div>
        )}
      </div>

      {/* Floating Action Button */}
      <button
        onClick={() => setAddDialogOpen(true)}
        className="fixed bottom-24 right-6 md:hidden h-14 w-14 bg-primary rounded-full flex items-center justify-center text-primary-foreground shadow-lg hover:bg-primary/90 transition-transform active:scale-95 z-40"
        aria-label="Tambah Observasi Baru"
      >
        <Plus className="h-7 w-7" />
      </button>

      {/* Dialogs */}
      <SubmitObservationDialog
        isOpen={isAddDialogOpen}
        onOpenChange={setAddDialogOpen}
        onAddObservation={addObservation}
      />
    </>
  );
}
