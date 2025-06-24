'use client';

import * as React from 'react';
import { format, subDays } from 'date-fns';
import { DateRange } from 'react-day-picker';
import { Calendar as CalendarIcon, PieChart, BarChart2 } from 'lucide-react';

import type { Observation } from '@/lib/types';
import { useObservations } from '@/contexts/observation-context';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function DashboardPage() {
  const { observations } = useObservations();
  const [date, setDate] = React.useState<DateRange | undefined>({
    from: subDays(new Date(), 29),
    to: new Date(),
  });

  const filteredObservations = React.useMemo(() => {
    if (!date?.from) return observations;
    return observations.filter(obs => {
      const obsDate = new Date(obs.date);
      const from = new Date(date.from!);
      from.setHours(0, 0, 0, 0); // Start of the day
      
      const to = date.to ? new Date(date.to) : new Date(date.from!);
      to.setHours(23, 59, 59, 999); // End of the day

      return obsDate >= from && obsDate <= to;
    });
  }, [observations, date]);

  const statusData = React.useMemo(() => {
    return filteredObservations.reduce((acc, obs) => {
      const existing = acc.find(item => item.status === obs.status);
      if (existing) {
        existing.count++;
      } else {
        acc.push({ status: obs.status, count: 1 });
      }
      return acc;
    }, [] as { status: Observation['status']; count: number }[]);
  }, [filteredObservations]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <h2 className="text-2xl font-bold tracking-tight">Dashboard</h2>
        <div className="flex items-center gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  id="date"
                  variant={'outline'}
                  className={cn(
                    'w-[260px] justify-start text-left font-normal',
                    !date && 'text-muted-foreground'
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date?.from ? (
                    date.to ? (
                      <>
                        {format(date.from, 'LLL dd, y')} -{' '}
                        {format(date.to, 'LLL dd, y')}
                      </>
                    ) : (
                      format(date.from, 'LLL dd, y')
                    )
                  ) : (
                    <span>Pick a date</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                  initialFocus
                  mode="range"
                  defaultMonth={date?.from}
                  selected={date}
                  onSelect={setDate}
                  numberOfMonths={2}
                />
              </PopoverContent>
            </Popover>
        </div>
      </div>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
         <Card>
           <CardHeader>
             <CardTitle>Total Observations</CardTitle>
           </CardHeader>
           <CardContent>
             <div className="text-5xl font-bold">{filteredObservations.length}</div>
             <p className="text-xs text-muted-foreground">
                Total observations in the selected date range
             </p>
           </CardContent>
         </Card>
          <Card>
           <CardHeader>
             <CardTitle>Completed</CardTitle>
           </CardHeader>
           <CardContent>
             <div className="text-5xl font-bold">{statusData.find(s => s.status === 'Completed')?.count ?? 0}</div>
             <p className="text-xs text-muted-foreground">
                Completed observations
             </p>
           </CardContent>
         </Card>
          <Card>
           <CardHeader>
             <CardTitle>Pending</CardTitle>
           </CardHeader>
           <CardContent>
             <div className="text-5xl font-bold">{(statusData.find(s => s.status === 'Pending')?.count ?? 0) + (statusData.find(s => s.status === 'In Progress')?.count ?? 0)}</div>
              <p className="text-xs text-muted-foreground">
                Pending or in-progress observations
             </p>
           </CardContent>
         </Card>
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Observations by Status</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-center min-h-[250px] text-center text-muted-foreground">
             <div className="space-y-2">
                <PieChart className="h-10 w-10 mx-auto" />
                <p>Chart functionality will be available soon.</p>
             </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Observations by Risk Level</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-center min-h-[250px] text-center text-muted-foreground">
             <div className="space-y-2">
                <BarChart2 className="h-10 w-10 mx-auto" />
                <p>Chart functionality will be available soon.</p>
             </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
