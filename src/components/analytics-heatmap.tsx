"use client"

import { useRef, useEffect, useMemo, useState } from "react"
import * as d3 from "d3"
import { Clock } from "lucide-react"
import type { TodoFile } from "@/lib/todoSlice"

const DAYS_DISPLAY = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
// JS getDay(): 0=Sun,1=Mon,...,6=Sat → row index 0=Mon,...,6=Sun
const JS_DAY_TO_ROW = [6, 0, 1, 2, 3, 4, 5]

function hourLabel(h: number): string {
  if (h === 0) return "12 AM"
  if (h === 12) return "12 PM"
  return h < 12 ? `${h} AM` : `${h - 12} PM`
}

type Cell = { dayIdx: number; hour: number; total: number; avg: number }

type Props = { files: TodoFile[]; rangeDays: number }

export function AnalyticsHeatmap({ files, rangeDays }: Props) {
  const svgRef = useRef<SVGSVGElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [containerWidth, setContainerWidth] = useState(0)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver((e) => setContainerWidth(e[0].contentRect.width))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const cells = useMemo<Cell[]>(() => {
    const now = new Date()
    now.setHours(23, 59, 59, 999)
    const rangeStart = new Date(now)
    rangeStart.setDate(rangeStart.getDate() - rangeDays + 1)
    rangeStart.setHours(0, 0, 0, 0)
    const rangeStartTs = rangeStart.getTime()

    // count how many of each display-row day are in the range
    const dayCounts = new Array(7).fill(0)
    for (let i = 0; i < rangeDays; i++) {
      const d = new Date(now)
      d.setDate(d.getDate() - i)
      dayCounts[JS_DAY_TO_ROW[d.getDay()]]++
    }

    const sums: number[][] = Array.from({ length: 7 }, () => new Array(24).fill(0))
    for (const file of files) {
      for (const todo of file.todos) {
        if (!todo.doneAt || todo.doneAt < rangeStartTs) continue
        const dt = new Date(todo.doneAt)
        sums[JS_DAY_TO_ROW[dt.getDay()]][dt.getHours()]++
      }
    }

    const out: Cell[] = []
    for (let d = 0; d < 7; d++) {
      for (let h = 0; h < 24; h++) {
        out.push({
          dayIdx: d,
          hour: h,
          total: sums[d][h],
          avg: dayCounts[d] > 0 ? sums[d][h] / dayCounts[d] : 0,
        })
      }
    }
    return out
  }, [files, rangeDays])

  useEffect(() => {
    const svgEl = svgRef.current
    if (!svgEl || containerWidth === 0) return

    const svg = d3.select(svgEl)
    svg.selectAll("*").remove()

    const labelW = 38
    const hourLabelH = 28
    const colGap = 5
    const rowGap = 6
    const MIN_CELL = 22

    const fitted = Math.floor((containerWidth - labelW - colGap * 23) / 24)
    const cellW = Math.max(MIN_CELL, fitted)
    const cellH = cellW
    const totalW = labelW + 24 * cellW + 23 * colGap
    const totalH = hourLabelH + 7 * (cellH + rowGap) - rowGap + 8

    svg.attr("width", totalW).attr("height", totalH)

    const maxAvg = Math.max(d3.max(cells, (c) => c.avg) ?? 0, 0.001)
    const color = d3.scaleSequential()
      .domain([0, maxAvg])
      .interpolator(d3.interpolateRgbBasis(["#dcfce7", "#86efac", "#22c55e", "#15803d"]))

    // hour labels — every 2 hours
    for (let h = 0; h < 24; h += 2) {
      const x = labelW + h * (cellW + colGap) + cellW / 2
      svg.append("text")
        .attr("x", x)
        .attr("y", hourLabelH - 7)
        .attr("text-anchor", "middle")
        .attr("fill", "#9ca3af")
        .attr("font-size", "11")
        .text(hourLabel(h))
    }

    // cells + day labels
    for (let d = 0; d < 7; d++) {
      const y = hourLabelH + d * (cellH + rowGap)

      svg.append("text")
        .attr("x", labelW - 6)
        .attr("y", y + cellH / 2 + 4)
        .attr("text-anchor", "end")
        .attr("fill", "#6b7280")
        .attr("font-size", "12")
        .text(DAYS_DISPLAY[d])

      for (let h = 0; h < 24; h++) {
        const cell = cells[d * 24 + h]
        const x = labelW + h * (cellW + colGap)
        svg.append("rect")
          .attr("x", x).attr("y", y)
          .attr("width", cellW).attr("height", cellH)
          .attr("rx", 5)
          .attr("fill", cell.avg === 0 ? "#f9fafb" : color(cell.avg))
          .attr("stroke", "#e5e7eb").attr("stroke-width", 0.5)
      }
    }

    // tooltip hit areas
    const tip = d3.select("body").append("div")
      .style("position", "fixed")
      .style("background", "#111827")
      .style("color", "#f9fafb")
      .style("padding", "8px 12px")
      .style("border-radius", "8px")
      .style("font-size", "13px")
      .style("line-height", "1.8")
      .style("pointer-events", "none")
      .style("opacity", "0")
      .style("z-index", "9999")
      .style("transition", "opacity 0.1s")

    for (let d = 0; d < 7; d++) {
      for (let h = 0; h < 24; h++) {
        const cell = cells[d * 24 + h]
        const x = labelW + h * (cellW + colGap)
        const y = hourLabelH + d * (cellH + rowGap)

        svg.append("rect")
          .attr("x", x).attr("y", y)
          .attr("width", cellW).attr("height", cellH)
          .attr("fill", "transparent")
          .on("mouseenter", function (event) {
            tip.style("opacity", "1")
              .style("left", `${event.clientX + 12}px`)
              .style("top", `${event.clientY - 10}px`)
              .html(
                `<div style="font-weight:600;margin-bottom:2px">${DAYS_DISPLAY[d]}, ${hourLabel(h)}</div>` +
                `<div>Done: <b>${cell.total}</b></div>` +
                `<div>Avg: <b>${cell.avg.toFixed(2)}</b></div>`
              )
          })
          .on("mousemove", function (event) {
            tip.style("left", `${event.clientX + 12}px`).style("top", `${event.clientY - 10}px`)
          })
          .on("mouseleave", () => tip.style("opacity", "0"))
      }
    }

    return () => { tip.remove() }
  }, [cells, containerWidth])

  return (
    <div className="rounded-xl border bg-card p-6 h-full flex flex-col">
      <div className="text-base font-bold flex items-center gap-2">
        <Clock className="size-4" />
        Activity Contributions by Hour
      </div>
      <div className="mt-0.5 mb-5 text-sm text-muted-foreground">
        Average done todos per hour across the week
      </div>
      <div ref={containerRef} className="flex-1 overflow-x-auto">
        <svg ref={svgRef} className="overflow-visible block" />
      </div>
      <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
        <span />
        <div className="flex items-center gap-2">
          <span>Less</span>
          {["#f9fafb", "#bbf7d0", "#4ade80", "#15803d"].map((c) => (
            <div
              key={c}
              style={{ background: c, border: "1px solid #e5e7eb" }}
              className="w-4 h-4 rounded"
            />
          ))}
          <span>More</span>
        </div>
      </div>
    </div>
  )
}
