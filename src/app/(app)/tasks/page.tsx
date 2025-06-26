'use client';

import * as React from 'react';
import { format, subDays, eachDayOfInterval, addDays } from 'date-fns';
import { DateRange } from 'react-day-picker';
import { Calendar as CalendarIcon } from 'lucide-react';

import type { Observation, RiskLevel, ObservationCategory, Company, Location } from '@/lib/types';
import { useObservations } from '@/contexts/observation-context';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  BarChart,
  PieChart,
  ChartPie,
  RadialBarChart,
  ChartRadialBar,
  ChartBar,
  ChartYAxis,
  ChartXAxis,
  ChartPolarAngleAxis,
  ChartLegend,
} from '@/components/ui/chart';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';

const riskLevelConfig: Record<RiskLevel, { color: string, className: string }> = {
  Low: { color: 'hsl(var(--chart-2))', className: 'bg-chart-2' },
  Medium: { color: 'hsl(var(--chart-4))', className: 'bg-chart-4' },
  High: { color: 'hsl(var(--chart-5))', className: 'bg-chart-5' },
  Critical: { color: 'hsl(var(--destructive))', className: 'bg-destructive' },
};

const dailyChartConfig = {
    pending: { label: "Pending", color: "hsl(var(--chart-4))" },
    completed: { label: "Completed", color: "hsl(var(--chart-1))" },
};
  
const categoryChartConfig = {
    Structural: { label: "Structural", color: "hsl(var(--chart-1))" },
    Electrical: { label: "Electrical", color: "hsl(var(--chart-2))" },
    Plumbing: { label: "Plumbing", color: "hsl(var(--chart-3))" },
    General: { label: "General", color: "hsl(var(--chart-4))" },
};

const companyChartConfig = {
    value: { label: "Observations", color: "hsl(var(--chart-1))" },
};
  
const locationChartConfig = {
    value: { label: "Observations", color: "hsl(var(--chart-2))" },
};

const RadialChartCard = ({ loading, value, title, count, color }: { loading: boolean; value: number; title: string; count: number; color: string }) => {
  const chartConfig = {
    metric: {
      label: title,
      color: color,
    },
  };
  const chartData = [{ name: title, value, fill: 'var(--color-metric)' }];

  return (
    <Card>
      <CardHeader className="items-center pb-2">
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 pb-0">
        <div className="relative mx-auto aspect-square h-full max-h-[250px]">
            <ChartContainer
              config={chartConfig}
              className="h-full w-full"
            >
              <RadialBarChart
                data={chartData}
                startAngle={90}
                endAngle={-270}
                innerRadius="80%"
                outerRadius="100%"
                barSize={12}
              >
                <ChartPolarAngleAxis key={title} type="number" domain={[0, 100]} tick={false} />
                <ChartRadialBar
                  dataKey="value"
                  background={{ fill: 'hsl(var(--muted))' }}
                  cornerRadius={6}
                  fill={color}
                />
              </RadialBarChart>
            </ChartContainer>
            <div
              className="absolute inset-0 flex flex-col items-center justify-center"
              aria-hidden="true"
            >
              <span className="text-3xl font-bold sm:text-4xl" style={{ color }}>
                {value}%
              </span>
            </div>
        </div>
      </CardContent>
      <CardFooter className="flex-col items-center text-sm pt-4">
        <div className="leading-none text-muted-foreground">
          ({count} Laporan)
        </div>
      </CardFooter>
    </Card>
  );
};

