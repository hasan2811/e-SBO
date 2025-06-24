'use client';

import * as React from 'react';
import { useObservations } from '@/contexts/observation-context';
import { DataTable } from '@/components/data-table/data-table';
import { columns } from '@/components/data-table/columns';

export default function DatabasePage() {
  const { observations } = useObservations();

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold tracking-tight">Database Observasi</h2>
      <p className="text-muted-foreground">
        Jelajahi, filter, dan kelola semua laporan observasi di satu tempat.
      </p>
      <DataTable columns={columns} data={observations} />
    </div>
  );
}
