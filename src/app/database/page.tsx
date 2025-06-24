'use client';

import * as React from 'react';

import type { ObservationCategory, ObservationStatus } from '@/lib/types';
import { DataTable } from '@/components/data-table/data-table';
import { columns } from '@/components/data-table/columns';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useObservations } from '@/contexts/observation-context';

export default function DatabasePage() {
  const { observations } = useObservations();
  const [searchTerm, setSearchTerm] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState<ObservationStatus | 'all'>('all');
  const [categoryFilter, setCategoryFilter] = React.useState<ObservationCategory | 'all'>('all');

  const filteredObservations = React.useMemo(() => {
    return observations
      .filter(observation => statusFilter === 'all' || observation.status === statusFilter)
      .filter(observation => categoryFilter === 'all' || observation.category === categoryFilter)
      .filter(observation => {
        const lowerCaseSearch = searchTerm.toLowerCase();
        return (
          observation.id.toLowerCase().includes(lowerCaseSearch) ||
          observation.location.toLowerCase().includes(lowerCaseSearch) ||
          observation.findings.toLowerCase().includes(lowerCaseSearch) ||
          observation.recommendation.toLowerCase().includes(lowerCaseSearch)
        );
      });
  }, [observations, searchTerm, statusFilter, categoryFilter]);
  
  const statusOptions: (ObservationStatus | 'all')[] = ['all', 'Pending', 'In Progress', 'Completed'];
  const categoryOptions: (ObservationCategory | 'all')[] = ['all', 'Structural', 'Electrical', 'Plumbing', 'General'];

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold tracking-tight">Database Observasi</h2>
      <Card>
        <CardContent className="p-6">
          <div className="grid gap-4 grid-cols-1 md:grid-cols-3 mb-6">
            <Input
              placeholder="Cari berdasarkan ID, lokasi, temuan..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="md:col-span-1"
            />
            <Select value={statusFilter} onValueChange={(value: ObservationStatus | 'all') => setStatusFilter(value)}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Filter berdasarkan status" />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map(option => (
                  <SelectItem key={option} value={option}>{option === 'all' ? 'Semua Status' : option}</SelectItem>
                ))}
              </SelectContent>
            </Select>
             <Select value={categoryFilter} onValueChange={(value: ObservationCategory | 'all') => setCategoryFilter(value)}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Filter berdasarkan kategori" />
              </SelectTrigger>
              <SelectContent>
                {categoryOptions.map(option => (
                  <SelectItem key={option} value={option}>{option === 'all' ? 'Semua Kategori' : option}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DataTable columns={columns} data={filteredObservations} />
        </CardContent>
      </Card>
    </div>
  );
}
