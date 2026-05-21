"use client";

import * as d3 from "d3";
import { Activity, Calendar, ChevronDown } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { AnalyticsHeatmap } from "@/components/customs/AnalyticsHeatmap";
import { AnalyticsWordCloud } from "@/components/customs/AnalyticsWordcloud";
import { buttonVariants } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AssigneeBreakdown,
  GroupBreakdown,
} from "@/features/AnalyticsBreakdowns/AnalyticsBreakdowns";
import { cn } from "@/lib/utils";
import { useAppSelector } from "@/stores/hooks";

export const RANGES = [
  { label: "Last 7 days", days: 7 },
  { label: "Last 30 days", days: 30 },
  { label: "Last 180 days", days: 180 },
  { label: "Last 365 days", days: 365 },
];

export function RangeFilter({
  rangeDays,
  onChange,
  compact = false,
}: {
  rangeDays: number;
  onChange: (days: number) => void;
  compact?: boolean;
}) {
  const rangeLabel = RANGES.find((r) => r.days === rangeDays)?.label ?? "Last 7 days";
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          buttonVariants({
            variant: "outline",
            size: compact ? "icon-sm" : "lg",
          }),
          !compact && "gap-2",
        )}
        title={`Range: ${rangeLabel}`}
        aria-label={`Range: ${rangeLabel}`}
      >
        <Calendar className="size-4" />
        {!compact && (
          <>
            {rangeLabel}
            <ChevronDown className="size-4" />
          </>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {RANGES.map((r) => (
          <DropdownMenuItem key={r.days} onClick={() => onChange(r.days)}>
            {r.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

type DayDatum = {
  date: Date;
  doneCount: number;
  ticketCount: number;
};

export function AnalyticsChart({ rangeDays }: { rangeDays: number }) {
  const [containerWidth, setContainerWidth] = useState(0);
  const isDark = useAppSelector((s) => s.settings.darkMode);
  const activeFileId = useAppSelector((s) => s.todos.activeFileId);
  const files = useAppSelector((s) => {
    const f = s.todos.files.find((x) => x.id === activeFileId);
    return f ? [f] : [];
  });

  if (!activeFileId) {
    return (
      <div className="rounded-xl border bg-card p-12 text-center text-muted-foreground">
        No file selected. Create or import one from the sidebar.
      </div>
    );
  }
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Track container width via ResizeObserver — handles initial hidden-tab render
  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }
    const ro = new ResizeObserver((entries) => {
      setContainerWidth(entries[0].contentRect.width);
    });
    ro.observe(container);
    return () => ro.disconnect();
  }, []);

  const data = useMemo<DayDatum[]>(() => {
    const now = new Date();
    return Array.from({ length: rangeDays }, (_, i) => {
      const d = new Date(now);
      d.setDate(d.getDate() - (rangeDays - 1 - i));
      d.setHours(0, 0, 0, 0);
      const dayStart = d.getTime();
      const dayEnd = dayStart + 86_400_000 - 1;

      let doneCount = 0;
      let ticketCount = 0;

      for (const file of files) {
        for (const todo of file.todos) {
          if (todo.doneAt !== null && todo.doneAt >= dayStart && todo.doneAt <= dayEnd) {
            doneCount++;
          }
          if (todo.completedFrom >= dayStart && todo.completedFrom <= dayEnd) {
            ticketCount++;
          }
        }
      }

      return { date: d, doneCount, ticketCount };
    });
  }, [files, rangeDays]);

  useEffect(() => {
    const svgEl = svgRef.current;
    if (!svgEl || containerWidth === 0) {
      return;
    }

    const c1 = isDark ? "#34d399" : "#10b981";
    const c2 = isDark ? "#fbbf24" : "#d97706";
    const gridColor = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.07)";
    const axisColor = isDark ? "#9ca3af" : "#6b7280";
    const domainColor = isDark ? "rgba(255,255,255,0.12)" : "#e5e7eb";
    const tipBg = isDark ? "#1f2937" : "#111827";

    const svg = d3.select(svgEl);
    svg.selectAll("*").remove();

    const width = containerWidth;
    const height = 340;
    const m = { top: 24, right: 56, bottom: 40, left: 52 };
    const iW = width - m.left - m.right;
    const iH = height - m.top - m.bottom;

    svg.attr("width", width).attr("height", height);
    const g = svg.append("g").attr("transform", `translate(${m.left},${m.top})`);

    const x = d3
      .scaleTime()
      .domain(d3.extent(data, (d) => d.date) as [Date, Date])
      .range([0, iW]);

    const maxDone = Math.max(d3.max(data, (d) => d.doneCount) ?? 0, 1);
    const maxAssignee = Math.max(d3.max(data, (d) => d.ticketCount) ?? 0, 1);
    const sharedMax = Math.max(maxDone, maxAssignee);

    const yL = d3
      .scaleLinear()
      .domain([0, sharedMax * 1.25])
      .range([iH, 0])
      .nice();
    const yR = d3
      .scaleLinear()
      .domain([0, sharedMax * 1.25])
      .range([iH, 0])
      .nice();

    // grid
    g.append("g")
      .call(
        d3
          .axisLeft(yL)
          .tickSize(-iW)
          .tickFormat(() => "")
          .ticks(5),
      )
      .call((g) => g.select(".domain").remove())
      .call((g) =>
        g.selectAll(".tick line").attr("stroke", gridColor).attr("stroke-dasharray", "4,4"),
      );

    // x axis
    const tickCount = rangeDays <= 7 ? rangeDays : rangeDays <= 30 ? 7 : rangeDays <= 180 ? 6 : 12;
    const xFmt =
      rangeDays <= 30
        ? (d: Date) => d3.timeFormat("%b %-d")(d)
        : (d: Date) => d3.timeFormat("%b %Y")(d);

    g.append("g")
      .attr("transform", `translate(0,${iH})`)
      .call(
        d3
          .axisBottom(x)
          .ticks(tickCount)
          .tickFormat((d) => xFmt(d as Date)),
      )
      .call((g) => g.select(".domain").attr("stroke", domainColor))
      .call((g) => g.selectAll(".tick line").remove())
      .call((g) => g.selectAll("text").attr("fill", axisColor).attr("font-size", "12"));

    // y left
    g.append("g")
      .call(d3.axisLeft(yL).ticks(Math.min(sharedMax, 5)).tickFormat(d3.format("d")))
      .call((g) => g.select(".domain").remove())
      .call((g) => g.selectAll(".tick line").remove())
      .call((g) => g.selectAll("text").attr("fill", c1).attr("font-size", "12"));

    // y right
    g.append("g")
      .attr("transform", `translate(${iW},0)`)
      .call(d3.axisRight(yR).ticks(5))
      .call((g) => g.select(".domain").remove())
      .call((g) => g.selectAll(".tick line").remove())
      .call((g) => g.selectAll("text").attr("fill", c2).attr("font-size", "12"));

    const curve = d3.curveMonotoneX;

    // area + line done
    g.append("path")
      .datum(data)
      .attr("fill", c1)
      .attr("fill-opacity", 0)
      .attr(
        "d",
        d3
          .area<DayDatum>()
          .x((d) => x(d.date))
          .y0(iH)
          .y1((d) => yL(d.doneCount))
          .curve(curve),
      )
      .transition()
      .duration(900)
      .ease(d3.easeCubicOut)
      .attr("fill-opacity", 0.12);

    const doneLine = g
      .append("path")
      .datum(data)
      .attr("fill", "none")
      .attr("stroke", c1)
      .attr("stroke-width", 2.5)
      .attr(
        "d",
        d3
          .line<DayDatum>()
          .x((d) => x(d.date))
          .y((d) => yL(d.doneCount))
          .curve(curve),
      );
    const doneLen = (doneLine.node() as SVGPathElement).getTotalLength();
    doneLine
      .attr("stroke-dasharray", `${doneLen} ${doneLen}`)
      .attr("stroke-dashoffset", doneLen)
      .transition()
      .duration(900)
      .ease(d3.easeCubicOut)
      .attr("stroke-dashoffset", 0);

    // area + line tickets
    g.append("path")
      .datum(data)
      .attr("fill", c2)
      .attr("fill-opacity", 0)
      .attr(
        "d",
        d3
          .area<DayDatum>()
          .x((d) => x(d.date))
          .y0(iH)
          .y1((d) => yR(d.ticketCount))
          .curve(curve),
      )
      .transition()
      .duration(900)
      .ease(d3.easeCubicOut)
      .attr("fill-opacity", 0.12);

    const ticketLine = g
      .append("path")
      .datum(data)
      .attr("fill", "none")
      .attr("stroke", c2)
      .attr("stroke-width", 2.5)
      .attr(
        "d",
        d3
          .line<DayDatum>()
          .x((d) => x(d.date))
          .y((d) => yR(d.ticketCount))
          .curve(curve),
      );
    const ticketLen = (ticketLine.node() as SVGPathElement).getTotalLength();
    ticketLine
      .attr("stroke-dasharray", `${ticketLen} ${ticketLen}`)
      .attr("stroke-dashoffset", ticketLen)
      .transition()
      .duration(900)
      .ease(d3.easeCubicOut)
      .attr("stroke-dashoffset", 0);

    // tooltip
    const tip = d3
      .select("body")
      .append("div")
      .style("position", "fixed")
      .style("background", tipBg)
      .style("color", "#f9fafb")
      .style("padding", "10px 14px")
      .style("border-radius", "10px")
      .style("font-size", "13px")
      .style("line-height", "1.9")
      .style("pointer-events", "none")
      .style("opacity", "0")
      .style("z-index", "9999")
      .style("transition", "opacity 0.1s");

    const bisect = d3.bisector<DayDatum, Date>((d) => d.date).left;

    const vline = g
      .append("line")
      .attr("stroke", axisColor)
      .attr("stroke-width", 1)
      .attr("stroke-dasharray", "4,2")
      .attr("y1", 0)
      .attr("y2", iH)
      .style("opacity", 0);

    g.append("rect")
      .attr("width", iW)
      .attr("height", iH)
      .attr("fill", "none")
      .attr("pointer-events", "all")
      .on("mousemove", function (event) {
        const [mx] = d3.pointer(event);
        const xDate = x.invert(mx);
        const idx = Math.min(bisect(data, xDate, 1), data.length - 1);
        const d0 = data[idx - 1];
        const d1 = data[idx];
        const d = !d1 || Math.abs(+xDate - +d0.date) <= Math.abs(+xDate - +d1.date) ? d0 : d1;

        vline.attr("x1", x(d.date)).attr("x2", x(d.date)).style("opacity", 1);
        tip
          .style("opacity", "1")
          .style("left", `${event.clientX + 16}px`)
          .style("top", `${event.clientY - 12}px`)
          .html(
            `<div style="font-weight:600;margin-bottom:2px">${d3.timeFormat("%A, %B %-d")(d.date)}</div>` +
              `<div><span style="color:${c1}">●</span>&nbsp; Done: <b>${d.doneCount}</b></div>` +
              `<div><span style="color:${c2}">●</span>&nbsp; Ticket Count: <b>${d.ticketCount}</b></div>`,
          );
      })
      .on("mouseleave", function () {
        tip.style("opacity", "0");
        vline.style("opacity", 0);
      });

    return () => {
      tip.remove();
    };
  }, [data, containerWidth, isDark]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:auto-rows-fr">
      <div className="rounded-xl border bg-card p-6 min-w-0 flex flex-col md:h-full">
        <div className="text-base font-bold flex items-center gap-2">
          <Activity className="size-4" />
          Activity Contributions By Day
        </div>
        <div className="mt-0.5 mb-5 text-sm text-muted-foreground">
          Daily done todos and ticket count
        </div>
        <div ref={containerRef}>
          <svg ref={svgRef} className="w-full overflow-visible" />
        </div>
        <div className="mt-auto pt-4 flex items-center justify-end gap-6 text-sm text-muted-foreground flex-wrap">
          <div className="flex items-center gap-2">
            <svg width="24" height="8">
              <line
                x1="0"
                y1="4"
                x2="24"
                y2="4"
                stroke={isDark ? "#34d399" : "#10b981"}
                strokeWidth="2.5"
              />
            </svg>
            Done Count (left)
          </div>
          <div className="flex items-center gap-2">
            <svg width="24" height="8">
              <line
                x1="0"
                y1="4"
                x2="24"
                y2="4"
                stroke={isDark ? "#fbbf24" : "#d97706"}
                strokeWidth="2.5"
              />
            </svg>
            Ticket Count (right)
          </div>
        </div>
      </div>

      <div className="min-w-0 md:h-full">
        <AnalyticsHeatmap files={files} rangeDays={rangeDays} />
      </div>

      <div className="min-w-0 md:h-full">
        <AssigneeBreakdown files={files} rangeDays={rangeDays} />
      </div>
      <div className="min-w-0 md:h-full">
        <GroupBreakdown files={files} rangeDays={rangeDays} />
      </div>
      <div className="min-w-0 md:col-span-2">
        <AnalyticsWordCloud files={files} rangeDays={rangeDays} />
      </div>
    </div>
  );
}
