"use client";

import * as d3 from "d3";
import { useEffect, useMemo, useRef, useState } from "react";

import { useAppSelector } from "@/stores/hooks";

type GroupRow = {
  id: string;
  name: string;
  from: number;
  to: number;
  count: number;
};

type DayDatum = {
  date: Date;
  ticketCount: number;
  doneCount: number;
};

const ROW_HEIGHT = 56;
const ROW_GAP = 8;
const LEFT_LABEL = 140;
const RIGHT_PAD = 24;
const TOP_AXIS = 56;
const BAR_HEIGHT = 32;

export function TimelineView() {
  const activeFile = useAppSelector((s) => {
    const id = s.todos.activeFileId;
    return s.todos.files.find((f) => f.id === id) ?? null;
  });
  const isDark = useAppSelector((s) => s.settings.darkMode);

  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) {
      return;
    }
    const ro = new ResizeObserver((entries) => {
      setContainerWidth(entries[0].contentRect.width);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const { rows, dailyData, domain } = useMemo(() => {
    const todos = activeFile?.todos ?? [];
    const groups = activeFile?.groups ?? [];

    const groupMap = new Map<string, GroupRow>();
    for (const g of groups) {
      groupMap.set(g.id, {
        id: g.id,
        name: g.name,
        from: Number.POSITIVE_INFINITY,
        to: Number.NEGATIVE_INFINITY,
        count: 0,
      });
    }
    const ungrouped: GroupRow = {
      id: "__ungrouped__",
      name: "Ungrouped",
      from: Number.POSITIVE_INFINITY,
      to: Number.NEGATIVE_INFINITY,
      count: 0,
    };

    for (const t of todos) {
      const target = t.groupId ? groupMap.get(t.groupId) : ungrouped;
      if (!target) {
        continue;
      }
      target.from = Math.min(target.from, t.completedFrom);
      target.to = Math.max(target.to, t.completedTo);
      target.count++;
    }

    const allRows: GroupRow[] = [];
    for (const g of groupMap.values()) {
      if (g.count > 0) {
        allRows.push(g);
      }
    }
    if (ungrouped.count > 0) {
      allRows.push(ungrouped);
    }

    if (allRows.length === 0) {
      return {
        rows: [],
        dailyData: [] as DayDatum[],
        domain: null as [Date, Date] | null,
      };
    }

    const minTs = Math.min(...allRows.map((r) => r.from));
    const maxTs = Math.max(...allRows.map((r) => r.to));
    const start = new Date(minTs);
    start.setHours(0, 0, 0, 0);
    const end = new Date(maxTs);
    end.setHours(0, 0, 0, 0);
    const dayCount = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / 86_400_000) + 1);
    const daily: DayDatum[] = Array.from({ length: dayCount }, (_, i) => {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      const ds = d.getTime();
      const de = ds + 86_400_000 - 1;
      let ticketCount = 0;
      let doneCount = 0;
      for (const t of todos) {
        if (t.completedFrom <= de && t.completedTo >= ds) {
          ticketCount++;
        }
        if (t.doneAt !== null && t.doneAt >= ds && t.doneAt <= de) {
          doneCount++;
        }
      }
      return { date: d, ticketCount, doneCount };
    });

    return {
      rows: allRows,
      dailyData: daily,
      domain: [start, new Date(end.getTime() + 86_400_000)] as [Date, Date],
    };
  }, [activeFile]);

  const height = TOP_AXIS + rows.length * (ROW_HEIGHT + ROW_GAP);

  useEffect(() => {
    const svgEl = svgRef.current;
    if (!svgEl || containerWidth === 0 || !domain || rows.length === 0) {
      return;
    }

    const axisText = isDark ? "#9ca3af" : "#374151";
    const trackBg = isDark ? "#374151" : "#e5e7eb";
    const labelPrimary = isDark ? "#f3f4f6" : "#111827";
    const labelSecondary = isDark ? "#9ca3af" : "#6b7280";
    const barFill = isDark ? "#34d399" : "#0f766e";
    const barText = isDark ? "#111827" : "#ffffff";
    const tipBg = isDark ? "#1f2937" : "#111827";
    const c1 = isDark ? "#34d399" : "#10b981";

    const svg = d3.select(svgEl);
    svg.selectAll("*").remove();

    const MIN_DAY_PX = 80;
    const spanDaysCount = Math.max(
      1,
      Math.ceil((domain[1].getTime() - domain[0].getTime()) / 86_400_000),
    );
    const naturalWidth = LEFT_LABEL + RIGHT_PAD + spanDaysCount * MIN_DAY_PX;
    const width = Math.max(containerWidth, naturalWidth);
    svg.attr("width", width).attr("height", height);

    const innerWidth = width - LEFT_LABEL - RIGHT_PAD;
    const x = d3.scaleTime().domain(domain).range([0, innerWidth]);

    const axisG = svg.append("g").attr("transform", `translate(${LEFT_LABEL},${TOP_AXIS - 8})`);

    const spanDays = (domain[1].getTime() - domain[0].getTime()) / 86_400_000;
    const tickCount = spanDays <= 14 ? Math.ceil(spanDays) : spanDays <= 90 ? 8 : 10;
    const fmt =
      spanDays <= 60
        ? (d: Date) => d3.timeFormat("%b %-d")(d)
        : (d: Date) => d3.timeFormat("%b %Y")(d);

    axisG
      .call(
        d3
          .axisTop(x)
          .ticks(tickCount)
          .tickSize(0)
          .tickPadding(8)
          .tickFormat((d) => fmt(d as Date)),
      )
      .call((g) => g.select(".domain").remove())
      .call((g) =>
        g
          .selectAll("text")
          .attr("fill", axisText)
          .attr("font-size", "13")
          .attr("font-weight", "500"),
      );

    rows.forEach((row, i) => {
      const y = TOP_AXIS + i * (ROW_HEIGHT + ROW_GAP);

      svg
        .append("rect")
        .attr("x", LEFT_LABEL)
        .attr("y", y + (ROW_HEIGHT - BAR_HEIGHT) / 2)
        .attr("width", innerWidth)
        .attr("height", BAR_HEIGHT)
        .attr("rx", 6)
        .attr("fill", trackBg);

      const nameText = svg
        .append("text")
        .attr("x", 16)
        .attr("y", y + ROW_HEIGHT / 2 - 2)
        .attr("font-size", "14")
        .attr("font-weight", "600")
        .attr("fill", labelPrimary)
        .text(row.name);
      const maxLabelW = LEFT_LABEL - 16 - 8;
      const node = nameText.node();
      if (node) {
        let txt = row.name;
        while (txt.length > 1 && node.getComputedTextLength() > maxLabelW) {
          txt = txt.slice(0, -1);
          nameText.text(txt + "…");
        }
        if (txt !== row.name) {
          nameText.append("title").text(row.name);
        }
      }

      svg
        .append("text")
        .attr("x", 16)
        .attr("y", y + ROW_HEIGHT / 2 + 14)
        .attr("font-size", "12")
        .attr("fill", labelSecondary)
        .text(`${row.count} ${row.count === 1 ? "task" : "tasks"}`);

      const barX = LEFT_LABEL + x(new Date(row.from));
      const barW = Math.max(2, x(new Date(row.to)) - x(new Date(row.from)));
      svg
        .append("rect")
        .attr("x", barX)
        .attr("y", y + (ROW_HEIGHT - BAR_HEIGHT) / 2)
        .attr("width", barW)
        .attr("height", BAR_HEIGHT)
        .attr("rx", 6)
        .attr("fill", barFill);

      svg
        .append("text")
        .attr("x", barX + 12)
        .attr("y", y + ROW_HEIGHT / 2 + 5)
        .attr("font-size", "13")
        .attr("font-weight", "600")
        .attr("fill", barText)
        .text(`${row.count} ${row.count === 1 ? "Task" : "Tasks"}`);
    });

    const vline = svg
      .append("line")
      .attr("stroke", barFill)
      .attr("stroke-width", 1.5)
      .attr("y1", TOP_AXIS - 16)
      .attr("y2", height)
      .style("opacity", 0)
      .style("pointer-events", "none");

    const vdot = svg
      .append("circle")
      .attr("r", 4)
      .attr("fill", barFill)
      .attr("cy", TOP_AXIS - 16)
      .style("opacity", 0)
      .style("pointer-events", "none");

    const tip = d3
      .select("body")
      .append("div")
      .style("position", "fixed")
      .style("background", tipBg)
      .style("color", "#f9fafb")
      .style("padding", "10px 14px")
      .style("border-radius", "10px")
      .style("font-size", "13px")
      .style("line-height", "1.7")
      .style("pointer-events", "none")
      .style("opacity", "0")
      .style("z-index", "9999")
      .style("transition", "opacity 0.1s");

    const bisect = d3.bisector<DayDatum, Date>((d) => d.date).left;

    svg
      .append("rect")
      .attr("x", LEFT_LABEL)
      .attr("y", TOP_AXIS - 16)
      .attr("width", innerWidth)
      .attr("height", height - TOP_AXIS + 16)
      .attr("fill", "transparent")
      .attr("pointer-events", "all")
      .on("mousemove", function (event) {
        const [mx] = d3.pointer(event, svgEl);
        const xDate = x.invert(mx - LEFT_LABEL);
        const idx = Math.min(bisect(dailyData, xDate, 1), dailyData.length - 1);
        const d0 = dailyData[idx - 1];
        const d1 = dailyData[idx];
        const d = !d0
          ? d1
          : !d1 || Math.abs(+xDate - +d0.date) <= Math.abs(+xDate - +d1.date)
            ? d0
            : d1;
        if (!d) {
          return;
        }
        const xPos = LEFT_LABEL + x(d.date);
        vline.attr("x1", xPos).attr("x2", xPos).style("opacity", 1);
        vdot.attr("cx", xPos).style("opacity", 1);
        tip
          .style("opacity", "1")
          .style("left", `${event.clientX + 16}px`)
          .style("top", `${event.clientY - 12}px`)
          .html(
            `<div style="font-weight:600;margin-bottom:2px">${d3.timeFormat("%b %-d, %Y")(d.date)}</div>` +
              `<div><span style="color:${c1}">●</span>&nbsp; Done: <b>${d.doneCount}</b></div>` +
              `<div><span style="color:${barFill}">●</span>&nbsp; Tickets: <b>${d.ticketCount}</b></div>`,
          );
      })
      .on("mouseleave", function () {
        vline.style("opacity", 0);
        vdot.style("opacity", 0);
        tip.style("opacity", "0");
      });

    return () => {
      tip.remove();
    };
  }, [containerWidth, rows, dailyData, domain, height, isDark]);

  if (rows.length === 0) {
    return (
      <div className="rounded-xl border bg-card p-12 text-center text-muted-foreground">
        No tasks to show on timeline.
      </div>
    );
  }

  return (
    <div className="rounded-xl border bg-card p-6">
      <div className="mb-1 flex items-baseline gap-2">
        <div className="text-base font-bold">Timeline by Group</div>
        <div className="text-xs text-muted-foreground">
          {rows.length} {rows.length === 1 ? "group" : "groups"}
        </div>
      </div>
      <div className="mb-5 text-sm text-muted-foreground">
        Each bar spans a group&apos;s earliest task start to latest task end
      </div>
      <div ref={containerRef} className="overflow-x-auto">
        <svg ref={svgRef} className="block" />
      </div>
    </div>
  );
}
