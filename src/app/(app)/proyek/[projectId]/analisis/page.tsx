
'use client';

import * as React from 'react';
import { useParams } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { useDashboardData } from '@/hooks/use-dashboard-data';
import { analyzeDashboardData } from '@/ai/flows/analyze-dashboard-data';
import type { AnalyzeDashboardDataOutput, Observation } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ChartContainer, ChartTooltip, ChartTooltipContent, PieChart as PieChartContainer, BarChart as BarChartContainer } from '@/components/ui/chart';
import { Pie, Cell, Bar, XAxis, YAxis, CartesianGrid, Legend } from 'recharts';
import { Sparkles, Loader2, AlertTriangle, TrendingUp, BellRing, ShieldAlert, BrainCircuit } from 'lucide-react';

const StatCard = ({ title, value, description, icon: Icon, isLoading }: { title: string, value: string, description: string, icon: React.ElementType, isLoading: boolean }) => (
    <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{title}</CardTitle>
            <Icon className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
            {isLoading ? (
                <>
                    <Skeleton className="h-8 w-1/2 mt-1" />
                    <Skeleton className="h-4 w-3/4 mt-2" />
                </>
            ) : (
                <>
                    <div className="text-2xl font-bold">{value}</div>
                    <p className="text-xs text-muted-foreground">{description}</p>
                </>
            )}
        </CardContent>
    </Card>
);

const AiInsightCard = ({ title, content, icon: Icon }: { title: string, content: string, icon: React.ElementType }) => (
    <Card className="h-full">
        <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
                <Icon className="h-5 w-5 text-primary" />
                {title}
            </CardTitle>
        </CardHeader>
        <CardContent>
            <div className="space-y-2 text-sm text-muted-foreground">
                {content.split('- ').filter(line => line.trim()).map((line, index) => (
                    <p key={index}>- {line.trim()}</p>
                ))}
            </div>
        </CardContent>
    </Card>
);

const COLORS = ["hsl(var(--chart-2))", "hsl(var(--chart-4))", "hsl(var(--chart-5))", "hsl(var(--destructive))", "hsl(var(--chart-3))"];

const RiskDistributionChart = ({ data, isLoading }: { data: Array<{ name: string; count: number }>, isLoading: boolean }) => {
    const chartConfig = data.reduce((acc, item, index) => {
        acc[item.name] = { label: item.name, color: COLORS[index % COLORS.length] };
        return acc;
    }, {} as any);

    return (
     <Card>
        <CardHeader>
            <CardTitle>Distribusi Risiko</CardTitle>
            <CardDescription>Persentase observasi berdasarkan tingkat risiko.</CardDescription>
        </CardHeader>
        <CardContent>
            {isLoading ? <Skeleton className="w-full h-[250px]" /> : data.length > 0 ? (
            <ChartContainer config={chartConfig} className="mx-auto aspect-square h-[250px]">
                <PieChartContainer>
                    <ChartTooltip content={<ChartTooltipContent nameKey="name" />} />
                    <Pie data={data} dataKey="count" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}>
                       {data.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                    </Pie>
                    <Legend />
                </PieChartContainer>
            </ChartContainer>
            ) : <p className="text-sm text-muted-foreground text-center pt-10">Data tidak cukup untuk menampilkan chart.</p>}
        </CardContent>
    </Card>
    );
};

const DailyTrendChart = ({ data, isLoading }: { data: Array<any>, isLoading: boolean }) => {
    const chartConfig = {
        pending: { label: "Tertunda", color: "hsl(var(--chart-5))" },
        completed: { label: "Selesai", color: "hsl(var(--chart-2))" },
    };
    return (
         <Card>
            <CardHeader>
                <CardTitle>Tren Harian (7 Hari Terakhir)</CardTitle>
                <CardDescription>Jumlah observasi yang tertunda vs. selesai per hari.</CardDescription>
            </CardHeader>
            <CardContent>
                {isLoading ? <Skeleton className="w-full h-[250px]" /> : (
                     <ChartContainer config={chartConfig} className="w-full h-[250px]">
                        <BarChartContainer data={data} accessibilityLayer>
                            <CartesianGrid vertical={false} />
                            <XAxis dataKey="day" tickLine={false} tickMargin={10} axisLine={false} />
                            <YAxis />
                            <ChartTooltip content={<ChartTooltipContent />} />
                            <Legend />
                            <Bar dataKey="pending" stackId="a" fill="var(--color-pending)" radius={[4, 4, 0, 0]} />
                            <Bar dataKey="completed" stackId="a" fill="var(--color-completed)" radius={[4, 4, 0, 0]} />
                        </BarChartContainer>
                    </ChartContainer>
                )}
            </CardContent>
        </Card>
    );
}

