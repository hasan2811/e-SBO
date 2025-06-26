
'use client';

import * as React from 'react';
import { format, subDays, eachDayOfInterval } from 'date-fns';
import { DateRange } from 'react-day-picker';
import { Calendar as CalendarIcon } from 'lucide-react';

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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Chart,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  BarChart,
  RadialBarChart,
  ChartRadialBar,
  ChartBar,
  ChartYAxis,
  ChartXAxis,
  ChartPolarAngleAxis,
} from '@/components/ui/chart';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';

const riskLevelConfig: Record<RiskLevel, { color: string, className: string }> = {
  Low: { color: 'hsl(var(--chart-2))', className: 'bg-chart-2' },
  Medium: { color: 'hsl(var(--chart-4))', className: 'bg-chart-4' },
  High: { color: 'hsl(var(--chart-5))', className: 'bg-chart-5' },
  Critical: { color: 'hsl(var(--destructive))', className: 'bg-destructive' },
};

const RadialChartCard = ({ loading, value, title, count, color }: { loading: boolean; value: number; title: string; count: number; color: string }) => {
  const chartData = [{ name: title, value }];

  return (
    <Card>
      <CardHeader className="items-center pb-2">
        <CardTitle className="text-base font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-2 flex justify-center">
        <div className="w-48 h-48">
          {loading ? (
            <Skeleton className="h-full w-full rounded-full" />
          ) : (
            <div className="relative h-full w-full">
              <Chart>
                <RadialBarChart
                  data={chartData}
                  innerRadius="80%"
                  outerRadius="100%"
                  barSize={12}
                  startAngle={90}
                  endAngle={450}
                >
                  <ChartPolarAngleAxis type="number" domain={[0, 100]} tick={false} />
                  <ChartRadialBar
                    dataKey="value"
                    background={{ fill: 'hsl(var(--muted))' }}
                    cornerRadius={6}
                    fill={color}
                  />
                </RadialBarChart>
              </Chart>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-4xl font-bold" style={{ color }}>{value}%</span>
                <span className="text-sm text-muted-foreground mt-1">({count} Laporan)</span>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};


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
      from.setHours(0, 0, 0, 0);
      const to = date.to ? new Date(date.to) : new Date(date.from!);
      to.setHours(23, 59, 59, 999);
      return obsDate >= from && obsDate <= to;
    });
  }, [observations, date]);

  const overviewData = React.useMemo(() => {
    const total = filteredObservations.length;
    if (total === 0) return { pendingPercentage: 0, pendingCount: 0, highRiskPercentage: 0, highRiskCount: 0 };

    const pendingCount = filteredObservations.filter(o => o.status !== 'Completed').length;
    const highRiskCount = filteredObservations.filter(o => ['High', 'Critical'].includes(o.riskLevel)).length;

    return {
      pendingPercentage: Math.round((pendingCount / total) * 100),
      pendingCount,
      highRiskPercentage: Math.round((highRiskCount / total) * 100),
      highRiskCount,
    };
  }, [filteredObservations]);

  const dailyData = React.useMemo(() => {
    if (!filteredObservations.length || !date?.from || !date.to) return [];

    const dataMap = new Map<string, { pending: number, completed: number }>();
    const daysInRange = eachDayOfInterval({ start: date.from, end: date.to });
    daysInRange.forEach(day => {
        dataMap.set(format(day, 'yyyy-MM-dd'), { pending: 0, completed: 0 });
    });

    for (const obs of filteredObservations) {
        const dayKey = format(new Date(obs.date), 'yyyy-MM-dd');
        if (dataMap.has(dayKey)) {
            const dayData = dataMap.get(dayKey)!;
            if (obs.status === 'Completed') {
                dayData.completed += 1;
            } else {
                dayData.pending += 1;
            }
        }
    }

    return Array.from(dataMap.entries()).map(([dateStr, counts]) => ({
        day: format(new Date(dateStr), 'd'), // Use just day number for label
        ...counts
    }));
  }, [filteredObservations, date]);


  const riskDetailsData = React.useMemo(() => {
    const total = filteredObservations.length;
    if (total === 0) return [];

    const counts = filteredObservations.reduce((acc, obs) => {
      acc[obs.riskLevel] = (acc[obs.riskLevel] || 0) + 1;
      return acc;
    }, {} as Record<RiskLevel, number>);

    return (['Low', 'Medium', 'High', 'Critical'] as RiskLevel[]).map(level => ({
      name: level,
      value: Math.round(((counts[level] || 0) / total) * 100),
      count: counts[level] || 0,
      ...riskLevelConfig[level]
    }));
  }, [filteredObservations]);

  const dailyChartConfig = {
    pending: { label: "Pending", color: "hsl(var(--chart-4))" },
    completed: { label: "Completed", color: "hsl(var(--chart-1))" },
  };

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
      
      <div className="grid gap-6 md:grid-cols-2">
         <RadialChartCard 
            loading={loading}
            value={overviewData.pendingPercentage}
            count={overviewData.pendingCount}
            title="Laporan Terbuka"
            color="hsl(var(--chart-5))"
          />
          <RadialChartCard 
            loading={loading}
            value={overviewData.highRiskPercentage}
            count={overviewData.highRiskCount}
            title="Risiko Tinggi & Kritis"
            color="hsl(var(--destructive))"
          />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Tren Observasi Harian</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            {loading ? <Skeleton className="h-full w-full" /> : (
              <ChartContainer config={dailyChartConfig} className="h-full w-full">
                <BarChart data={dailyData} accessibilityLayer>
                  <ChartXAxis dataKey="day" tickLine={false} axisLine={false} />
                  <ChartYAxis tickLine={false} axisLine={false} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <ChartLegend content={<ChartLegendContent />} />
                  <ChartBar dataKey="completed" stackId="a" fill="var(--color-completed)" radius={[4, 4, 0, 0]} />
                  <ChartBar dataKey="pending" stackId="a" fill="var(--color-pending)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ChartContainer>
            )}
          </div>
        </CardContent>
      </Card>
      
      <Card>
          <CardHeader>
            <CardTitle>Detail Risiko</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading ? (
              Array.from({length: 4}).map((_, i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-8 w-12" />
                  <Skeleton className="h-4 flex-1" />
                  <Skeleton className="h-8 w-12" />
                </div>
              ))
            ) : (
              riskDetailsData.map((risk) => (
                <div key={risk.name} className="flex items-center gap-4 text-sm">
                  <span className="w-24 font-medium">{risk.name}</span>
                  <Progress value={risk.value} indicatorClassName={risk.className} />
                  <span className="w-16 text-right font-semibold">{risk.count}</span>
                </div>
              ))
            )}
          </CardContent>
        </Card>
    </div>
  );
}
