
'use client';

import * as React from 'react';
import {
  CRANE_DATA,
  type CraneData,
  type CraneLoadChartEntry,
} from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';

const PIXELS_PER_METER = 10;
const PADDING_HORIZONTAL = 100;
const PADDING_VERTICAL = 120;
const CRANE_BODY_LENGTH_M = 12.8;
const CRANE_BODY_HEIGHT_M = 4.0;
const CHASSIS_WIDTH_M = CRANE_BODY_LENGTH_M * 0.9;
const CHASSIS_HEIGHT_M = CRANE_BODY_HEIGHT_M * 0.25;
const CABIN_WIDTH_M = CRANE_BODY_LENGTH_M * 0.1;
const CABIN_HEIGHT_M = CRANE_BODY_HEIGHT_M * 0.3;
const WHEEL_RADIUS_M = CRANE_BODY_HEIGHT_M * 0.08;
const OUTRIGGER_H_LENGTH_M = CRANE_BODY_LENGTH_M * 0.1;
const OUTRIGGER_V_HEIGHT_M = CRANE_BODY_HEIGHT_M * 0.1;
const SUPERSTRUCTURE_WIDTH_M = CRANE_BODY_LENGTH_M * 0.3;
const SUPERSTRUCTURE_HEIGHT_M = CRANE_BODY_HEIGHT_M * 0.4;
const OPERATOR_CABIN_WIDTH_M = CRANE_BODY_LENGTH_M * 0.08;
const OPERATOR_CABIN_HEIGHT_M = CRANE_BODY_HEIGHT_M * 0.25;
const COUNTERWEIGHT_LENGTH_M = CRANE_BODY_LENGTH_M * 0.15;
const COUNTERWEIGHT_HEIGHT_M = CRANE_BODY_HEIGHT_M * 0.15;
const BOOM_THICKNESS_BASE_M = CRANE_BODY_HEIGHT_M * 0.1;
const PULLEY_BLOCK_WIDTH_M = BOOM_THICKNESS_BASE_M * 1.2;
const PULLEY_BLOCK_HEIGHT_M = BOOM_THICKNESS_BASE_M * 1.0;
const HOOK_RADIUS_M = BOOM_THICKNESS_BASE_M * 0.3;
const LOAD_SIZE_M = BOOM_THICKNESS_BASE_M * 3.0;
const FONT_SIZE_LOAD_PX = 16;


