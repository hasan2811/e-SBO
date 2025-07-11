
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
import { Sparkles, Loader2, AlertTriangle, TrendingUp, BellRing, ShieldAlert, BrainCircuit, ListChecks } from 'lucide-react';

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

const COLORS = ["hsl(var(--chart-2))", "hsl(var(--chart-4))", "hsl(var(--chart-5))", "hsl(var(--destructive))", "hsl(var(--chart-3))"];

const RiskDistributionChart = ({ data, isLoading }: { data: Array<{ name: string; count: number }>, isLoading: boolean }) => {
    const chartConfig = data.reduce((acc, item, index) => {
        acc[item.name] = { label: item.name, color: COLORS[index % COLORS.length] };
        return acc;
    }, {} as any);

    return (
     <Card>
        <CardHeader>
            <CardTitle>Risk Distribution</CardTitle>
            <CardDescription>Percentage of observations by risk level.</CardDescription>
        </CardHeader>
        <CardContent>
            {isLoading ? <Skeleton className="w-full h-[250px]" /> : data.length > 0 ? (
            <ChartContainer config={chartConfig} className="mx-auto aspect-square h-[250px]">
                <PieChartContainer>
                    <ChartTooltip content={<ChartTooltipContent nameKey="count" />} />
                    <Pie data={data} dataKey="count" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}>
                       {data.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                    </Pie>
                    <Legend />
                </PieChartContainer>
            </ChartContainer>
            ) : <p className="text-sm text-muted-foreground text-center pt-10">Not enough data to display chart.</p>}
        </CardContent>
    </Card>
    );
};

const DailyTrendChart = ({ data, isLoading }: { data: Array<any>, isLoading: boolean }) => {
    const chartConfig = {
        pending: { label: "Pending", color: "hsl(var(--chart-5))" },
        completed: { label: "Completed", color: "hsl(var(--chart-2))" },
    };
    return (
         <Card>
            <CardHeader>
                <CardTitle>Daily Trend (Last 7 Days)</CardTitle>
                <CardDescription>Number of pending vs. completed observations per day.</CardDescription>
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
};


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
        return Object.entries(counts).map(([name, count]) => ({ name, count }));
    }, [observations]);

    const dailyTrend = React.useMemo(() => {
        const trendData: { [key: string]: { day: string, pending: number, completed: number } } = {};
        const last7Days = Array.from({ length: 7 }).map((_, i) => {
            const d = new Date();
            d.setDate(d.getDate() - i);
            return d.toISOString().split('T')[0];
        }).reverse();
        
        last7Days.forEach(day => {
            trendData[day] = { day: new Date(day).toLocaleDateString('en-US', { weekday: 'short'}), pending: 0, completed: 0 };
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
            toast({ variant: 'destructive', title: 'No Data', description: 'There is no observation data to analyze.' });
            return;
        }
        setIsAnalyzing(true);
        setAnalysisResult(null);

        // Create a simple text summary of the dashboard data
        const summaryText = `
          Total Observations: ${totalObservations}
          Pending Issues: ${pendingPercentage}% (${pendingCount} reports)
          Critical Risks: ${criticalPercentage}% (${criticalCount} reports)
          Risk Distribution: ${JSON.stringify(riskDistribution)}
          Company Distribution: ${JSON.stringify(companyDistribution)}
        `;

        try {
            const result = await analyzeDashboardData(summaryText, userProfile);
            setAnalysisResult(result);
            toast({ title: "Analysis Complete", description: "AI has generated new insights for your project." });
        } catch (error) {
            console.error("AI Analysis failed:", error);
            const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
            toast({ variant: 'destructive', title: 'Analysis Failed', description: errorMessage });
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
                        <CardTitle className="mt-4">AI Features Disabled</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-muted-foreground">
                           AI analysis features are currently disabled for your account. You can enable them in your account settings.
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
                    <h1 className="text-3xl font-bold tracking-tight">AI Analysis Dashboard</h1>
                    <p className="text-muted-foreground">AI-powered insights for your project's HSSE data.</p>
                </div>
                <Button onClick={handleAnalyze} disabled={isAnalyzing || isLoading}>
                    {isAnalyzing ? <Loader2 className="mr-2 animate-spin" /> : <Sparkles className="mr-2" />}
                    Run AI Analysis
                </Button>
            </div>
            
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <StatCard title="Total Observations" value={`${totalObservations}`} description="Total number of reports" icon={TrendingUp} isLoading={isLoading} />
                <StatCard title="Pending Issues" value={`${pendingPercentage}%`} description={`${pendingCount} of ${totalObservations} reports`} icon={BellRing} isLoading={isLoading} />
                <StatCard title="Critical Risks" value={`${criticalPercentage}%`} description={`${criticalCount} of ${totalObservations} reports`} icon={ShieldAlert} isLoading={isLoading} />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
                <RiskDistributionChart data={riskDistribution} isLoading={isLoading} />
                <DailyTrendChart data={dailyTrend} isLoading={isLoading} />
            </div>

            {isAnalyzing && (
                 <div className="text-center py-10">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
                    <p className="mt-4 text-muted-foreground">AI is analyzing your data... this may take a moment.</p>
                </div>
            )}

            {analysisResult && (
              <Card>
                  <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-lg">
                          <BrainCircuit className="h-5 w-5 text-primary" />
                          AI Executive Summary
                      </CardTitle>
                  </CardHeader>
                  <CardContent>
                      <div className="space-y-2 text-sm text-muted-foreground">
                          {analysisResult.analysis.split('- ').filter(line => line.trim()).map((line, index) => (
                              <div key={index} className="flex items-start gap-2">
                                <ListChecks className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                                <p>{line.trim()}</p>
                              </div>
                          ))}
                      </div>
                  </CardContent>
              </Card>
            )}
        </div>
    );
}
