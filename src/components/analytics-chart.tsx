"use client";

import { useRef, useEffect, useMemo, useState } from "react";
import * as d3 from "d3";
import { useAppSelector } from "@/lib/hooks";
import { Calendar, ChevronDown } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AnalyticsHeatmap } from "@/components/analytics-heatmap";

const RANGES = [
  { label: "Last 7 days", days: 7 },
  { label: "Last 30 days", days: 30 },
  { label: "Last 180 days", days: 180 },
  { label: "Last 365 days", days: 365 },
];

type DayDatum = {
  date: Date;
  doneCount: number;
  assigneeCount: number;
};

export function AnalyticsChart() {
  const [rangeDays, setRangeDays] = useState(7);
  const [containerWidth, setContainerWidth] = useState(0);
  const rangeLabel =
    RANGES.find((r) => r.days === rangeDays)?.label ?? "Last 7 days";
  const files = useAppSelector((s) => {
    const id = s.todos.activeFileId;
    const f = s.todos.files.find((x) => x.id === id);
    return f ? [f] : [];
  });
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Track container width via ResizeObserver — handles initial hidden-tab render
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
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

      const assignees = new Set<string>();
      let doneCount = 0;

      for (const file of files) {
        for (const todo of file.todos) {
          if (
            todo.doneAt !== null &&
            todo.doneAt >= dayStart &&
            todo.doneAt <= dayEnd
          ) {
            doneCount++;
          }
          if (todo.completedFrom >= dayStart && todo.completedFrom <= dayEnd) {
            for (const a of todo.assignees) assignees.add(a);
          }
        }
      }

      return { date: d, doneCount, assigneeCount: assignees.size };
    });
  }, [files, rangeDays]);

  useEffect(() => {
    const svgEl = svgRef.current;
    if (!svgEl || containerWidth === 0) return;

    const svg = d3.select(svgEl);
    svg.selectAll("*").remove();

    const width = containerWidth;
    const height = 340;
    const m = { top: 24, right: 56, bottom: 40, left: 52 };
    const iW = width - m.left - m.right;
    const iH = height - m.top - m.bottom;

    svg.attr("width", width).attr("height", height);
    const g = svg
      .append("g")
      .attr("transform", `translate(${m.left},${m.top})`);

    const x = d3
      .scaleTime()
      .domain(d3.extent(data, (d) => d.date) as [Date, Date])
      .range([0, iW]);

    const maxDone = Math.max(d3.max(data, (d) => d.doneCount) ?? 0, 1);
    const maxAssignee = Math.max(d3.max(data, (d) => d.assigneeCount) ?? 0, 1);

    const yL = d3
      .scaleLinear()
      .domain([0, maxDone * 1.25])
      .range([iH, 0])
      .nice();
    const yR = d3
      .scaleLinear()
      .domain([0, maxAssignee * 1.25])
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
        g
          .selectAll(".tick line")
          .attr("stroke", "#e5e7eb")
          .attr("stroke-dasharray", "4,4"),
      );

    // x axis
    const tickCount =
      rangeDays <= 7
        ? rangeDays
        : rangeDays <= 30
          ? 7
          : rangeDays <= 180
            ? 6
            : 12;
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
      .call((g) => g.select(".domain").attr("stroke", "#e5e7eb"))
      .call((g) => g.selectAll(".tick line").remove())
      .call((g) =>
        g.selectAll("text").attr("fill", "#6b7280").attr("font-size", "12"),
      );

    // y left
    g.append("g")
      .call(d3.axisLeft(yL).ticks(5))
      .call((g) => g.select(".domain").remove())
      .call((g) => g.selectAll(".tick line").remove())
      .call((g) =>
        g.selectAll("text").attr("fill", "#10b981").attr("font-size", "12"),
      );

    // y right
    g.append("g")
      .attr("transform", `translate(${iW},0)`)
      .call(d3.axisRight(yR).ticks(5))
      .call((g) => g.select(".domain").remove())
      .call((g) => g.selectAll(".tick line").remove())
      .call((g) =>
        g.selectAll("text").attr("fill", "#d97706").attr("font-size", "12"),
      );

    const curve = d3.curveMonotoneX;

    // area + line done (teal)
    g.append("path")
      .datum(data)
      .attr("fill", "#10b981")
      .attr("fill-opacity", 0.1)
      .attr(
        "d",
        d3
          .area<DayDatum>()
          .x((d) => x(d.date))
          .y0(iH)
          .y1((d) => yL(d.doneCount))
          .curve(curve),
      );

    g.append("path")
      .datum(data)
      .attr("fill", "none")
      .attr("stroke", "#10b981")
      .attr("stroke-width", 2.5)
      .attr(
        "d",
        d3
          .line<DayDatum>()
          .x((d) => x(d.date))
          .y((d) => yL(d.doneCount))
          .curve(curve),
      );

    // area + line assignees (amber)
    g.append("path")
      .datum(data)
      .attr("fill", "#d97706")
      .attr("fill-opacity", 0.1)
      .attr(
        "d",
        d3
          .area<DayDatum>()
          .x((d) => x(d.date))
          .y0(iH)
          .y1((d) => yR(d.assigneeCount))
          .curve(curve),
      );

    g.append("path")
      .datum(data)
      .attr("fill", "none")
      .attr("stroke", "#d97706")
      .attr("stroke-width", 2.5)
      .attr(
        "d",
        d3
          .line<DayDatum>()
          .x((d) => x(d.date))
          .y((d) => yR(d.assigneeCount))
          .curve(curve),
      );

    // tooltip
    const tip = d3
      .select("body")
      .append("div")
      .style("position", "fixed")
      .style("background", "#111827")
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
      .attr("stroke", "#9ca3af")
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
        const d =
          !d1 || Math.abs(+xDate - +d0.date) <= Math.abs(+xDate - +d1.date)
            ? d0
            : d1;

        vline.attr("x1", x(d.date)).attr("x2", x(d.date)).style("opacity", 1);
        tip
          .style("opacity", "1")
          .style("left", `${event.clientX + 16}px`)
          .style("top", `${event.clientY - 12}px`)
          .html(
            `<div style="font-weight:600;margin-bottom:2px">${d3.timeFormat("%A, %B %-d")(d.date)}</div>` +
              `<div><span style="color:#10b981">●</span>&nbsp; Done: <b>${d.doneCount}</b></div>` +
              `<div><span style="color:#d97706">●</span>&nbsp; Active Assignees: <b>${d.assigneeCount}</b></div>`,
          );
      })
      .on("mouseleave", function () {
        tip.style("opacity", "0");
        vline.style("opacity", 0);
      });

    return () => {
      tip.remove();
    };
  }, [data, containerWidth]);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <DropdownMenu>
          <DropdownMenuTrigger
            className={cn(buttonVariants({ variant: "outline" }), "gap-2")}
          >
            <Calendar className="size-4" />
            {rangeLabel}
            <ChevronDown className="size-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            {RANGES.map((r) => (
              <DropdownMenuItem
                key={r.days}
                onClick={() => setRangeDays(r.days)}
              >
                {r.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="rounded-xl border bg-card p-6">
        <div className="text-base font-bold">Activity Contributions By Day</div>
        <div className="mt-0.5 mb-5 text-sm text-muted-foreground">
          Daily done todos and active assignees
        </div>
        <div ref={containerRef}>
          <svg ref={svgRef} className="w-full overflow-visible" />
        </div>
        <div className="mt-4 flex items-center justify-end gap-6 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <svg width="24" height="8">
              <line
                x1="0"
                y1="4"
                x2="24"
                y2="4"
                stroke="#10b981"
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
                stroke="#d97706"
                strokeWidth="2.5"
              />
            </svg>
            Active Assignees (right)
          </div>
        </div>
      </div>

      <AnalyticsHeatmap files={files} rangeDays={rangeDays} />
    </div>
  );
}
