
'use client';

import * as React from 'react';
import { motion } from 'framer-motion';
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
import { BarChart, Gauge, SlidersHorizontal } from 'lucide-react';

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
    const [radius, setRadius] = React.useState<number>(5);
    const [loadWeight, setLoadWeight] = React.useState<string>("5");
    const [safetyFactor, setSafetyFactor] = React.useState<string>("1.25");

    const [craneConfig, setCraneConfig] = React.useState({
        boomMin: 10.65,
        boomMax: 33.5,
        radiusMin: 3,
        radiusMax: 25
    });
    
    const [results, setResults] = React.useState({
        boomAngle: '0',
        liftHeight: '0',
        loadMoment: '--',
        ratedCapacity: '--',
        safeCapacity: '--',
        status: '--',
        statusColor: '#374151', // equivalent to text-gray-700
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
        const rad = radius;
        const weight = parseFloat(loadWeight) || 0;
        const sf = parseFloat(safetyFactor) || 1;

        if (isNaN(boom) || isNaN(rad) || isNaN(weight) || isNaN(sf) || boom <= 0 || sf < 1.0) {
            setResults({
                boomAngle: '--', liftHeight: '--', loadMoment: 'Invalid Input', ratedCapacity: '--',
                safeCapacity: 'Invalid Input', status: 'Check input', statusColor: '#e53e3e',
            });
            return;
        }

        if (rad > boom) {
            setResults({
                boomAngle: 'Impossible', liftHeight: '0.00', loadMoment: '--', ratedCapacity: '0.00',
                safeCapacity: '0.00', status: 'Radius > Boom', statusColor: '#e53e3e',
            });
            return;
        }
        
        const boomAngleRad = Math.acos(rad / boom);
        const boomAngleDeg = boomAngleRad * 180 / Math.PI;

        const liftHeight = boom * Math.sin(boomAngleRad);
        
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
            status: isOverload ? 'OVERLOAD! UNSAFE' : 'SAFE',
            statusColor: isOverload ? '#e53e3e' : '#22c55e',
        });
    }, [boomLength, radius, loadWeight, safetyFactor, craneType, getRatedCapacity]);
    
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
          const boomAngleDeg = parseFloat(results.boomAngle) || 0;
          ctx.save();
          ctx.translate(pivotX * autoFitScale, pivotY * autoFitScale);
          ctx.rotate(-boomAngleDeg * Math.PI / 180);
          const totalBoomLengthPixels = boomLength * PIXELS_PER_METER * autoFitScale;
          const boomThicknessPx = BOOM_THICKNESS_BASE_M * PIXELS_PER_METER * autoFitScale;
          ctx.fillStyle = '#FFD700';
          ctx.fillRect(0, -boomThicknessPx / 2, totalBoomLengthPixels, boomThicknessPx);
          ctx.strokeRect(0, -boomThicknessPx / 2, totalBoomLengthPixels, boomThicknessPx);
          
          const actualFontSizeLabel = Math.max(10, FONT_SIZE_LABEL_PX); 
          ctx.font = `bold ${actualFontSizeLabel}px Inter`;
          ctx.fillStyle = '#000000';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(`Boom: ${boomLength.toFixed(2)} m`, totalBoomLengthPixels / 2, -boomThicknessPx / 2 - 15);
          
          ctx.beginPath();
          ctx.arc(0, 0, boomThicknessPx * 0.8, 0, 2 * Math.PI);
          ctx.fillStyle = '#333';
          ctx.fill();
          
          ctx.restore();

          // --- Hook Line and Load (Corrected Physics) ---
          const boomAngleRad = boomAngleDeg * Math.PI / 180;
          
          // Position of the boom tip
          const boomTipXPx = (pivotX * autoFitScale) + (boomLength * PIXELS_PER_METER * autoFitScale) * Math.cos(boomAngleRad);
          const boomTipYPx = (pivotY * autoFitScale) - (boomLength * PIXELS_PER_METER * autoFitScale) * Math.sin(boomAngleRad);

          // The hook hangs vertically down from the boom tip.
          // Its horizontal position is the same as the boom tip.
          const hookXPx = boomTipXPx; 
          // Its vertical position is calculated from lift height relative to the ground
          const hookYPx = -parseFloat(results.liftHeight) * PIXELS_PER_METER * autoFitScale;

          // Draw the lifting line from boom tip to the hook position
          ctx.beginPath();
          ctx.moveTo(boomTipXPx, boomTipYPx);
          ctx.lineTo(hookXPx, hookYPx);
          ctx.strokeStyle = '#333';
          ctx.lineWidth = 2;
          ctx.stroke();

          // Draw the load at the hook's position
          const loadWeightValue = parseFloat(loadWeight) || 0;
          if (loadWeightValue > 0) {
              const loadSizePx = LOAD_SIZE_M * PIXELS_PER_METER * autoFitScale;
              ctx.fillStyle = '#38a169';
              ctx.fillRect(hookXPx - loadSizePx / 2, hookYPx, loadSizePx, loadSizePx);
              ctx.fillStyle = '#fff';
              const actualFontSizeLoad = Math.max(8, FONT_SIZE_LOAD_PX);
              ctx.font = `bold ${actualFontSizeLoad}px Inter`;
              ctx.textAlign = 'center';
              ctx.fillText(`${loadWeightValue}t`, hookXPx, hookYPx + loadSizePx / 2 + 5);
          }
          
          // Draw the radius line and label
          ctx.strokeStyle = '#e53e3e'; // Red for radius line
          ctx.lineWidth = 1;
          ctx.setLineDash([5, 5]);
          ctx.beginPath();
          ctx.moveTo(pivotX * autoFitScale, 0);
          ctx.lineTo(hookXPx, 0);
          ctx.stroke();
          ctx.setLineDash([]);
          
          ctx.fillStyle = '#000000';
          ctx.font = `bold ${actualFontSizeLabel}px Inter`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'top';
          ctx.fillText(`Radius: ${radius.toFixed(2)} m`, (pivotX * autoFitScale + hookXPx) / 2, 5);
          
          ctx.restore(); // Restore to origin before drawing text overlay

          // --- Draw Text Overlay for Results ---
          ctx.save();
          ctx.font = `bold ${FONT_SIZE_LABEL_PX}px Inter`;
          ctx.fillStyle = '#111827';
          ctx.textAlign = 'left';
          
          let yOffset = PADDING_VERTICAL;
          
          ctx.fillText('Calculation Results:', PADDING_HORIZONTAL, yOffset);
          yOffset += 24;
          
          ctx.font = `normal ${FONT_SIZE_LABEL_PX - 2}px Inter`;
          
          const resultItems = [
            `Boom Angle: ${results.boomAngle} °`,
            `Lift Height: ${results.liftHeight} m`,
            `Load Moment: ${results.loadMoment} t-m`,
            `Rated Capacity: ${results.ratedCapacity} t`,
            `Safe Capacity: ${results.safeCapacity} t`,
          ];
          
          resultItems.forEach(item => {
            ctx.fillText(item, PADDING_HORIZONTAL, yOffset);
            yOffset += 18;
          });
          
          yOffset += 8; // Add a bit of space before the status
          ctx.font = `bold ${FONT_SIZE_LABEL_PX}px Inter`;
          ctx.fillStyle = results.statusColor;
          ctx.fillText(results.status, PADDING_HORIZONTAL, yOffset);
          
          ctx.restore();
        };

        draw();

    }, [results, boomLength, radius, loadWeight, craneType, isFastConnection, craneConfig]);

    React.useEffect(() => {
        const specs = CRANE_DATA[craneType]?.specifications;
        if (!specs) return;

        let minR = Infinity, maxR = 0;
        CRANE_DATA[craneType].loadChart.forEach(boomEntry => {
            boomEntry.capacities.forEach(capEntry => {
                if (capEntry.radius < minR) minR = capEntry.radius;
                if (capEntry.radius > maxR) maxR = capEntry.radius;
            });
        });

        const newConfig = {
            boomMin: parseFloat(specs['Panjang Boom Dasar'].replace(' m', '')),
            boomMax: parseFloat(specs['Panjang Boom Penuh'].replace(' m', '')),
            radiusMin: minR,
            radiusMax: maxR,
        };

        setCraneConfig(newConfig);
        setBoomLength(current => Math.max(newConfig.boomMin, Math.min(newConfig.boomMax, current)));
        setRadius(current => Math.max(newConfig.radiusMin, Math.min(newConfig.radiusMax, current)));

    }, [craneType]);
    
    const currentSpecs = CRANE_DATA[craneType]?.specifications;

    const pageVariants = {
        hidden: { opacity: 0 },
        visible: { opacity: 1, transition: { staggerChildren: isFastConnection ? 0.1 : 0 } },
    };

    const itemVariants = {
        hidden: { y: 20, opacity: 0 },
        visible: { y: 0, opacity: 1 },
    };

    const handleNumericInput = (
      value: string,
      setter: (value: string) => void,
      allowDecimal: boolean = false
    ) => {
      let cleanValue = value.replace(/[^0-9.]/g, ''); // Allow only numbers and dot
      if (allowDecimal) {
        const parts = cleanValue.split('.');
        if (parts.length > 2) {
          cleanValue = `${parts[0]}.${parts.slice(1).join('')}`;
        }
      } else {
        cleanValue = cleanValue.replace(/\./g, '');
      }
      setter(cleanValue);
    };

    return (
        <motion.div 
            className="space-y-6"
            variants={pageVariants}
            initial="hidden"
            animate="visible"
        >
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">2D Lifting Plan</h1>
                    <p className="text-muted-foreground">2D Mobile Crane Lifting Plan</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <motion.div variants={itemVariants} className="lg:col-span-1">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <SlidersHorizontal/>
                                Input Parameters
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <Label htmlFor="craneType">Mobile Crane Type</Label>
                                <Select value={craneType} onValueChange={setCraneType}>
                                    <SelectTrigger id="craneType"><SelectValue/></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="SANYSTC250">SANY STC250 Truck Crane</SelectItem>
                                        <SelectItem value="mobileCrane50T">Mobile Crane 50 Ton (Example)</SelectItem>
                                        <SelectItem value="mobileCrane100T">Mobile Crane 100 Ton (Example)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <Label htmlFor="boomLength">Boom Length ({boomLength.toFixed(2)} m)</Label>
                                <Slider id="boomLength" value={[boomLength]} min={craneConfig.boomMin} max={craneConfig.boomMax} step={0.1} onValueChange={(v) => setBoomLength(v[0])} />
                            </div>
                            <div>
                                <Label htmlFor="radius">Working Radius ({radius.toFixed(2)} m)</Label>
                                <Slider id="radius" value={[radius]} min={craneConfig.radiusMin} max={craneConfig.radiusMax} step={0.1} onValueChange={(v) => setRadius(v[0])} />
                            </div>
                            <div>
                                <Label htmlFor="loadWeight">Load Weight (ton)</Label>
                                <Input 
                                    id="loadWeight" 
                                    type="text"
                                    inputMode="decimal"
                                    value={loadWeight} 
                                    onChange={(e) => handleNumericInput(e.target.value, setLoadWeight, true)}
                                />
                            </div>
                             <div>
                                <Label htmlFor="safetyFactor">Safety Factor (e.g., 1.25 for 80%)</Label>
                                <Input 
                                    id="safetyFactor" 
                                    type="text"
                                    inputMode="decimal" 
                                    value={safetyFactor} 
                                    onChange={(e) => handleNumericInput(e.target.value, setSafetyFactor, true)}
                                />
                            </div>
                        </CardContent>
                    </Card>
                </motion.div>

                <motion.div variants={itemVariants} className="lg:col-span-2">
                    <Card className="h-full">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <BarChart/>
                                2D Mobile Crane Visualization
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-2 sm:p-4">
                            <canvas 
                                ref={canvasRef} 
                                className="w-full aspect-[3/4] bg-muted/50 border rounded-md"
                            ></canvas>
                        </CardContent>
                    </Card>
                </motion.div>
            </div>
            
            <motion.div variants={itemVariants}>
                {currentSpecs && (
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Gauge/>
                                Crane Specifications: {craneType}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 text-sm">
                            {Object.entries(currentSpecs).map(([key, value]) => (
                                <div key={key} className="flex flex-col">
                                    <span className="font-semibold text-muted-foreground">{key}</span> 
                                    <span className="text-foreground">{value}</span>
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                )}
            </motion.div>

        </motion.div>
    );
}
