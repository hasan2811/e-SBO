"use client"

import * as React from "react"
import {
  Area,
  Bar,
  Line,
  Pie,
  Radar,
  RadialBar,
  type AreaProps,
  type BarProps,
  type LineProps,
  type PieProps,
  type RadarProps,
  type RadialBarProps,
} from "recharts"
import {
  AreaChart as AreaChartPrimitive,
  BarChart as BarChartPrimitive,
  LineChart as LineChartPrimitive,
  PieChart as PieChartPrimitive,
  RadarChart as RadarChartPrimitive,
  RadialBarChart as RadialBarChartPrimitive,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type LegendProps,
  type TooltipProps,
} from "recharts"

import { cn } from "@/lib/utils"

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "./card"

// #region Chart Types
const Chart = ResponsiveContainer
// #endregion

// #region Chart Container
type ChartContainerSettings = {
  [key: string]: {
    label?: React.ReactNode
    color?: string
  }
}

type ChartContainerProps = React.ComponentProps<typeof Card> & {
  config: ChartContainerSettings
  children: React.ComponentProps<typeof ResponsiveContainer>["children"]
}

const ChartContainer = React.forwardRef<
  HTMLDivElement,
  Omit<ChartContainerProps, "children"> & {
    children: React.ReactNode
  }
>(({ config, className, children, ...props }, ref) => {
  const [activeChart, setActiveChart] =
    React.useState<keyof typeof config | null>(null)
  const id = React.useId()

  return (
    <Card
      ref={ref}
      data-chart={id}
      data-active-chart={activeChart}
      className={cn(
        "flex flex-col",
        "[&_>_.recharts-responsive-container]:!my-auto [&_>_.recharts-responsive-container]:*:!h-auto",
        className
      )}
      {...props}
    >
      {children}
    </Card>
  )
})
ChartContainer.displayName = "Chart"
// #endregion

// #region Chart Legend
const ChartLegend = React.forwardRef<
  HTMLDivElement,
  Omit<LegendProps, "content" | "ref"> & {
    hide?: boolean
    content?: React.ComponentProps<typeof ChartLegendContent>["content"]
    nameKey?: string
  }
>(({ className, hide, content, nameKey, ...props }, ref) => {
  const { config, activeChart } = React.useContext(ChartContext)

  if (hide || !config) {
    return null
  }

  return (
    <div
      ref={ref}
      data-chart-legend
      className={cn(
        "flex items-center justify-end gap-2 text-sm text-muted-foreground",
        "[&>[data-chart-legend-item]]:has-[:disabled]:opacity-50",
        activeChart &&
          "[&>[data-chart-legend-item]:not([data-chart-legend-item-name=${activeChart}])]:opacity-50",
        className
      )}
    >
      {content ? (
        content
      ) : (
        <ChartLegendContent
          className={props.payload ? "flex-wrap" : ""}
          nameKey={nameKey}
          {...props}
        />
      )}
    </div>
  )
})
ChartLegend.displayName = "ChartLegend"

const ChartLegendContent = React.forwardRef<
  HTMLUListElement,
  React.ComponentProps<"ul"> &
    Pick<LegendProps, "payload" | "verticalAlign"> & {
      content?:
        | React.ReactNode
        | (({
            config,
            payload,
          }: {
            config: ChartContainerSettings
            payload: LegendProps["payload"]
          }) => React.ReactNode)
      hide?: boolean
      nameKey?: string
    }
>(
  (
    { className, content, hide, nameKey = "name", payload, verticalAlign },
    ref
  ) => {
    const { config, setActiveChart } = React.useContext(ChartContext)

    if (hide || !config || !payload) {
      return null
    }

    if (content) {
      if (typeof content === "function") {
        return content({ config, payload })
      }
      return content
    }

    return (
      <ul
        ref={ref}
        className={cn(
          "flex items-center gap-4",
          verticalAlign === "top" ? "flex-wrap" : "",
          className
        )}
        onMouseLeave={() => {
          setActiveChart(null)
        }}
      >
        {payload.map((item) => {
          const key = (item.payload as any)?.[nameKey] ?? item.dataKey
          const name = item.value as string
          const settings = config[key as keyof typeof config]

          if (!settings) {
            return null
          }

          const { color, label } = settings
          return (
            <li
              key={name}
              data-chart-legend-item
              data-chart-legend-item-name={key}
              className={cn(
                "flex items-center gap-1.5 [&>svg]:size-3 [&>svg]:text-muted-foreground",
                item.inactive
                  ? "has-[:disabled]:text-muted-foreground"
                  : "cursor-pointer"
              )}
              onMouseEnter={() => {
                setActiveChart(key as string)
              }}
            >
              <button
                aria-label={`Toggle ${name}`}
                data-color={color}
                className={cn(
                  "flex size-3 shrink-0 items-center justify-center rounded-[2px] border-[2px] data-[color]:border-[var(--color)] [&:not(:has(>*:not([hidden])))_]:data-[color]:bg-[var(--color)]",
                  item.inactive
                    ? "[&>*]:hidden"
                    : "text-background data-[color]:text-[var(--color)]"
                )}
                disabled={item.inactive}
              >
                <div className="size-1.5 shrink-0 rounded-[1px] bg-current" />
              </button>
              <label className={cn(item.inactive && "text-muted-foreground")}>
                {label ?? name}
              </label>
            </li>
          )
        })}
      </ul>
    )
  }
)
ChartLegendContent.displayName = "ChartLegendContent"
// #endregion

