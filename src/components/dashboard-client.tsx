'use client';

import * as React from 'react';
import { Loader2 } from 'lucide-react';

import type { Inspection, InspectionCategory, InspectionStatus } from '@/lib/types';
import { DataTable } from '@/components/data-table/data-table';
import { columns } from '@/components/data-table/columns';
import { DashboardHeader } from './dashboard-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { BottomNavBar } from './bottom-nav-bar';
import { useAuth } from '@/hooks/use-auth';
import { Button } from './ui/button';

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
  const { user, loading: authLoading, signInWithGoogle } = useAuth();
  const [isSigningIn, setIsSigningIn] = React.useState(false);
  const [inspections, setInspections] = React.useState<Inspection[]>(initialInspections);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState<InspectionStatus | 'all'>('all');
  const [categoryFilter, setCategoryFilter] = React.useState<InspectionCategory | 'all'>('all');

  const handleSignIn = async () => {
    setIsSigningIn(true);
    try {
      await signInWithGoogle();
    } catch (error) {
      console.error("Sign in failed", error);
      setIsSigningIn(false);
    }
  };

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
  
  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-secondary/50 p-4">
        <Card className="w-full max-w-sm p-4 shadow-xl">
          <CardHeader className="text-center p-4">
            <div className="flex justify-center mb-4">
              <svg
                className="h-12 w-auto text-primary"
                viewBox="0 0 48 48"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M24 4C12.9543 4 4 12.9543 4 24C4 35.0457 12.9543 44 24 44C35.0457 44 44 35.0457 44 24C44 12.9543 35.0457 4 24 4Z"
                  stroke="currentColor"
                  strokeWidth="4"
                  strokeLinejoin="round"
                />
                <path
                  d="M24 4V44C35.0457 44 44 35.0457 44 24C44 12.9543 35.0457 4 24 4Z"
                  fill="currentColor"
                />
                <path
                  d="M16 24L22 30L34 18"
                  stroke="white"
                  strokeWidth="4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <CardTitle className="text-3xl font-bold">Welcome Back</CardTitle>
            <CardDescription className="pt-2">Sign in with your Google account to continue.</CardDescription>
          </CardHeader>
          <CardContent className="p-4">
            <Button onClick={handleSignIn} className="w-full" disabled={isSigningIn}>
               {isSigningIn ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <svg className="mr-2 h-4 w-4" aria-hidden="true" focusable="false" data-prefix="fab" data-icon="google" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 488 512">
                    <path fill="currentColor" d="M488 261.8C488 403.3 381.5 512 244 512 109.8 512 0 402.2 0 266.3 0 130.4 109.8 21.8 244 21.8c64.3 0 119.8 24.6 162.2 64.9l-65.7 64.3c-24.5-23.3-58.4-38-96.5-38-78.1 0-141.9 63.8-141.9 141.9s63.8 141.9 141.9 141.9c86.4 0 122-62.8 126.3-93.5H244V261.8h244z"></path>
                </svg>
              )}
              {isSigningIn ? 'Signing In...' : 'Sign In with Google'}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

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
