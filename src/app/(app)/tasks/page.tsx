'use client';

import * as React from 'react';
import { format, subDays } from 'date-fns';
import { DateRange } from 'react-day-picker';
import { Calendar as CalendarIcon } from 'lucide-react';
import { Cell } from 'recharts';

import type { Observation, RiskLevel } from '@/lib/types';
import { useObservations } from '@/contexts/observation-context';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  BarChart,
  PieChart,
  ChartBar,
  ChartPie,
  ChartYAxis,
  ChartXAxis,
} from '@/components/ui/chart';
import { Skeleton } from '@/components/ui/skeleton';

const statusColors: Record<Observation['status'], string> = {
  Pending: 'hsl(var(--destructive))',
  'In Progress': 'hsl(var(--chart-4))',
  Completed: 'hsl(var(--chart-2))',
};

const riskLevelColors: Record<RiskLevel, string> = {
  Low: 'hsl(var(--chart-2))',
  Medium: 'hsl(var(--chart-4))',
  High: 'hsl(var(--chart-5))',
  Critical: 'hsl(var(--destructive))',
};

const genericChartColors = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
];

export default function DashboardPage() {
  const { observations, loading } = useObservations();
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
     const counts = filteredObservations.reduce((acc, obs) => {
      acc[obs.status] = (acc[obs.status] || 0) + 1;
      return acc;
    }, {} as Record<Observation['status'], number>);
    
    return Object.entries(counts).map(([status, count]) => ({
      name: status,
      count: count,
      fill: statusColors[status as Observation['status']],
    }));
  }, [filteredObservations]);
  
  const riskLevelData = React.useMemo(() => {
    const counts = filteredObservations.reduce((acc, obs) => {
      acc[obs.riskLevel] = (acc[obs.riskLevel] || 0) + 1;
      return acc;
    }, {} as Record<RiskLevel, number>);

    return Object.entries(counts).map(([riskLevel, count]) => ({
      name: riskLevel,
      count: count,
      fill: riskLevelColors[riskLevel as RiskLevel],
    }));
  }, [filteredObservations]);

  const categoryData = React.useMemo(() => {
    const counts = filteredObservations.reduce((acc, obs) => {
      acc[obs.category] = (acc[obs.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(counts).map(([name, count], index) => ({
      name,
      count,
      fill: genericChartColors[index % genericChartColors.length],
    }));
  }, [filteredObservations]);

  const companyData = React.useMemo(() => {
    const counts = filteredObservations.reduce((acc, obs) => {
      acc[obs.company] = (acc[obs.company] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(counts).map(([name, count], index) => ({
      name,
      count,
      fill: genericChartColors[index % genericChartColors.length],
    }));
  }, [filteredObservations]);

  const locationData = React.useMemo(() => {
    const counts = filteredObservations.reduce((acc, obs) => {
      acc[obs.location] = (acc[obs.location] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(counts).map(([name, count], index) => ({
      name,
      count,
      fill: genericChartColors[index % genericChartColors.length],
    }));
  }, [filteredObservations]);


  const chartConfig = (data: { name: string, fill: string }[]) => ({
    count: {
      label: 'Observations',
    },
    ...data.reduce((acc, item) => {
      acc[item.name] = { label: item.name, color: item.fill };
      return acc;
    }, {} as any)
  });

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
             {loading ? (
                <div className="space-y-2">
                  <Skeleton className="h-12 w-24" />
                  <Skeleton className="h-4 w-4/5" />
                </div>
              ) : (
                <>
                  <div className="text-5xl font-bold">{filteredObservations.length}</div>
                  <p className="text-xs text-muted-foreground">
                      Total observations in the selected date range
                  </p>
                </>
              )}
           </CardContent>
         </Card>
          <Card>
           <CardHeader>
             <CardTitle>Completed</CardTitle>
           </CardHeader>
           <CardContent>
             {loading ? (
                <div className="space-y-2">
                  <Skeleton className="h-12 w-24" />
                  <Skeleton className="h-4 w-4/5" />
                </div>
              ) : (
                <>
                  <div className="text-5xl font-bold">{filteredObservations.filter(s => s.status === 'Completed').length}</div>
                  <p className="text-xs text-muted-foreground">
                      Completed observations
                  </p>
                </>
              )}
           </CardContent>
         </Card>
          <Card>
           <CardHeader>
             <CardTitle>Pending</CardTitle>
           </CardHeader>
           <CardContent>
              {loading ? (
                <div className="space-y-2">
                  <Skeleton className="h-12 w-24" />
                  <Skeleton className="h-4 w-4/5" />
                </div>
              ) : (
                <>
                  <div className="text-5xl font-bold">{filteredObservations.filter(s => s.status !== 'Completed').length}</div>
                  <p className="text-xs text-muted-foreground">
                      Pending or in-progress observations
                  </p>
                </>
              )}
           </CardContent>
         </Card>
      </div>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Observations by Status</CardTitle>
          </CardHeader>
          <CardContent className="min-h-[300px] flex items-center justify-center">
            {loading ? (
              <Skeleton className="h-[250px] w-full" />
            ) : statusData.length > 0 ? (
                 <ChartContainer config={chartConfig(statusData.map(d => ({name: d.name, fill: d.fill})))} className="min-h-[250px] w-full">
                    <PieChart>
                      <ChartTooltip content={<ChartTooltipContent nameKey="name" />} />
                      <ChartPie data={statusData} dataKey="count" nameKey="name" innerRadius={60}>
                         {statusData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </ChartPie>
                      <ChartLegend content={<ChartLegendContent nameKey="name"/>} />
                    </PieChart>
                  </ChartContainer>
            ) : (
                <div className="text-center text-muted-foreground">
                    <p>No data to display for the selected period.</p>
                </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Observations by Risk Level</CardTitle>
          </CardHeader>
          <CardContent className="min-h-[300px] flex items-center justify-center">
             {loading ? (
              <Skeleton className="h-[250px] w-full" />
            ) : riskLevelData.length > 0 ? (
                <ChartContainer config={chartConfig(riskLevelData.map(d => ({name: d.name, fill: d.fill})))} className="min-h-[250px] w-full">
                  <BarChart data={riskLevelData} layout="vertical" margin={{ left: 20 }}>
                    <ChartYAxis
                      dataKey="name"
                      type="category"
                      tickLine={false}
                      axisLine={false}
                    />
                    <ChartXAxis dataKey="count" type="number" hide />
                     <ChartTooltip
                        cursor={false}
                        content={<ChartTooltipContent indicator="line" nameKey="name" />}
                      />
                    <ChartBar dataKey="count" radius={4} layout="vertical">
                       {riskLevelData.map((entry) => (
                        <Cell key={entry.name} fill={entry.fill} />
                      ))}
                    </ChartBar>
                  </BarChart>
                </ChartContainer>
             ) : (
                 <div className="text-center text-muted-foreground">
                    <p>No data to display for the selected period.</p>
                </div>
             )}
          </CardContent>
        </Card>
         <Card>
          <CardHeader>
            <CardTitle>Observations by Category</CardTitle>
          </CardHeader>
          <CardContent className="min-h-[300px] flex items-center justify-center">
            {loading ? (
              <Skeleton className="h-[250px] w-full" />
            ) : categoryData.length > 0 ? (
                 <ChartContainer config={chartConfig(categoryData)} className="min-h-[250px] w-full">
                    <PieChart>
                      <ChartTooltip content={<ChartTooltipContent nameKey="name" />} />
                      <ChartPie data={categoryData} dataKey="count" nameKey="name" innerRadius={60}>
                         {categoryData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </ChartPie>
                      <ChartLegend content={<ChartLegendContent nameKey="name"/>} />
                    </PieChart>
                  </ChartContainer>
            ) : (
                <div className="text-center text-muted-foreground">
                    <p>No data to display for the selected period.</p>
                </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Observations by Company</CardTitle>
            <CardDescription>Horizontal bar chart showing findings per company.</CardDescription>
          </CardHeader>
          <CardContent className="min-h-[300px] flex items-center justify-center">
             {loading ? (
              <Skeleton className="h-[250px] w-full" />
            ) : companyData.length > 0 ? (
                <ChartContainer config={chartConfig(companyData)} className="min-h-[250px] w-full">
                  <BarChart data={companyData} layout="vertical" margin={{ left: 20 }}>
                    <ChartYAxis
                      dataKey="name"
                      type="category"
                      tickLine={false}
                      axisLine={false}
                      tickMargin={10}
                      width={100}
                    />
                    <ChartXAxis dataKey="count" type="number" hide />
                     <ChartTooltip
                        cursor={false}
                        content={<ChartTooltipContent indicator="line" nameKey="name" />}
                      />
                    <ChartBar dataKey="count" radius={4} layout="vertical">
                       {companyData.map((entry) => (
                        <Cell key={entry.name} fill={entry.fill} />
                      ))}
                    </ChartBar>
                  </BarChart>
                </ChartContainer>
             ) : (
                 <div className="text-center text-muted-foreground">
                    <p>No data to display for the selected period.</p>
                </div>
             )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Observations by Location</CardTitle>
            <CardDescription>Vertical bar chart showing findings per location.</CardDescription>
          </CardHeader>
          <CardContent className="min-h-[300px] flex items-center justify-center">
             {loading ? (
              <Skeleton className="h-[250px] w-full" />
            ) : locationData.length > 0 ? (
                <ChartContainer config={chartConfig(locationData)} className="min-h-[250px] w-full">
                  <BarChart data={locationData} margin={{ top: 20 }}>
                    <ChartXAxis
                      dataKey="name"
                      type="category"
                      tickLine={false}
                      axisLine={false}
                    />
                    <ChartYAxis dataKey="count" type="number" hide />
                     <ChartTooltip
                        cursor={false}
                        content={<ChartTooltipContent indicator="dot" nameKey="name" />}
                      />
                    <ChartBar dataKey="count" radius={4}>
                       {locationData.map((entry) => (
                        <Cell key={entry.name} fill={entry.fill} />
                      ))}
                    </ChartBar>
                  </BarChart>
                </ChartContainer>
             ) : (
                 <div className="text-center text-muted-foreground">
                    <p>No data to display for the selected period.</p>
                </div>
             )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