export default function LiftingPlanPage() {
    const canvasRef = React.useRef<HTMLCanvasElement>(null);
    const [craneType, setCraneType] = React.useState<string>('SANYSTC250');
    const [boomLength, setBoomLength] = React.useState<number>(10.65);
    const [radius, setRadius] = React.useState<number>(3);
    const [loadWeight, setLoadWeight] = React.useState<number>(5);
    const [safetyFactor, setSafetyFactor] = React.useState<number>(1.25);

    const [craneConfig, setCraneConfig] = React.useState({
        boomMin: 10.65,
        boomMax: 33.5,
        radiusMin: 3,
        radiusMax: 25,
    });
    
    const [results, setResults] = React.useState({
        boomAngle: '--',
        liftHeight: '--',
        loadMoment: '--',
        ratedCapacity: '--',
        safeCapacity: '--',
        status: '--',
        statusColor: 'text-gray-700',
    });

    const getRatedCapacity = React.useCallback((type: string, boom: number, rad: number): number => {
        const chart: CraneLoadChartEntry[] = CRANE_DATA[type]?.loadChart;
        if (!chart) return 0;

        let bestBoomEntry = chart.reduce((prev, curr) => 
            Math.abs(curr.boom - boom) < Math.abs(prev.boom - boom) ? curr : prev
        );

        if (!bestBoomEntry) return 0;

        let bestCapacityEntry = bestBoomEntry.capacities.reduce((prev, curr) =>
            Math.abs(curr.radius - rad) < Math.abs(prev.radius - rad) ? curr : prev
        );
        
        return bestCapacityEntry.capacity;
    }, []);

    const calculateLiftingPlan = React.useCallback(() => {
        const boom = boomLength;
        const rad = radius;
        const weight = loadWeight;
        const sf = safetyFactor;

        if (isNaN(boom) || isNaN(rad) || isNaN(weight) || isNaN(sf) || boom <= 0 || rad <= 0 || sf < 1.0) {
            setResults({
                boomAngle: '--', liftHeight: '--', loadMoment: 'Input tidak valid', ratedCapacity: '--',
                safeCapacity: 'Input tidak valid', status: 'Periksa input', statusColor: 'text-destructive',
            });
            return;
        }

        let boomAngleRad = Math.acos(rad / boom);
        if (isNaN(boomAngleRad) || rad > boom) {
            boomAngleRad = 0;
        }
        const boomAngleDeg = (boomAngleRad * 180 / Math.PI);
        const liftHeight = (boom * Math.sin(boomAngleRad));
        const loadMoment = (weight * rad);
        const ratedCapacity = getRatedCapacity(craneType, boom, rad);
        const safeCapacity = ratedCapacity / sf;
        const isOverload = weight > safeCapacity;

        setResults({
            boomAngle: boomAngleDeg.toFixed(2),
            liftHeight: liftHeight.toFixed(2),
            loadMoment: loadMoment.toFixed(2),
            ratedCapacity: ratedCapacity.toFixed(2),
            safeCapacity: safeCapacity.toFixed(2),
            status: isOverload ? 'OVERLOAD! TIDAK AMAN' : 'AMAN',
            statusColor: isOverload ? 'text-destructive' : 'text-green-500',
        });
    }, [boomLength, radius, loadWeight, safetyFactor, craneType, getRatedCapacity]);

    React.useEffect(() => {
        calculateLiftingPlan();
    }, [calculateLiftingPlan]);

    React.useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        
        const draw = () => {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.save();
          
          const boomAngleDeg = parseFloat(results.boomAngle) || 0;

          const drawingWidthM = CRANE_BODY_LENGTH_M + (parseFloat(results.ratedCapacity) > 0 ? radius : 0) + PADDING_HORIZONTAL/PIXELS_PER_METER;
          const drawingHeightM = CRANE_BODY_HEIGHT_M + boomLength + PADDING_VERTICAL/PIXELS_PER_METER;

          const scaleX = (canvas.width - PADDING_HORIZONTAL * 2) / (drawingWidthM * PIXELS_PER_METER);
          const scaleY = (canvas.height - PADDING_VERTICAL * 2) / (drawingHeightM * PIXELS_PER_METER);
          const autoFitScale = Math.min(scaleX, scaleY, 1);
          
          const groundY = canvas.height - PADDING_VERTICAL;
          const craneBaseX = PADDING_HORIZONTAL;
          
          ctx.translate(craneBaseX, groundY);
          
          // Ground
          ctx.strokeStyle = '#333';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(-PADDING_HORIZONTAL, 0);
          ctx.lineTo(canvas.width, 0);
          ctx.stroke();

          // Chassis
          const chassisWidthPx = CHASSIS_WIDTH_M * PIXELS_PER_METER * autoFitScale;
          const chassisHeightPx = CHASSIS_HEIGHT_M * PIXELS_PER_METER * autoFitScale;
          ctx.fillStyle = '#FFA500';
          ctx.strokeStyle = '#333';
          ctx.lineWidth = 1;
          ctx.fillRect(0, -chassisHeightPx, chassisWidthPx, chassisHeightPx);
          ctx.strokeRect(0, -chassisHeightPx, chassisWidthPx, chassisHeightPx);

          // Superstructure
          const superstructureWidthPx = SUPERSTRUCTURE_WIDTH_M * PIXELS_PER_METER * autoFitScale;
          const superstructureHeightPx = SUPERSTRUCTURE_HEIGHT_M * PIXELS_PER_METER * autoFitScale;
          const superstructureXPx = (chassisWidthPx / 2) - (superstructureWidthPx / 2);
          const superstructureYPx = -chassisHeightPx - superstructureHeightPx;
          ctx.fillRect(superstructureXPx, superstructureYPx, superstructureWidthPx, superstructureHeightPx);
          ctx.strokeRect(superstructureXPx, superstructureYPx, superstructureWidthPx, superstructureHeightPx);

          const pivotX = superstructureXPx + superstructureWidthPx;
          const pivotY = superstructureYPx + (superstructureHeightPx / 2);
          
          // Boom
          ctx.save();
          ctx.translate(pivotX, pivotY);
          ctx.rotate(-boomAngleDeg * Math.PI / 180);
          const totalBoomLengthPixels = boomLength * PIXELS_PER_METER * autoFitScale;
          const boomThicknessPx = BOOM_THICKNESS_BASE_M * PIXELS_PER_METER * autoFitScale;
          ctx.fillStyle = '#FFD700';
          ctx.fillRect(0, -boomThicknessPx / 2, totalBoomLengthPixels, boomThicknessPx);
          ctx.strokeRect(0, -boomThicknessPx / 2, totalBoomLengthPixels, boomThicknessPx);
          ctx.restore();

          // Hook Line and Load
          const boomEndX = craneBaseX + pivotX + totalBoomLengthPixels * Math.cos(boomAngleDeg * Math.PI / 180);
          const boomEndY = groundY + pivotY - totalBoomLengthPixels * Math.sin(boomAngleDeg * Math.PI / 180);
          const hookX = craneBaseX + radius * PIXELS_PER_METER * autoFitScale;
          const hookY = groundY - (parseFloat(results.liftHeight) * PIXELS_PER_METER * autoFitScale);
          ctx.beginPath();
          ctx.moveTo(boomEndX, boomEndY);
          ctx.lineTo(hookX, hookY);
          ctx.stroke();
          
          if (loadWeight > 0) {
              const loadSizePx = LOAD_SIZE_M * PIXELS_PER_METER * autoFitScale;
              ctx.fillStyle = '#38a169';
              ctx.fillRect(hookX - loadSizePx / 2, hookY, loadSizePx, loadSizePx);
              ctx.fillStyle = '#fff';
              ctx.font = `${FONT_SIZE_LOAD_PX * autoFitScale}px Inter`;
              ctx.textAlign = 'center';
              ctx.fillText(`${loadWeight}t`, hookX, hookY + loadSizePx / 2 + 5 * autoFitScale);
          }
          
          ctx.restore();
        };

        draw();

    }, [results, boomLength, radius, loadWeight]);

    React.useEffect(() => {
        const specs = CRANE_DATA[craneType]?.specifications;
        const chart = CRANE_DATA[craneType]?.loadChart;
        if (!specs || !chart) return;

        const newConfig = {
            boomMin: parseFloat(specs['Panjang Boom Dasar'].replace(' m', '')),
            boomMax: parseFloat(specs['Panjang Boom Penuh'].replace(' m', '')),
            radiusMin: Math.min(...chart.flatMap(b => b.capacities.map(c => c.radius))),
            radiusMax: Math.max(...chart.flatMap(b => b.capacities.map(c => c.radius))),
        };
        setCraneConfig(newConfig);
        setBoomLength(newConfig.boomMin);
        setRadius(newConfig.radiusMin);
    }, [craneType]);
    
    const currentSpecs = CRANE_DATA[craneType]?.specifications;

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Lifting Plan 2D</h1>
                    <p className="text-muted-foreground">Perencanaan Pengangkatan Mobile Crane 2D</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="lg:col-span-1">
                    <CardHeader><CardTitle>Input Parameter</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <Label htmlFor="craneType">Tipe Mobile Crane</Label>
                            <Select value={craneType} onValueChange={setCraneType}>
                                <SelectTrigger id="craneType"><SelectValue/></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="SANYSTC250">SANY STC250 Truck Crane</SelectItem>
                                    <SelectItem value="mobileCrane50T">Mobile Crane 50 Ton (Contoh)</SelectItem>
                                    <SelectItem value="mobileCrane100T">Mobile Crane 100 Ton (Contoh)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label htmlFor="boomLength">Panjang Boom ({boomLength} m)</Label>
                            <Slider id="boomLength" value={[boomLength]} min={craneConfig.boomMin} max={craneConfig.boomMax} step={0.1} onValueChange={(v) => setBoomLength(v[0])} />
                        </div>
                        <div>
                            <Label htmlFor="radius">Radius Kerja ({radius} m)</Label>
                            <Slider id="radius" value={[radius]} min={craneConfig.radiusMin} max={craneConfig.radiusMax} step={0.1} onValueChange={(v) => setRadius(v[0])} />
                        </div>
                        <div>
                            <Label htmlFor="loadWeight">Berat Beban (ton)</Label>
                            <Input id="loadWeight" type="number" value={loadWeight} onChange={(e) => setLoadWeight(parseFloat(e.target.value) || 0)} min={0} />
                        </div>
                         <div>
                            <Label htmlFor="safetyFactor">Faktor Keamanan</Label>
                            <Input id="safetyFactor" type="number" value={safetyFactor} onChange={(e) => setSafetyFactor(parseFloat(e.target.value) || 1)} min={1} step={0.05} />
                        </div>
                    </CardContent>
                </Card>

                <div className="lg:col-span-2 space-y-6">
                    <Card>
                        <CardHeader><CardTitle>Hasil Perhitungan</CardTitle></CardHeader>
                        <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                            <div className="font-semibold">Sudut Boom: <span className="font-normal">{results.boomAngle}°</span></div>
                            <div className="font-semibold">Tinggi Angkat: <span className="font-normal">{results.liftHeight} m</span></div>
                            <div className="font-semibold">Momen Beban: <span className="font-normal">{results.loadMoment} t-m</span></div>
                            <div className="font-semibold">Kapasitas Nominal: <span className="font-normal">{results.ratedCapacity} t</span></div>
                            <div className="font-semibold">Kapasitas Aman: <span className="font-normal">{results.safeCapacity} t</span></div>
                            <div className={cn("font-bold", results.statusColor)}>{results.status}</div>
                        </CardContent>
                    </Card>
                    {currentSpecs && (
                        <Card>
                            <CardHeader><CardTitle>Spesifikasi Crane</CardTitle></CardHeader>
                            <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                                {Object.entries(currentSpecs).map(([key, value]) => (
                                    <div key={key}><span className="font-semibold text-muted-foreground">{key}:</span> {value}</div>
                                ))}
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Visualisasi Mobile Crane 2D</CardTitle>
                </CardHeader>
                <CardContent className="p-2 sm:p-4">
                    <canvas ref={canvasRef} width="800" height="500" className="w-full h-auto bg-card border rounded-md"></canvas>
                </CardContent>
            </Card>
        </div>
    );
}
    