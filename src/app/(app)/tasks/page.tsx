
'use client';

import * as React from 'react';
import dynamic from 'next/dynamic';
import { format } from 'date-fns';
import type { Observation, RiskLevel, Company, Location } from '@/lib/types';
import { useAuth } from '@/hooks/use-auth';
import { useProjects } from '@/hooks/use-projects';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { FolderPlus, TrendingUp, AlertTriangle, CheckCircle, Sparkles } from 'lucide-react';
import { analyzeDashboardData, AnalyzeDashboardDataOutput } from '@/ai/flows/analyze-dashboard-data';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { cn } from '@/lib/utils';

const ChartContainer = dynamic(() => import('@/components/ui/chart').then(mod => mod.ChartContainer), {
  ssr: false,
  loading: () => <Skeleton className="h-[220px] w-full" />,
});
const BarChart = dynamic(() => import('@/components/ui/chart').then(mod => mod.BarChart), { ssr: false });
const PieChart = dynamic(() => import('@/components/ui/chart').then(mod => mod.PieChart), { ssr: false });
const RadialBarChart = dynamic(() => import('@/components/ui/chart').then(mod => mod.RadialBarChart), { ssr: false });
const ChartTooltip = dynamic(() => import('@/components/ui/chart').then(mod => mod.ChartTooltip), { ssr: false });
const ChartTooltipContent = dynamic(() => import('@/components/ui/chart').then(mod => mod.ChartTooltipContent), { ssr: false });
const ChartPie = dynamic(() => import('@/components/ui/chart').then(mod => mod.ChartPie), { ssr: false });
const ChartRadialBar = dynamic(() => import('@/components/ui/chart').then(mod => mod.ChartRadialBar), { ssr: false });
const ChartBar = dynamic(() => import('@/components/ui/chart').then(mod => mod.ChartBar), { ssr: false });
const ChartYAxis = dynamic(() => import('@/components/ui/chart').then(mod => mod.ChartYAxis), { ssr: false });
const ChartXAxis = dynamic(() => import('@/components/ui/chart').then(mod => mod.ChartXAxis), { ssr: false });
const ChartPolarAngleAxis = dynamic(() => import('@/components/ui/chart').then(mod => mod.ChartPolarAngleAxis), { ssr: false });
const ChartLegend = dynamic(() => import('@/components/ui/chart').then(mod => mod.ChartLegend), { ssr: false });
const ChartLegendContent = dynamic(() => import('@/components/ui/chart').then(mod => mod.ChartLegendContent), { ssr: false });
const ChartCell = dynamic(() => import('@/components/ui/chart').then(mod => mod.ChartCell), { ssr: false });

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

