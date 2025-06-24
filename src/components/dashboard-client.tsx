'use client';

import * as React from 'react';
import { Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

import type { Observation, ObservationCategory, ObservationStatus } from '@/lib/types';
import { DataTable } from '@/components/data-table/data-table';
import { columns } from '@/components/data-table/columns';
import { DashboardHeader } from './dashboard-header';
import { Card, CardContent } from './ui/card';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { BottomNavBar } from './bottom-nav-bar';
import { useAuth } from '@/hooks/use-auth';

export function DashboardClient() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [observations, setObservations] = React.useState<Observation[]>([]);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState<ObservationStatus | 'all'>('all');
  const [categoryFilter, setCategoryFilter] = React.useState<ObservationCategory | 'all'>('all');

  const handleAddObservation = (newObservation: Observation) => {
    setObservations(prev => [newObservation, ...prev]);
  };

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
  
  React.useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  if (authLoading || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      <DashboardHeader onAddObservation={handleAddObservation} />
      <main className="flex-1 p-4 md:p-8 pb-24 md:pb-8">
        <div className="max-w-7xl mx-auto">
          <Card>
            <CardContent className="p-6">
              <div className="grid gap-4 grid-cols-1 md:grid-cols-3 mb-6">
                <Input
                  placeholder="Search by ID, location, findings..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="md:col-span-1"
                />
                <Select value={statusFilter} onValueChange={(value: ObservationStatus | 'all') => setStatusFilter(value)}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    {statusOptions.map(option => (
                      <SelectItem key={option} value={option}>{option === 'all' ? 'All Statuses' : option}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                 <Select value={categoryFilter} onValueChange={(value: ObservationCategory | 'all') => setCategoryFilter(value)}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Filter by category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categoryOptions.map(option => (
                      <SelectItem key={option} value={option}>{option === 'all' ? 'All Categories' : option}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <DataTable columns={columns} data={filteredObservations} />
            </CardContent>
          </Card>
        </div>
      </main>
      <BottomNavBar onAddObservation={handleAddObservation} />
    </div>
  );
}
