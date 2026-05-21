"use client";

import * as d3 from "d3";
import cloud from "d3-cloud";
import { Cloud } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { useAppSelector } from "@/stores/hooks";
import type { TodoFile } from "@/stores/slices/todoSlice";

type Props = { files: TodoFile[]; rangeDays: number };

const STOPWORDS = new Set([
  "the",
  "a",
  "an",
  "and",
  "or",
  "but",
  "of",
  "in",
  "on",
  "at",
  "to",
  "for",
  "with",
  "by",
  "from",
  "as",
  "is",
  "are",
  "was",
  "were",
  "be",
  "been",
  "being",
  "do",
  "does",
  "did",
  "have",
  "has",
  "had",
  "this",
  "that",
  "these",
  "those",
  "it",
  "its",
  "we",
  "you",
  "your",
  "they",
  "them",
  "their",
  "i",
  "my",
  "me",
  "if",
  "so",
  "not",
  "no",
  "yes",
  "than",
  "then",
  "into",
  "out",
  "over",
  "up",
  "down",
  "about",
  "after",
  "before",
  "between",
  "such",
  "can",
  "will",
  "just",
  "also",
  "any",
  "some",
  "all",
  "more",
  "most",
  "much",
  "many",
  "very",
  "too",
  "only",
  "own",
  "same",
  "other",
  "another",
  "each",
  "every",
  "both",
  "few",
  "should",
  "would",
  "could",
  "may",
  "might",
  "must",
  "shall",
  "while",
  "when",
  "where",
  "what",
  "who",
  "how",
  "why",
  "which",
  "via",
]);

type Word = { text: string; size: number; count: number };

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[`*_~#>[\]()]/g, " ")
    .split(/[^a-z0-9'-]+/)
    .map((w) => w.replace(/^['-]+|['-]+$/g, ""))
    .filter((w) => w.length >= 3 && !STOPWORDS.has(w) && !/^\d+$/.test(w));
}

function startEndForRange(rangeDays: number) {
  const now = new Date();
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);
  const start = new Date(now);
  start.setDate(start.getDate() - (rangeDays - 1));
  start.setHours(0, 0, 0, 0);
  return { start: start.getTime(), end: end.getTime() };
}

export function AnalyticsWordCloud({ files, rangeDays }: Props) {
  const isDark = useAppSelector((s) => s.settings.darkMode);
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) {
      return;
    }
    const ro = new ResizeObserver((e) => setContainerWidth(e[0].contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const words = useMemo<Word[]>(() => {
    const { start, end } = startEndForRange(rangeDays);
    const counts = new Map<string, number>();
    for (const file of files) {
      for (const t of file.todos) {
        const inRange =
          (t.createdAt >= start && t.createdAt <= end) ||
          (t.completedFrom >= start && t.completedFrom <= end) ||
          (t.doneAt !== null && t.doneAt >= start && t.doneAt <= end);
        if (!inRange) {
          continue;
        }
        for (const tok of tokenize(t.title)) {
          counts.set(tok, (counts.get(tok) ?? 0) + 1);
        }
      }
    }
    const arr = [...counts.entries()]
      .filter(([, c]) => c >= 1)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 80);
    if (arr.length === 0) {
      return [];
    }
    const maxC = arr[0][1];
    const minC = arr[arr.length - 1][1];
    const scale = d3
      .scaleSqrt()
      .domain([minC, maxC || 1])
      .range([12, 56]);
    return arr.map(([text, count]) => ({
      text,
      count,
      size: scale(count),
    }));
  }, [files, rangeDays]);

  useEffect(() => {
    const svgEl = svgRef.current;
    if (!svgEl || containerWidth === 0) {
      return;
    }

    const width = containerWidth;
    const height = 340;

    const svg = d3.select(svgEl);
    svg.selectAll("*").remove();
    svg.attr("width", width).attr("height", height);

    if (words.length === 0) {
      return;
    }

    const palette = isDark
      ? ["#34d399", "#fbbf24", "#60a5fa", "#f472b6", "#a78bfa", "#fb923c"]
      : ["#10b981", "#d97706", "#2563eb", "#db2777", "#7c3aed", "#ea580c"];
    const color = d3
      .scaleOrdinal<string, string>()
      .domain(words.map((w) => w.text))
      .range(palette);

    const layout = cloud<Word>()
      .size([width, height])
      .words(words.map((w) => ({ ...w })))
      .padding(3)
      .rotate(() => (Math.random() < 0.35 ? 90 : 0))
      .font("Inter, system-ui, sans-serif")
      .fontSize((d) => d.size)
      .on("end", (placed) => {
        const g = svg.append("g").attr("transform", `translate(${width / 2},${height / 2})`);

        const tipBg = isDark ? "#1f2937" : "#111827";
        const tip = d3
          .select("body")
          .append("div")
          .style("position", "fixed")
          .style("background", tipBg)
          .style("color", "#f9fafb")
          .style("padding", "6px 10px")
          .style("border-radius", "8px")
          .style("font-size", "12px")
          .style("pointer-events", "none")
          .style("opacity", "0")
          .style("z-index", "9999")
          .style("transition", "opacity 0.1s");

        type Placed = Word & { x: number; y: number; rotate: number };
        g.selectAll<SVGTextElement, Placed>("text")
          .data(placed as Placed[])
          .join("text")
          .style("font-family", "Inter, system-ui, sans-serif")
          .style("font-weight", "600")
          .style("cursor", "default")
          .style("fill", (d) => color(d.text))
          .attr("text-anchor", "middle")
          .attr("transform", (d) => `translate(${d.x},${d.y})rotate(${d.rotate})`)
          .style("font-size", "0px")
          .text((d) => d.text)
          .on("mouseover", function (event, d) {
            d3.select(this).style("opacity", 0.7);
            tip
              .style("opacity", "1")
              .style("left", `${event.clientX + 14}px`)
              .style("top", `${event.clientY - 10}px`)
              .html(`<b>${d.text}</b> — ${d.count}`);
          })
          .on("mousemove", function (event) {
            tip.style("left", `${event.clientX + 14}px`).style("top", `${event.clientY - 10}px`);
          })
          .on("mouseleave", function () {
            d3.select(this).style("opacity", 1);
            tip.style("opacity", "0");
          })
          .transition()
          .duration(700)
          .ease(d3.easeCubicOut)
          .style("font-size", (d) => `${d.size}px`);

        svgEl.dataset.tipId = "wc-tip";
        (svgEl as unknown as { __wcTip?: HTMLElement }).__wcTip = tip.node() as HTMLElement;
      });

    layout.start();

    return () => {
      const node = (svgEl as unknown as { __wcTip?: HTMLElement }).__wcTip;
      if (node) {
        node.remove();
      }
    };
  }, [words, containerWidth, isDark]);

  return (
    <div className="rounded-xl border bg-card p-6 min-w-0 flex flex-col md:h-full">
      <div className="text-base font-bold flex items-center gap-2">
        <Cloud className="size-4" />
        Common Words
      </div>
      <div className="mt-0.5 mb-5 text-sm text-muted-foreground">
        Top terms across task titles in range
      </div>
      <div ref={containerRef} className="flex-1 min-h-0">
        {words.length === 0 ? (
          <div className="h-full grid place-items-center text-sm text-muted-foreground py-10">
            No words in range.
          </div>
        ) : (
          <svg ref={svgRef} className="w-full" />
        )}
      </div>
    </div>
  );
}