// #region Chart Tooltip
const ChartTooltip = Tooltip

const ChartTooltipContent = React.forwardRef<
  HTMLDivElement,
  Omit<TooltipProps<any, any>, "content" | "ref"> &
    React.ComponentProps<"div"> & {
      content?: React.ReactNode
      hideLabel?: boolean
      hideIndicator?: boolean
      indicator?: "line" | "dot" | "dashed"
      nameKey?: string
      labelKey?: string
    }
>(
  (
    {
      active,
      className,
      content,
      formatter,
      hideLabel,
      hideIndicator,
      indicator = "dot",
      label,
      labelClassName,
      labelFormatter,
      labelKey,
      nameKey,
      payload,
    },
    ref
  ) => {
    const { config } = React.useContext(ChartContext)

    if (content) {
      return content
    }

    if (!active || !payload?.length || !config) {
      return null
    }

    const P = payload[0].payload
    const L = labelKey ? P[labelKey] : label

    return (
      <div
        ref={ref}
        className={cn(
          "grid min-w-32 items-start gap-1.5 rounded-lg border bg-background px-2.5 py-1.5 text-xs shadow-xl",
          className
        )}
      >
        {!hideLabel && L ? (
          <div className={cn("font-medium", labelClassName)}>
            {labelFormatter ? labelFormatter(L, payload) : L}
          </div>
        ) : null}
        <div className="grid gap-1.5">
          {payload.map((item, i) => {
            const key = `${item.name ?? nameKey ?? item.dataKey ?? "value"}`
            const itemConfig = config[key as keyof typeof config]
            const indicatorColor = item.color || itemConfig?.color

            return (
              <div
                key={item.dataKey}
                className={cn(
                  "flex w-full items-stretch gap-2 [&>svg]:h-2.5 [&>svg]:w-2.5 [&>svg]:text-muted-foreground"
                )}
              >
                {!hideIndicator && (
                  <div
                    className={cn(
                      "shrink-0",
                      indicator === "dot" &&
                        "flex items-center justify-center pt-0.5",
                      indicator === "line" && "flex items-center",
                      indicator === "dashed" &&
                        "my-0.5 flex w-full items-center"
                    )}
                  >
                    {indicator === "dot" ? (
                      <div
                        className="size-2.5 rounded-full"
                        style={{
                          background: indicatorColor,
                        }}
                      />
                    ) : indicator === "line" ? (
                      <div
                        className="w-full border-t-[2px]"
                        style={{
                          borderColor: indicatorColor,
                        }}
                      />
                    ) : indicator === "dashed" ? (
                      <div
                        className="w-full border-t-[2px] border-dashed"
                        style={{
                          borderColor: indicatorColor,
                        }}
                      />
                    ) : null}
                  </div>
                )}
                <div className="flex flex-1 justify-between leading-none">
                  <div className="grid gap-1.5">
                    <span className="text-muted-foreground">
                      {itemConfig?.label ?? item.name}
                    </span>
                  </div>
                  {formatter && (
                    <span className="font-medium">
                      {formatter(item.value, item.name, item, i, payload)}
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }
)
ChartTooltipContent.displayName = "ChartTooltipContent"
// #endregion

// #region Chart Primitive
const ChartContext = React.createContext<{
  config: ChartContainerSettings
  activeChart: string | null
  setActiveChart: (chart: string | null) => void
}>({
  config: {},
  activeChart: null,
  setActiveChart: () => {},
})

const createChart = <
  T extends
    | "area"
    | "bar"
    | "line"
    | "pie"
    | "radar"
    | "radialBar" = "bar",
>(
  ChartComponent: any
) => {
  const Component = React.forwardRef<
    React.ElementRef<typeof ChartComponent>,
    React.ComponentProps<typeof ChartComponent> & {
      data: any[]
      stackBy?: string
      layout?: "horizontal" | "vertical"
    }
  >(
    (
      {
        accessibilityLayer,
        className,
        children,
        data,
        layout,
        margin,
        stackBy,
        ...props
      },
      ref
    ) => {
      const { config, activeChart, setActiveChart } =
        React.useContext(ChartContext)

      const stackedData = React.useMemo(() => {
        if (!stackBy || !data) {
          return data
        }

        return data.map((item) => {
          const stackedItem: Record<string, any> = {}
          let total = 0
          for (const key in config) {
            const configItem = config[key]
            total = total + (item[key] ?? 0)
            stackedItem[key] =
              item[key] === null || item[key] === undefined ? null : [0, item[key]]
          }
          return {
            ...item,
            ...stackedItem,
            total,
          }
        })
      }, [data, config, stackBy])

      const Children = React.Children.map(children, (child) => {
        if (React.isValidElement(child)) {
          return React.cloneElement(child, {
            ...child.props,
            ...(stackBy
              ? {
                  stackId: stackBy,
                }
              : {}),
            ...(child.type === Bar &&
              layout === "vertical" && {
                layout: "vertical",
                radius: [0, 6, 6, 0],
              }),
            ...(child.type === Bar &&
              layout === "horizontal" && {
                radius: [0, 6, 6, 0],
              }),
            ...(child.type === Bar
              ? {
                  // fill: `var(--color-${child.props.dataKey})`,
                  // style: {
                  //   opacity: activeChart === child.props.dataKey || !activeChart ? 1 : 0.3,
                  // } as React.CSSProperties,
                }
              : {}),
            onMouseEnter: (props: any, i: number) => {
              child.props.onMouseEnter?.(props, i)
              setActiveChart(child.props.dataKey)
            },
            onMouseLeave: (props: any, i: number) => {
              child.props.onMouseLeave?.(props, i)
              setActiveChart(null)
            },
          })
        }
        return child
      })

      return (
        <ChartComponent
          ref={ref}
          className={className}
          data={stackBy ? stackedData : data}
          layout={layout}
          margin={
            margin ?? {
              bottom: 20,
            }
          }
          {...props}
        >
          {accessibilityLayer ? (
            <svg
              width={0}
              height={0}
              style={{
                display: "none",
              }}
            >
              {Object.entries(config).map(([key, value]) => {
                return (
                  <defs key={key}>
                    <linearGradient
                      id={`fill-${key}`}
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="5%"
                        stopColor={value.color}
                        stopOpacity={0.8}
                      />
                      <stop
                        offset="95%"
                        stopColor={value.color}
                        stopOpacity={0.1}
                      />
                    </linearGradient>
                  </defs>
                )
              })}
            </svg>
          ) : null}
          {Children}
        </ChartComponent>
      )
    }
  )
  Component.displayName = "Chart"

  return Component
}

const AreaChart = createChart<"area">(AreaChartPrimitive)
const BarChart = createChart<"bar">(BarChartPrimitive)
const LineChart = createChart<"line">(LineChartPrimitive)
const PieChart = createChart<"pie">(PieChartPrimitive)
const RadarChart = createChart<"radar">(RadarChartPrimitive)
const RadialBarChart = createChart<"radialBar">(RadialBarChartPrimitive)
// #endregion

// #region Chart Components
const ChartXAxis = XAxis
const ChartYAxis = YAxis
const ChartArea = Area
const ChartBar = Bar
const ChartLine = Line
const ChartPie = Pie
const ChartRadar = Radar
const ChartRadialBar = RadialBar
// #endregion

export {
  Chart,
  // Container
  ChartContainer,
  // Legend
  ChartLegend,
  ChartLegendContent,
  // Tooltip
  ChartTooltip,
  ChartTooltipContent,
  // Primitives
  AreaChart,
  BarChart,
  LineChart,
  PieChart,
  RadarChart,
  RadialBarChart,
  // Components
  ChartXAxis,
  ChartYAxis,
  ChartArea,
  ChartBar,
  ChartLine,
  ChartPie,
  ChartRadar,
  ChartRadialBar,
}
export type {
  ChartContainerSettings,
  AreaProps as ChartAreaProps,
  BarProps as ChartBarProps,
  LineProps as ChartLineProps,
  PieProps as ChartPieProps,
  RadarProps as ChartRadarProps,
  RadialBarProps as ChartRadialBarProps,
}
