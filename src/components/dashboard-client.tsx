'use client';

import * as React from 'react';
import type { Inspection, InspectionCategory, InspectionStatus } from '@/lib/types';
import { DataTable } from '@/components/data-table/data-table';
import { columns } from '@/components/data-table/columns';
import { DashboardHeader } from './dashboard-header';
import { Card, CardContent } from './ui/card';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { BottomNavBar } from './bottom-nav-bar';

const initialInspections: Inspection[] = [
  {
    id: 'INS-001',
    location: 'Main Boiler Room',
    submittedBy: 'John Doe',
    date: '2024-07-28',
    findings: 'Minor leak detected at the base of boiler unit 3. Pressure readings are slightly below normal.',
    status: 'Pending',
    category: 'Plumbing',
    photoUrl: 'https://placehold.co/600x400.png',
  },
  {
    id: 'INS-002',
    location: 'East Wing - 3rd Floor',
    submittedBy: 'Jane Smith',
    date: '2024-07-27',
    findings: 'Exposed wiring found in ceiling panel above office 305. Immediate fire hazard.',
    status: 'In Progress',
    category: 'Electrical',
    photoUrl: 'https://placehold.co/600x400.png',
  },
  {
    id: 'INS-003',
    location: 'Foundation - West Corner',
    submittedBy: 'Sam Wilson',
    date: '2024-07-26',
    findings: 'Visible stress cracks on the concrete foundation. Requires further structural analysis.',
    status: 'Completed',
    category: 'Structural',
    photoUrl: 'https://placehold.co/600x400.png',
  },
  {
    id: 'INS-004',
    location: 'Rooftop HVAC Unit #2',
    submittedBy: 'John Doe',
    date: '2024-07-25',
    findings: 'Unusual noise coming from the compressor. Filter appears to be clogged.',
    status: 'Pending',
    category: 'General',
    photoUrl: 'https://placehold.co/600x400.png',
  },
  {
    id: 'INS-005',
    location: 'Server Room',
    submittedBy: 'Jane Smith',
    date: '2024-07-24',
    findings: 'Main power backup (UPS) failed a self-test. Battery replacement recommended.',
    status: 'In Progress',
    category: 'Electrical',
  },
];

export function DashboardClient() {
  const [inspections, setInspections] = React.useState<Inspection[]>(initialInspections);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState<InspectionStatus | 'all'>('all');
  const [categoryFilter, setCategoryFilter] = React.useState<InspectionCategory | 'all'>('all');

  const handleAddInspection = (newInspection: Inspection) => {
    setInspections(prev => [newInspection, ...prev]);
  };

  const filteredInspections = React.useMemo(() => {
    return inspections
      .filter(inspection => statusFilter === 'all' || inspection.status === statusFilter)
      .filter(inspection => categoryFilter === 'all' || inspection.category === categoryFilter)
      .filter(inspection => {
        const lowerCaseSearch = searchTerm.toLowerCase();
        return (
          inspection.id.toLowerCase().includes(lowerCaseSearch) ||
          inspection.location.toLowerCase().includes(lowerCaseSearch) ||
          inspection.findings.toLowerCase().includes(lowerCaseSearch)
        );
      });
  }, [inspections, searchTerm, statusFilter, categoryFilter]);
  
  const statusOptions: (InspectionStatus | 'all')[] = ['all', 'Pending', 'In Progress', 'Completed'];
  const categoryOptions: (InspectionCategory | 'all')[] = ['all', 'Structural', 'Electrical', 'Plumbing', 'General'];

  return (
    <div className="flex flex-col min-h-screen">
      <DashboardHeader onAddInspection={handleAddInspection} />
      <main className="flex-1 p-4 md:p-8 pb-24 md:pb-8">
        <div className="max-w-7xl mx-auto">
          <Card>
            <CardContent className="p-6">
              <div className="grid gap-4 grid-cols-1 md:grid-cols-3 mb-6">
                <Input
                  placeholder="Search by ID, location, or findings..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="md:col-span-1"
                />
                <Select value={statusFilter} onValueChange={(value: InspectionStatus | 'all') => setStatusFilter(value)}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    {statusOptions.map(option => (
                      <SelectItem key={option} value={option}>{option === 'all' ? 'All Statuses' : option}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                 <Select value={categoryFilter} onValueChange={(value: InspectionCategory | 'all') => setCategoryFilter(value)}>
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
              <DataTable columns={columns} data={filteredInspections} />
            </CardContent>
          </Card>
        </div>
      </main>
      <BottomNavBar onAddInspection={handleAddInspection} />
    </div>
  );
}