export default function AnalysisPage() {
    const params = useParams();
    const projectId = params.projectId as string;
    const { userProfile, loading: authLoading } = useAuth();
    const { items, isLoading: dataLoading } = useDashboardData(projectId);
    const { toast } = useToast();

    const [isAnalyzing, setIsAnalyzing] = React.useState(false);
    const [analysisResult, setAnalysisResult] = React.useState<AnalyzeDashboardDataOutput | null>(null);

    const isLoading = authLoading || dataLoading;

    const observations = React.useMemo(() => items.filter(item => item.itemType === 'observation') as Observation[], [items]);
    
    // Calculate metrics
    const totalObservations = observations.length;
    const pendingCount = observations.filter(obs => obs.status !== 'Completed').length;
    const criticalCount = observations.filter(obs => obs.riskLevel === 'Critical').length;
    const pendingPercentage = totalObservations > 0 ? (pendingCount / totalObservations * 100).toFixed(0) : '0';
    const criticalPercentage = totalObservations > 0 ? (criticalCount / totalObservations * 100).toFixed(0) : '0';

    const riskDistribution = React.useMemo(() => {
        const counts = observations.reduce((acc, obs) => {
            acc[obs.riskLevel] = (acc[obs.riskLevel] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);
        return Object.entries(counts).map(([name, count]) => ({ name, count }));
    }, [observations]);

    const companyDistribution = React.useMemo(() => {
        const counts = observations.reduce((acc, obs) => {
            acc[obs.company] = (acc[obs.company] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);
        return Object.entries(counts).map(([name, value]) => ({ name, value }));
    }, [observations]);

    const dailyTrend = React.useMemo(() => {
        const trendData: { [key: string]: { day: string, pending: number, completed: number } } = {};
        const last7Days = Array.from({ length: 7 }).map((_, i) => {
            const d = new Date();
            d.setDate(d.getDate() - i);
            return d.toISOString().split('T')[0];
        }).reverse();
        
        last7Days.forEach(day => {
            trendData[day] = { day: new Date(day).toLocaleDateString('id-ID', { weekday: 'short'}), pending: 0, completed: 0 };
        });

        observations.forEach(obs => {
            const day = obs.date.split('T')[0];
            if (trendData[day]) {
                if (obs.status === 'Completed') {
                    trendData[day].completed += 1;
                } else {
                    trendData[day].pending += 1;
                }
            }
        });
        return Object.values(trendData);
    }, [observations]);


    const handleAnalyze = async () => {
        if (!userProfile) {
            toast({ variant: 'destructive', title: 'User profile not found.' });
            return;
        }
        if (totalObservations === 0) {
            toast({ variant: 'destructive', title: 'Tidak ada data', description: 'Tidak ada data observasi untuk dianalisis.' });
            return;
        }
        setIsAnalyzing(true);
        setAnalysisResult(null);
        try {
            const result = await analyzeDashboardData({
                totalObservations,
                pendingPercentage: parseFloat(pendingPercentage),
                criticalPercentage: parseFloat(criticalPercentage),
                riskDistribution,
                companyDistribution,
                dailyTrend,
            }, userProfile);
            setAnalysisResult(result);
            toast({ title: "Analisis Selesai", description: "AI telah menghasilkan wawasan baru untuk proyek Anda." });
        } catch (error) {
            console.error("AI Analysis failed:", error);
            const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
            toast({ variant: 'destructive', title: 'Analisis Gagal', description: errorMessage });
        } finally {
            setIsAnalyzing(false);
        }
    };

    if (!userProfile?.aiEnabled) {
        return (
             <div className="flex items-center justify-center h-full pt-16">
                <Card className="w-full max-w-lg text-center p-8">
                    <CardHeader>
                        <AlertTriangle className="h-12 w-12 text-destructive mx-auto" />
                        <CardTitle className="mt-4">Fitur AI Dinonaktifkan</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-muted-foreground">
                           Fitur analisis AI saat ini dinonaktifkan untuk akun Anda. Anda dapat mengaktifkannya di pengaturan akun Anda.
                        </p>
                    </CardContent>
                </Card>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Dashboard Analisis AI</h1>
                    <p className="text-muted-foreground">Wawasan cerdas yang didukung oleh AI untuk data HSSE proyek Anda.</p>
                </div>
                <Button onClick={handleAnalyze} disabled={isAnalyzing || isLoading}>
                    {isAnalyzing ? <Loader2 className="mr-2 animate-spin" /> : <Sparkles className="mr-2" />}
                    Jalankan Analisis AI
                </Button>
            </div>
            
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <StatCard title="Total Observasi" value={`${totalObservations}`} description="Jumlah total laporan" icon={TrendingUp} isLoading={isLoading} />
                <StatCard title="Isu Tertunda" value={`${pendingPercentage}%`} description={`${pendingCount} dari ${totalObservations} laporan`} icon={BellRing} isLoading={isLoading} />
                <StatCard title="Risiko Kritis" value={`${criticalPercentage}%`} description={`${criticalCount} dari ${totalObservations} laporan`} icon={ShieldAlert} isLoading={isLoading} />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
                <RiskDistributionChart data={riskDistribution} isLoading={isLoading} />
                <DailyTrendChart data={dailyTrend} isLoading={isLoading} />
            </div>

            {isAnalyzing && (
                 <div className="text-center py-10">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
                    <p className="mt-4 text-muted-foreground">AI sedang menganalisis data Anda... ini mungkin memakan waktu sejenak.</p>
                </div>
            )}

            {analysisResult && (
                <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-3">
                   <AiInsightCard title="Tren Utama" content={analysisResult.keyTrends} icon={TrendingUp} />
                   <AiInsightCard title="Risiko Baru" content={analysisResult.emergingRisks} icon={AlertTriangle} />
                   <AiInsightCard title="Sorotan Positif" content={analysisResult.positiveHighlights} icon={Sparkles} />
                </div>
            )}
        </div>
    );
}
