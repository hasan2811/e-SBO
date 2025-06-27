
'use client';

import * as React from 'react';
import { format, subDays, eachDayOfInterval, addDays } from 'date-fns';
import { DateRange } from 'react-day-picker';
import { Calendar as CalendarIcon, CheckCircle, PieChart as PieChartIcon, BarChart2 } from 'lucide-react';

import type { Observation, RiskLevel, Company, Location } from '@/lib/types';
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
  ChartLegendContent,
  ChartCell,
} from '@/components/ui/chart';
import { Skeleton } from '@/components/ui/skeleton';

const companyChartConfig = {
    value: { label: "Observations", color: "hsl(var(--chart-1))" },
};
  
const locationChartConfig = {
    value: { label: "Observations", color: "hsl(var(--chart-2))" },
};

const dailyChartConfig = {
    pending: { label: "Pending", color: "hsl(var(--chart-5))", icon: 'circle' },
    completed: { label: "Completed", color: "hsl(var(--chart-2))", icon: 'circle' },
  };

const riskPieChartConfig = {
    Low: { label: "Low", color: "hsl(var(--chart-2))", icon: 'circle' },
    Medium: { label: "Medium", color: "hsl(var(--chart-4))", icon: 'circle' },
    High: { label: "High", color: "hsl(var(--chart-5))", icon: 'circle' },
    Critical: { label: "Critical", color: "hsl(var(--destructive))", icon: 'circle' },
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
      <CardContent className="pb-4">
        <div className="relative mx-auto aspect-square h-full max-h-[200px]">
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
              className="absolute inset-0 flex flex-col items-center justify-center gap-1"
              aria-hidden="true"
            >
              <span className="text-3xl font-bold sm:text-4xl" style={{ color }}>
                {value}%
              </span>
              <span className="text-sm text-muted-foreground">
                ({count} Laporan)
              </span>
            </div>
        </div>
      </CardContent>
    </Card>
  );
};


const HorizontalBarChartCard = ({ loading, title, data, chartConfig, dataKey, nameKey, color }: { loading: boolean; title: string; data: any[]; chartConfig: any; dataKey: string; nameKey: string; color: string; }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[250px] w-full">
          {loading ? (
            <Skeleton className="h-full w-full" />
          ) : data.length > 0 ? (
            <ChartContainer config={chartConfig} className="h-full w-full">
              <BarChart 
                data={data} 
                layout="vertical" 
                accessibilityLayer 
                margin={{ left: 120, right: 10 }}
              >
                <ChartYAxis
                  dataKey={nameKey}
                  type="category"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={5}
                  tick={{ fontSize: 12 }}
                  interval={0}
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

  const criticalPercentageData = React.useMemo(() => {
    const total = filteredObservations.length;
    if (total === 0) return { percentage: 0, count: 0 };

    const criticalCount = filteredObservations.filter(o => o.riskLevel === 'Critical').length;
    
    return {
      percentage: Math.round((criticalCount / total) * 100),
      count: criticalCount,
    };
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
    const counts = filteredObservations.reduce((acc, obs) => {
      acc[obs.riskLevel] = (acc[obs.riskLevel] || 0) + 1;
      return acc;
    }, {} as Record<RiskLevel, number>);

    return (Object.keys(riskPieChartConfig) as RiskLevel[])
      .map((level) => ({
        name: level,
        count: counts[level] || 0,
        fill: riskPieChartConfig[level].color
      }))
      .filter((item) => item.count > 0);
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

  const RADIAN = Math.PI / 180;
  const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, name }: any) => {
    if (!percent) { 
      return null;
    }
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);
  
    const isLight = name === 'Medium' || name === 'Low';
    const textColor = isLight ? 'hsl(var(--card-foreground))' : 'hsl(var(--primary-foreground))';
  
    return (
      <text
        x={x}
        y={y}
        fill={textColor}
        textAnchor="middle"
        dominantBaseline="central"
        className="text-sm font-semibold"
      >
        {`${(percent * 100).toFixed(0)}%`}
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
                />
              </PopoverContent>
            </Popover>
        </div>
      </div>
      
       <div className="grid gap-6 sm:grid-cols-2">
         <RadialChartCard 
          loading={loading}
          value={overviewData.pendingPercentage}
          count={overviewData.pendingCount}
          title="Open Status"
          color="hsl(var(--chart-5))"
        />
        <RadialChartCard 
          loading={loading}
          value={criticalPercentageData.percentage}
          count={criticalPercentageData.count}
          title="Finding Kritis"
          color="hsl(var(--destructive))"
        />
      </div>

       <div className="grid gap-6 md:grid-cols-2">
         <Card>
            <CardHeader>
                <CardTitle>Detail Risiko</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="h-[250px] w-full">
                {loading ? (
                    <Skeleton className="h-full w-full" />
                ) : riskDetailsData.length > 0 ? (
                    <ChartContainer
                        config={riskPieChartConfig}
                        className="mx-auto aspect-square h-full"
                    >
                        <PieChart>
                            <ChartTooltip formatter={(value, name, item) => `${item.payload.count} (${(value as number).toFixed(0)}%)`} content={<ChartTooltipContent nameKey="name" />} />
                            <ChartPie
                                data={riskDetailsData}
                                dataKey="count"
                                nameKey="name"
                                innerRadius="65%"
                                outerRadius="95%"
                                labelLine={false}
                                label={renderCustomizedLabel}
                            >
                              {riskDetailsData.map((entry) => (
                                <ChartCell key={`cell-${entry.name}`} fill={entry.fill} className="stroke-background" />
                              ))}
                            </ChartPie>
                            <ChartLegend content={<ChartLegendContent nameKey="name" />} />
                        </PieChart>
                    </ChartContainer>
                ) : (
                <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                    <p>No risk data for this period.</p>
                </div>
                )}
                </div>
            </CardContent>
        </Card>
        
        <Card>
            <CardHeader>
            <CardTitle>Tren Observasi Harian</CardTitle>
            </CardHeader>
            <CardContent>
            <div className="h-[250px] w-full">
                {loading ? <Skeleton className="h-full w-full" /> : (
                <ChartContainer config={dailyChartConfig} className="h-full w-full">
                    <BarChart data={dailyData} accessibilityLayer>
                    <ChartXAxis dataKey="day" tickLine={false} axisLine={false} />
                    <ChartYAxis tickLine={false} axisLine={false} allowDecimals={false} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <ChartLegend content={<ChartLegendContent align="center" />} />
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
      </div>
    </div>
  );
}