const AiAnalysisCard = ({ icon: Icon, title, content, color, loading }: { icon: React.ElementType; title: string; content: string; color: 'primary' | 'destructive' | 'chart-2'; loading: boolean; }) => {
  if (loading) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center gap-2 pb-2">
          <Skeleton className="h-6 w-6 rounded-full" />
          <Skeleton className="h-5 w-1/3" />
        </CardHeader>
        <CardContent className="space-y-2 pt-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
        </CardContent>
      </Card>
    );
  }

  if (!content) return null;

  const colorStyles = {
    primary: {
      card: 'bg-primary/5 border-primary/20',
      text: 'text-primary',
    },
    destructive: {
      card: 'bg-destructive/5 border-destructive/20',
      text: 'text-destructive',
    },
    'chart-2': {
      card: 'bg-chart-2/5 border-chart-2/20',
      text: 'text-chart-2',
    },
  };

  const styles = colorStyles[color];

  return (
    <Card className={styles.card}>
      <CardHeader className="flex flex-row items-center gap-2 pb-2">
        <Icon className={cn('h-5 w-5', styles.text)} />
        <CardTitle className={cn('text-base', styles.text)}>{title}</CardTitle>
      </CardHeader>
      <CardContent className="pt-2">
        <ul className="space-y-1 pl-1">
          {content.split('\n').filter(line => line.trim().replace(/^- /, '').length > 0).map((item, index) => (
            <li key={index} className="text-sm text-muted-foreground flex items-start gap-2">
              <span className={cn('mt-1', styles.text)}>&bull;</span>
              <span>{item.replace(/^- /, '')}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
};


const RadialChartCard = ({ loading, value, title, count, color }: { loading: boolean; value: number; title: string; count: number; color: string }) => {
  if (loading) {
    return (
      <Card className="col-span-1 lg:col-span-1">
        <CardHeader className="items-center pb-2">
          <Skeleton className="h-6 w-24" />
        </CardHeader>
        <CardContent className="pb-4">
          <div className="relative mx-auto aspect-square h-full max-h-[160px] sm:max-h-[180px]">
            <Skeleton className="h-full w-full rounded-full" />
          </div>
        </CardContent>
      </Card>
    )
  }

  const chartConfig = {
    metric: {
      label: title,
      color: color,
    },
  };
  const chartData = [{ name: title, value, fill: 'var(--color-metric)' }];

  return (
    <Card className="col-span-1 lg:col-span-1">
      <CardHeader className="items-center pb-2">
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="pb-4">
        <div className="relative mx-auto aspect-square h-full max-h-[160px] sm:max-h-[180px]">
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
    <Card className="col-span-1 lg:col-span-1">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="p-0 sm:p-4 sm:pt-0">
        <div className="h-[220px] sm:h-[250px] w-full">
          {loading ? (
            <Skeleton className="h-full w-full" />
          ) : data.length > 0 ? (
            <ChartContainer config={chartConfig} className="h-full w-full">
              <BarChart
                data={data}
                layout="vertical"
                accessibilityLayer
                margin={{ left: 20, right: 10 }}
              >
                <ChartYAxis
                  dataKey={nameKey}
                  type="category"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={5}
                  tick={{ fontSize: 12, fill: "hsl(var(--foreground))" }}
                  interval={0}
                  width={80}
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
                  barSize={12}
                />
              </BarChart>
            </ChartContainer>
          ) : (
            <div className="flex h-full w-full items-center justify-center text-muted-foreground">
              <p>No data available.</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};


export default function DashboardPage() {
  const { user, userProfile } = useAuth();
  const { projects, loading: projectsLoading } = useProjects();
  const [projectObservations, setProjectObservations] = React.useState<Observation[]>([]);
  const [dataLoading, setDataLoading] = React.useState(true);
  const [analysis, setAnalysis] = React.useState<AnalyzeDashboardDataOutput | null>(null);
  const [analysisLoading, setAnalysisLoading] = React.useState(true);

  // The main loading state for the page, true if either projects list or observations are loading.
  const loading = dataLoading || projectsLoading;
  const isAiEnabled = userProfile?.aiEnabled ?? true;

  React.useEffect(() => {
    const fetchProjectObservations = async () => {
      // Don't fetch if projects are still loading or there's no user.
      if (projectsLoading || !user) return;

      const projectIds = projects.map(p => p.id);
      if (projectIds.length === 0) {
        setDataLoading(false);
        setProjectObservations([]);
        return;
      }

      setDataLoading(true);
      try {
        const observationsPromises: Promise<Observation[]>[] = [];
        
        // Firestore 'in' query is limited to 30 elements. Chunk the project IDs.
        for (let i = 0; i < projectIds.length; i += 30) {
            const chunk = projectIds.slice(i, i + 30);
            const q = query(
                collection(db, 'observations'),
                where('scope', '==', 'project'),
                where('projectId', 'in', chunk),
                limit(500) // Add a reasonable limit per chunk to avoid massive fetches
            );
            observationsPromises.push(getDocs(q).then(snap => snap.docs.map(doc => ({...doc.data(), id: doc.id}) as Observation)));
        }
        
        const snapshots = await Promise.all(observationsPromises);
        const allObservations = snapshots.flat();

        setProjectObservations(allObservations);
      } catch (error) {
        console.error("Failed to fetch project observations for dashboard:", error);
        setProjectObservations([]);
      } finally {
        setDataLoading(false);
      }
    };
    fetchProjectObservations();
  }, [user, projects, projectsLoading]);


  const overviewData = React.useMemo(() => {
    const total = projectObservations.length;
    if (total === 0) return { pendingPercentage: 0, pendingCount: 0 };
    const pendingCount = projectObservations.filter(o => o.status !== 'Completed').length;
    return {
      pendingPercentage: total > 0 ? Math.round((pendingCount / total) * 100) : 0,
      pendingCount,
    };
  }, [projectObservations]);

  const criticalPercentageData = React.useMemo(() => {
    const total = projectObservations.length;
    if (total === 0) return { percentage: 0, count: 0 };
    const criticalCount = projectObservations.filter(o => o.riskLevel === 'Critical').length;
    return {
      percentage: total > 0 ? Math.round((criticalCount / total) * 100) : 0,
      count: criticalCount,
    };
  }, [projectObservations]);

  const dailyData = React.useMemo(() => {
    const dataMap = new Map<string, { pending: number, completed: number }>();
    
    for (let i = 6; i >= 0; i--) {
      const day = new Date();
      day.setDate(day.getDate() - i);
      const dayKey = format(day, 'yyyy-MM-dd');
      dataMap.set(dayKey, { pending: 0, completed: 0 });
    }

    for (const obs of projectObservations) {
        if (!obs.date) continue;
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
        day: format(new Date(`${dateStr}T00:00:00`), 'd/M'), // Avoid timezone issues
        ...counts
    }));
  }, [projectObservations]);


  const riskDetailsData = React.useMemo(() => {
    const counts = projectObservations.reduce((acc, obs) => {
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
  }, [projectObservations]);
  
  const companyDistributionData = React.useMemo(() => {
    const counts = projectObservations.reduce((acc, obs) => {
      acc[obs.company] = (acc[obs.company] || 0) + 1;
      return acc;
    }, {} as Record<Company, number>);

    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [projectObservations]);

  const locationDistributionData = React.useMemo(() => {
    const counts = projectObservations.reduce((acc, obs) => {
      acc[obs.location] = (acc[obs.location] || 0) + 1;
      return acc;
    }, {} as Record<Location, number>);

    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [projectObservations]);

  React.useEffect(() => {
    const getAnalysis = async () => {
      if (loading || projectObservations.length === 0 || !userProfile || !isAiEnabled) {
        setAnalysis(null);
        setAnalysisLoading(false);
        return;
      }
      setAnalysisLoading(true);
      try {
        const result = await analyzeDashboardData({
          totalObservations: projectObservations.length,
          pendingPercentage: overviewData.pendingPercentage,
          criticalPercentage: criticalPercentageData.percentage,
          riskDistribution: riskDetailsData.map(d => ({ name: d.name, count: d.count })),
          companyDistribution: companyDistributionData,
          dailyTrend: dailyData,
        }, userProfile);
        setAnalysis(result);
      } catch (error) {
        console.error("Failed to get AI dashboard analysis:", error);
        setAnalysis(null); // Clear previous analysis on error
      } finally {
        setAnalysisLoading(false);
      }
    };
    getAnalysis();
  }, [projectObservations, loading, userProfile, isAiEnabled, overviewData, criticalPercentageData, riskDetailsData, companyDistributionData, dailyData]);


  const RADIAN = Math.PI / 180;
  const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, name }: any) => {
    if (!percent || percent < 0.05) { 
      return null;
    }
    const radius = innerRadius + (outerRadius - innerRadius) * 0.7;
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
        className="text-xs font-semibold"
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };
  
  if (!loading && projects.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center bg-card p-8 rounded-lg border-dashed">
        <FolderPlus className="h-16 w-16 text-muted-foreground" />
        <h3 className="mt-4 text-2xl font-bold">Mulai dengan Proyek Pertama Anda</h3>
        <p className="mt-2 max-w-md text-muted-foreground">
          Dashboard ini akan menampilkan analitik dari laporan di dalam proyek Anda. Buat atau gabung dengan proyek untuk memulai.
        </p>
         <Button asChild className="mt-6">
          <Link href="/beranda">Pergi ke Project Hub</Link>
        </Button>
      </div>
    );
  }


  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <h2 className="text-2xl font-bold tracking-tight">Dashboard Proyek</h2>
      </div>

      {isAiEnabled && (!loading || analysis) && (
        <>
          <div className="flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-primary" />
            <h3 className="text-xl font-semibold">Wawasan Analisis AI</h3>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <AiAnalysisCard 
              loading={analysisLoading}
              icon={TrendingUp}
              title="Tren Utama"
              content={analysis?.keyTrends ?? ''}
              color="primary"
            />
            <AiAnalysisCard 
              loading={analysisLoading}
              icon={AlertTriangle}
              title="Potensi Risiko"
              content={analysis?.emergingRisks ?? ''}
              color="destructive"
            />
            <AiAnalysisCard 
              loading={analysisLoading}
              icon={CheckCircle}
              title="Perkembangan Positif"
              content={analysis?.positiveHighlights ?? ''}
              color="chart-2"
            />
          </div>
        </>
      )}
      
       <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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

       <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
         <Card className="col-span-1 lg:col-span-1">
            <CardHeader>
                <CardTitle>Detail Risiko</CardTitle>
                <CardDescription>Distribusi laporan berdasarkan tingkat risiko.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="h-[220px] sm:h-[250px] w-full">
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
                                innerRadius="55%"
                                outerRadius="90%"
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
        
        <Card className="col-span-1 lg:col-span-1">
            <CardHeader>
            <CardTitle>Tren Observasi Harian</CardTitle>
            <CardDescription>Jumlah laporan selesai vs. pending selama 7 hari terakhir.</CardDescription>
            </CardHeader>
            <CardContent>
            <div className="h-[220px] sm:h-[250px] w-full">
                {loading ? <Skeleton className="h-full w-full" /> : (
                <ChartContainer config={dailyChartConfig} className="h-full w-full">
                    <BarChart data={dailyData} accessibilityLayer>
                    <ChartXAxis dataKey="day" tickLine={false} axisLine={false} tickMargin={5} tick={{ fontSize: 10 }} />
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