const HorizontalBarChartCard = ({ loading, title, data, chartConfig, dataKey, nameKey, color }: { loading: boolean; title: string; data: any[]; chartConfig: any; dataKey: string; nameKey: string; color: string; }) => {
  const chartHeight = React.useMemo(() => Math.max(150, data.length * 40), [data.length]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div style={{ height: `${chartHeight}px` }}>
          {loading ? (
            <Skeleton className="h-full w-full" />
          ) : data.length > 0 ? (
            <ChartContainer config={chartConfig} className="h-full w-full">
              <BarChart data={data} layout="vertical" accessibilityLayer margin={{ left: 10 }}>
                <ChartYAxis
                  dataKey={nameKey}
                  type="category"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={10}
                  className="text-xs"
                  width={100}
                />
                <ChartXAxis dataKey={dataKey} type="number" hide />
                <ChartTooltip
                  cursor={false}
                  content={<ChartTooltipContent indicator="line" />}
                />
                <ChartBar
                  dataKey={dataKey}
                  fill={color}
                  radius={4}
                  barSize={16}
                />
              </BarChart>
            </ChartContainer>
          ) : (
            <div className="flex h-full w-full items-center justify-center text-muted-foreground">
              <p>No data for this period.</p>
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
    from: subDays(new Date(), 6),
    to: new Date(),
  });
  
  const filteredObservations = React.useMemo(() => {
    if (!date?.from) return observations;
    const from = date.from;
    const to = date.to && date.to > from ? date.to : from;

    const startDate = new Date(from);
    startDate.setHours(0, 0, 0, 0);

    const endDate = new Date(to);
    endDate.setHours(23, 59, 59, 999);

    return observations.filter(obs => {
      const obsDate = new Date(obs.date);
      return obsDate >= startDate && obsDate <= endDate;
    });
  }, [observations, date]);

  const overviewData = React.useMemo(() => {
    const total = filteredObservations.length;
    if (total === 0) return { pendingPercentage: 0, pendingCount: 0 };

    const pendingCount = filteredObservations.filter(o => o.status !== 'Completed').length;
    
    return {
      pendingPercentage: Math.round((pendingCount / total) * 100),
      pendingCount,
    };
  }, [filteredObservations]);
  
  const categoryDistributionData = React.useMemo(() => {
      const categoryCounts = filteredObservations.reduce((acc, obs) => {
        acc[obs.category] = (acc[obs.category] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      return (Object.keys(categoryChartConfig) as string[]).map((category) => ({
        name: category,
        value: categoryCounts[category as ObservationCategory] || 0,
        fill: `var(--color-${category})`,
      })).filter(item => item.value > 0);
  }, [filteredObservations]);


  const dailyData = React.useMemo(() => {
    const from = date?.from ? date.from : new Date();
    const to = date?.to && date.to > from ? date.to : from;
    const daysInRange = eachDayOfInterval({ start: from, end: to });

    const dataMap = new Map<string, { pending: number, completed: number }>();
     daysInRange.forEach(day => {
        dataMap.set(format(day, 'yyyy-MM-dd'), { pending: 0, completed: 0 });
    });

    for (const obs of filteredObservations) {
        const dayKey = format(new Date(obs.date), 'yyyy-M-d');
        const mapKey = format(new Date(obs.date), 'yyyy-MM-dd');
        if (dataMap.has(mapKey)) {
            const dayData = dataMap.get(mapKey)!;
            if (obs.status === 'Completed') {
                dayData.completed += 1;
            } else {
                dayData.pending += 1;
            }
        }
    }

    return Array.from(dataMap.entries()).map(([dateStr, counts]) => ({
        day: format(addDays(new Date(dateStr), 1), 'EEE'),
        ...counts
    }));
  }, [filteredObservations, date]);


  const riskDetailsData = React.useMemo(() => {
    const total = filteredObservations.length;
    const counts = filteredObservations.reduce((acc, obs) => {
      acc[obs.riskLevel] = (acc[obs.riskLevel] || 0) + 1;
      return acc;
    }, {} as Record<RiskLevel, number>);

    return (['Low', 'Medium', 'High', 'Critical'] as RiskLevel[]).map(level => ({
      name: level,
      value: total > 0 ? Math.round(((counts[level] || 0) / total) * 100) : 0,
      count: counts[level] || 0,
      ...riskLevelConfig[level]
    }));
  }, [filteredObservations]);
  
  const companyDistributionData = React.useMemo(() => {
    const counts = filteredObservations.reduce((acc, obs) => {
      acc[obs.company] = (acc[obs.company] || 0) + 1;
      return acc;
    }, {} as Record<Company, number>);

    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [filteredObservations]);

  const locationDistributionData = React.useMemo(() => {
    const counts = filteredObservations.reduce((acc, obs) => {
      acc[obs.location] = (acc[obs.location] || 0) + 1;
      return acc;
    }, {} as Record<Location, number>);

    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [filteredObservations]);

  // Custom label renderer for the pie chart
  const renderCustomizedLabel = (props: any) => {
    const { cx, cy, midAngle, outerRadius, percent, name } = props;
    const RADIAN = Math.PI / 180;
    const radius = outerRadius + 25; // Position labels outside the pie
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text
        x={x}
        y={y}
        style={{ fill: 'hsl(var(--foreground))', fontSize: '12px' }}
        textAnchor={x > cx ? 'start' : 'end'}
        dominantBaseline="central"
      >
        {`${name} - ${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <h2 className="text-2xl font-bold tracking-tight">Dashboard</h2>
        <div className="flex items-center gap-2 w-full sm:w-auto">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  id="date"
                  variant={'outline'}
                  className={cn(
                    'w-full sm:w-[260px] justify-start text-left font-normal',
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
                  numberOfMonths={1}
                  max={7}
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
          <Card>
            <CardHeader>
              <CardTitle>Distribusi Kategori</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[250px]">
               {loading ? (
                  <Skeleton className="h-full w-full rounded-full" />
                ) : categoryDistributionData.length > 0 ? (
                  <ChartContainer
                      config={categoryChartConfig}
                      className="h-full w-full"
                  >
                      <PieChart margin={{ top: 30, right: 40, bottom: 30, left: 40 }}>
                        <ChartTooltip content={<ChartTooltipContent nameKey="name" />} />
                        <ChartPie
                            data={categoryDistributionData}
                            dataKey="value"
                            nameKey="name"
                            innerRadius={60}
                            outerRadius={80}
                            strokeWidth={5}
                            labelLine
                            label={renderCustomizedLabel}
                        />
                      </PieChart>
                  </ChartContainer>
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                    <p>No category data for this period.</p>
                  </div>
                )
               }
              </div>
            </CardContent>
          </Card>
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
                  <ChartLegend />
                  <ChartBar dataKey="completed" stackId="a" fill="var(--color-completed)" radius={[4, 4, 0, 0]} />
                  <ChartBar dataKey="pending" stackId="a" fill="var(--color-pending)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ChartContainer>
            )}
          </div>
        </CardContent>
      </Card>
      
      <HorizontalBarChartCard
        loading={loading}
        title="Observasi per Perusahaan"
        data={companyDistributionData}
        chartConfig={companyChartConfig}
        dataKey="value"
        nameKey="name"
        color="hsl(var(--chart-1))"
      />
      <HorizontalBarChartCard
        loading={loading}
        title="Observasi per Lokasi"
        data={locationDistributionData}
        chartConfig={locationChartConfig}
        dataKey="value"
        nameKey="name"
        color="hsl(var(--chart-2))"
      />
      
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
