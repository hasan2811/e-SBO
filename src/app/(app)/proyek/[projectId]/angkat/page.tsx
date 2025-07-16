
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
import { usePerformance } from '@/contexts/performance-context';

// Constants for visualization, based on user's original detailed script
const PIXELS_PER_METER = 10;
const PADDING_HORIZONTAL = 20; 
const PADDING_VERTICAL = 40;   
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
const FONT_SIZE_LABEL_PX = 14;
const FONT_SIZE_LOAD_PX = 16;


export default function LiftingPlanPage() {
    const canvasRef = React.useRef<HTMLCanvasElement>(null);
    const { isFastConnection } = usePerformance();
    const [craneType, setCraneType] = React.useState<string>('SANYSTC250');
    const [boomLength, setBoomLength] = React.useState<number>(10.65);
    const [boomAngle, setBoomAngle] = React.useState<number>(45); // New state for boom angle
    const [loadWeight, setLoadWeight] = React.useState<number>(5);
    const [safetyFactor, setSafetyFactor] = React.useState<number>(1.25);

    const [craneConfig, setCraneConfig] = React.useState({
        boomMin: 10.65,
        boomMax: 33.5,
    });
    
    const [results, setResults] = React.useState({
        radius: '0', // Radius is now a calculated result
        liftHeight: '0',
        loadMoment: '--',
        ratedCapacity: '--',
        safeCapacity: '--',
        status: '--',
        statusColor: 'text-gray-700',
    });
    
    // ## HELPER FUNCTIONS FOR CALCULATIONS ##
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
        const angle = boomAngle;
        const weight = loadWeight;
        const sf = safetyFactor;

        if (isNaN(boom) || isNaN(angle) || isNaN(weight) || isNaN(sf) || boom <= 0 || sf < 1.0) {
            setResults({
                radius: '0', liftHeight: '0', loadMoment: 'Input tidak valid', ratedCapacity: '--',
                safeCapacity: 'Input tidak valid', status: 'Periksa input', statusColor: 'text-destructive',
            });
            return;
        }
        
        const boomAngleRad = angle * Math.PI / 180;

        // The load hangs from the middle of the boom now.
        const effectiveBoomLengthForLoad = boom / 2;
        const radius = effectiveBoomLengthForLoad * Math.cos(boomAngleRad);
        const liftHeight = effectiveBoomLengthForLoad * Math.sin(boomAngleRad);
        
        const loadMoment = (weight * radius);
        const ratedCapacity = getRatedCapacity(craneType, boom, radius);
        const safeCapacity = ratedCapacity / sf;
        const isOverload = weight > safeCapacity;

        setResults({
            radius: radius.toFixed(2),
            liftHeight: liftHeight.toFixed(2),
            loadMoment: loadMoment.toFixed(2),
            ratedCapacity: ratedCapacity.toFixed(2),
            safeCapacity: safeCapacity.toFixed(2),
            status: isOverload ? 'OVERLOAD! TIDAK AMAN' : 'AMAN',
            statusColor: isOverload ? 'text-destructive' : 'text-green-500',
        });
    }, [boomLength, boomAngle, loadWeight, safetyFactor, craneType, getRatedCapacity]);
    
    // ## USEEFFECT TRIGGERS ##
    React.useEffect(() => {
        calculateLiftingPlan();
    }, [calculateLiftingPlan]);

    React.useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        
        const draw = () => {
          const { clientWidth, clientHeight } = canvas;
          canvas.width = clientWidth * window.devicePixelRatio;
          canvas.height = clientHeight * window.devicePixelRatio;
          ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
          ctx.clearRect(0, 0, clientWidth, clientHeight);

          const maxDrawingWidthM = (CHASSIS_WIDTH_M / 2) + craneConfig.boomMax + COUNTERWEIGHT_LENGTH_M + PADDING_HORIZONTAL / PIXELS_PER_METER;
          const maxDrawingHeightM = CHASSIS_HEIGHT_M + craneConfig.boomMax + PADDING_VERTICAL / PIXELS_PER_METER;
          
          const scaleX = clientWidth / (maxDrawingWidthM * PIXELS_PER_METER);
          const scaleY = clientHeight / (maxDrawingHeightM * PIXELS_PER_METER);
          const autoFitScale = Math.max(0.01, Math.min(scaleX, scaleY));

          const groundYPx = clientHeight - PADDING_VERTICAL;
          const craneBaseXPx = PADDING_HORIZONTAL + (COUNTERWEIGHT_LENGTH_M * PIXELS_PER_METER * autoFitScale);

          ctx.save();
          ctx.translate(craneBaseXPx, groundYPx);
          
          ctx.strokeStyle = '#333';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(-clientWidth, 0);
          ctx.lineTo(clientWidth, 0);
          ctx.stroke();

          // --- Drawing functions ---
          const drawRect = (x: number, y: number, w: number, h: number) => {
              ctx.fillRect(x * autoFitScale, y * autoFitScale, w * autoFitScale, h * autoFitScale);
              ctx.strokeRect(x * autoFitScale, y * autoFitScale, w * autoFitScale, h * autoFitScale);
          };
          const drawArc = (x: number, y: number, r: number, start: number, end: number) => {
              ctx.beginPath();
              ctx.arc(x * autoFitScale, y * autoFitScale, r * autoFitScale, start, end);
              ctx.fill();
          };

          // --- Crane Body (Chassis) ---
          ctx.fillStyle = '#FFA500';
          ctx.strokeStyle = '#333';
          ctx.lineWidth = 1;
          const chassisWidthPx = CHASSIS_WIDTH_M * PIXELS_PER_METER;
          const chassisHeightPx = CHASSIS_HEIGHT_M * PIXELS_PER_METER;
          const chassisX = -chassisWidthPx / 2;
          drawRect(chassisX, -chassisHeightPx, chassisWidthPx, chassisHeightPx);

          // --- Driver's Cabin ---
          const cabinWidthPx = CABIN_WIDTH_M * PIXELS_PER_METER;
          const cabinHeightPx = CABIN_HEIGHT_M * PIXELS_PER_METER;
          const cabinX = chassisX + chassisWidthPx - cabinWidthPx;
          const cabinY = -chassisHeightPx - cabinHeightPx;
          drawRect(cabinX, cabinY, cabinWidthPx, cabinHeightPx);
          ctx.fillStyle = '#ADD8E6';
          drawRect(cabinX + cabinWidthPx * 0.1, cabinY + cabinHeightPx * 0.1, cabinWidthPx * 0.8, cabinHeightPx * 0.5);
          
          // --- Wheels ---
          ctx.fillStyle = '#2d3748';
          const wheelRadiusPx = WHEEL_RADIUS_M * PIXELS_PER_METER;
          const wheelYPx = -wheelRadiusPx;
          const wheelPositions = [0.15, 0.45, 0.85];
          wheelPositions.forEach(pos => {
              drawArc(chassisX + chassisWidthPx * pos, wheelYPx, wheelRadiusPx, 0, Math.PI * 2);
          });
          
          // --- Superstructure ---
          const superstructureWidthPx = SUPERSTRUCTURE_WIDTH_M * PIXELS_PER_METER;
          const superstructureHeightPx = SUPERSTRUCTURE_HEIGHT_M * PIXELS_PER_METER;
          const superstructureXPx = -superstructureWidthPx / 2;
          const superstructureYPx = -chassisHeightPx - superstructureHeightPx;
          ctx.fillStyle = '#FFD700';
          drawRect(superstructureXPx, superstructureYPx, superstructureWidthPx, superstructureHeightPx);
          
          // --- Pivot Point ---
          const pivotX = 0;
          const pivotY = superstructureYPx + (superstructureHeightPx / 2);
          
          // --- Operator Cabin ---
          const operatorCabinWidthPx = OPERATOR_CABIN_WIDTH_M * PIXELS_PER_METER;
          const operatorCabinHeightPx = OPERATOR_CABIN_HEIGHT_M * PIXELS_PER_METER;
          const operatorCabinX = superstructureXPx + superstructureWidthPx - operatorCabinWidthPx;
          const operatorCabinY = superstructureYPx - operatorCabinHeightPx;
          ctx.fillStyle = '#FFA500';
          drawRect(operatorCabinX, operatorCabinY, operatorCabinWidthPx, operatorCabinHeightPx);
          ctx.fillStyle = '#ADD8E6';
          drawRect(operatorCabinX + operatorCabinWidthPx * 0.1, operatorCabinY + operatorCabinHeightPx * 0.1, operatorCabinWidthPx * 0.8, operatorCabinHeightPx * 0.5);

          // --- Counterweight ---
          const counterweightLengthPx = COUNTERWEIGHT_LENGTH_M * PIXELS_PER_METER;
          const counterweightHeightPx = COUNTERWEIGHT_HEIGHT_M * PIXELS_PER_METER;
          const counterweightX = superstructureXPx - counterweightLengthPx;
          const counterweightY = superstructureYPx + (superstructureHeightPx / 2) - (counterweightHeightPx / 2);
          ctx.fillStyle = '#718096';
          drawRect(counterweightX, counterweightY, counterweightLengthPx, counterweightHeightPx);

          // --- Boom ---
          ctx.save();
          ctx.translate(pivotX * autoFitScale, pivotY * autoFitScale);
          ctx.rotate(-boomAngle * Math.PI / 180);
          const totalBoomLengthPixels = boomLength * PIXELS_PER_METER * autoFitScale;
          const boomThicknessPx = BOOM_THICKNESS_BASE_M * PIXELS_PER_METER * autoFitScale;
          ctx.fillStyle = '#FFD700';
          ctx.fillRect(0, -boomThicknessPx / 2, totalBoomLengthPixels, boomThicknessPx);
          ctx.strokeRect(0, -boomThicknessPx / 2, totalBoomLengthPixels, boomThicknessPx);
          
          const actualFontSizeLabel = Math.max(10, FONT_SIZE_LABEL_PX); 
          ctx.font = `${actualFontSizeLabel}px Inter`;
          ctx.fillStyle = '#000000';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(`Boom: ${boomLength.toFixed(2)} m`, totalBoomLengthPixels / 2, -boomThicknessPx / 2 - 15);
          
          ctx.beginPath();
          ctx.arc(0, 0, boomThicknessPx * 0.8, 0, 2 * Math.PI);
          ctx.fillStyle = '#333';
          ctx.fill();
          
          ctx.restore();

          // --- Hook Line and Load ---
          const boomAngleRad = boomAngle * Math.PI / 180;
          const boomTipX = (pivotX * autoFitScale) + totalBoomLengthPixels * Math.cos(boomAngleRad);
          const boomTipY = (pivotY * autoFitScale) - totalBoomLengthPixels * Math.sin(boomAngleRad);
          
          const hookX = (pivotX * autoFitScale) + (parseFloat(results.radius) * PIXELS_PER_METER * autoFitScale);
          const hookY = -parseFloat(results.liftHeight) * PIXELS_PER_METER * autoFitScale;
          
          ctx.beginPath();
          ctx.moveTo(boomTipX, boomTipY);
          ctx.lineTo(hookX, hookY);
          ctx.strokeStyle = '#333';
          ctx.lineWidth = 2;
          ctx.stroke();
          
          const loadWeightValue = loadWeight;
          if (loadWeightValue > 0) {
              const loadSizePx = LOAD_SIZE_M * PIXELS_PER_METER * autoFitScale;
              ctx.fillStyle = '#38a169';
              ctx.fillRect(hookX - loadSizePx / 2, hookY, loadSizePx, loadSizePx);
              ctx.fillStyle = '#fff';
              const actualFontSizeLoad = Math.max(8, FONT_SIZE_LOAD_PX);
              ctx.font = `${actualFontSizeLoad}px Inter`;
              ctx.textAlign = 'center';
              ctx.fillText(`${loadWeightValue}t`, hookX, hookY + loadSizePx / 2 + 5);
          }

          // --- Radius Label ---
          ctx.fillStyle = '#000000';
          ctx.font = `${actualFontSizeLabel}px Inter`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(`Radius: ${results.radius} m`, hookX, 20);
          
          ctx.restore();
        };

        draw();

    }, [results, boomLength, boomAngle, loadWeight, craneType, isFastConnection, craneConfig]);

    React.useEffect(() => {
        const specs = CRANE_DATA[craneType]?.specifications;
        if (!specs) return;

        const newConfig = {
            boomMin: parseFloat(specs['Panjang Boom Dasar'].replace(' m', '')),
            boomMax: parseFloat(specs['Panjang Boom Penuh'].replace(' m', '')),
        };
        setCraneConfig(newConfig);
        setBoomLength(current => Math.max(newConfig.boomMin, Math.min(newConfig.boomMax, current)));
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
                            <Label htmlFor="boomLength">Panjang Boom ({boomLength.toFixed(2)} m)</Label>
                            <Slider id="boomLength" value={[boomLength]} min={craneConfig.boomMin} max={craneConfig.boomMax} step={0.1} onValueChange={(v) => setBoomLength(v[0])} />
                        </div>
                        <div>
                            <Label htmlFor="boomAngle">Sudut Boom ({boomAngle.toFixed(2)}°)</Label>
                            <Slider id="boomAngle" value={[boomAngle]} min={0} max={80} step={1} onValueChange={(v) => setBoomAngle(v[0])} />
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
                            <div className="font-semibold">Radius Kerja: <span className="font-normal">{results.radius} m</span></div>
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
                    <canvas 
                        ref={canvasRef} 
                        className="w-full aspect-[3/4] bg-card border rounded-md"
                    ></canvas>
                </CardContent>
            </Card>
        </div>
    );
}
