# Graph Report - planner  (2026-05-16)

## Corpus Check
- 46 files · ~33,272 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 281 nodes · 604 edges · 23 communities (14 shown, 9 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 7 edges (avg confidence: 0.76)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `c5fbb2ad`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- [[_COMMUNITY_Layout Root + Fonts|Layout Root + Fonts]]
- [[_COMMUNITY_Button Component Utility|Button Component Utility]]
- [[_COMMUNITY_App Entry Components|App Entry Components]]
- [[_COMMUNITY_Styling Pipeline|Styling Pipeline]]
- [[_COMMUNITY_Agent Guidance Configs|Agent Guidance Configs]]
- [[_COMMUNITY_PostCSS Config|PostCSS Config]]
- [[_COMMUNITY_ESLint Config|ESLint Config]]
- [[_COMMUNITY_Next Config|Next Config]]
- [[_COMMUNITY_Home Page|Home Page]]
- [[_COMMUNITY_TSLint Env|TS/Lint Env]]
- [[_COMMUNITY_Next Env Types|Next Env Types]]
- [[_COMMUNITY_Page Metadata|Page Metadata]]
- [[_COMMUNITY_Community 12|Community 12]]
- [[_COMMUNITY_Community 13|Community 13]]
- [[_COMMUNITY_Community 14|Community 14]]
- [[_COMMUNITY_Community 15|Community 15]]
- [[_COMMUNITY_Community 16|Community 16]]
- [[_COMMUNITY_Community 17|Community 17]]
- [[_COMMUNITY_Community 18|Community 18]]
- [[_COMMUNITY_Community 19|Community 19]]
- [[_COMMUNITY_Community 22|Community 22]]

## God Nodes (most connected - your core abstractions)
1. `cn()` - 65 edges
2. `Button()` - 15 edges
3. `DropdownMenuContent()` - 11 edges
4. `DropdownMenu()` - 10 edges
5. `DropdownMenuTrigger()` - 10 edges
6. `DropdownMenuItem()` - 9 edges
7. `DropdownMenuSeparator()` - 7 edges
8. `getStore()` - 7 edges
9. `buttonVariants` - 6 edges
10. `hydrate()` - 6 edges

## Surprising Connections (you probably didn't know these)
- `Next.js Agent Rules: read docs first` --rationale_for--> `Next.js Configuration`  [INFERRED]
  AGENTS.md → next.config.ts
- `pnpm Workspace Config` --conceptually_related_to--> `Next.js Configuration`  [INFERRED]
  pnpm-workspace.yaml → next.config.ts
- `Next.js Agent Rules: read docs first` --rationale_for--> `RootLayout Component`  [INFERRED]
  AGENTS.md → src/app/layout.tsx
- `Next.js Project README` --references--> `Geist Sans Font Loader`  [EXTRACTED]
  README.md → src/app/layout.tsx
- `Next.js Project README` --references--> `Home Page Component`  [EXTRACTED]
  README.md → src/app/page.tsx

## Hyperedges (group relationships)
- **Tailwind+CVA+cn styling pipeline** — postcss_config, button_buttonvariants, utils_cn, tailwind_design_system [INFERRED 0.85]
- **Next.js App Router project setup** — next_config, nextenv_dts, layout_rootlayout, page_home, eslint_config [INFERRED 0.85]

## Communities (23 total, 9 thin omitted)

### Community 0 - "Layout Root + Fonts"
Cohesion: 0.08
Nodes (31): AnalyticsChart(), DayDatum, RangeFilter(), RANGES, AssigneeCell(), AVATAR_COLORS, colorFor(), DEFAULTS (+23 more)

### Community 1 - "Button Component Utility"
Cohesion: 0.1
Nodes (21): DatePicker(), fmtDate(), fmtTime12(), HOURS, MINUTES, NumberDropdown(), pad(), ThoughtEditor (+13 more)

### Community 2 - "App Entry Components"
Cohesion: 0.11
Nodes (24): HydrationContext, getStore(), hydrate(), isSettingsLike(), isTodoLike(), isTodosState(), isUsersState(), loadSettings() (+16 more)

### Community 3 - "Styling Pipeline"
Cohesion: 0.08
Nodes (18): AnalyticsHeatmap(), Cell, DAYS_DISPLAY, JS_DAY_TO_ROW, Props, ConfirmDialog(), ConfirmState, PromptDialog() (+10 more)

### Community 4 - "Agent Guidance Configs"
Cohesion: 0.15
Nodes (18): cn(), AlertDialog(), AlertDialogAction(), AlertDialogCancel(), AlertDialogContent(), AlertDialogDescription(), AlertDialogFooter(), AlertDialogHeader() (+10 more)

### Community 5 - "PostCSS Config"
Cohesion: 0.14
Nodes (19): DateRangeCell(), fmtDate(), fmtFull(), fmtTime12(), HOURS, MINUTES, NumberDropdown(), pad() (+11 more)

### Community 6 - "ESLint Config"
Cohesion: 0.15
Nodes (12): AppShell(), MainContent(), Sidebar(), DayDatum, GroupRow, TimelineView(), Switch(), Tabs() (+4 more)

### Community 7 - "Next Config"
Cohesion: 0.18
Nodes (15): TitleStyleControls(), FONT_LABEL, FONT_SIZES, FONT_VAR, FONT_WEIGHT_LABEL, FONT_WEIGHTS, FontKey, FONTS (+7 more)

### Community 8 - "Home Page"
Cohesion: 0.22
Nodes (7): caveat, geistMono, geistSans, metadata, poppins, roboto, Providers()

### Community 9 - "TS/Lint Env"
Cohesion: 0.25
Nodes (9): Next.js Agent Rules: read docs first, Graphify Codebase Map Guidance, Geist Mono Font Loader, Geist Sans Font Loader, RootLayout Component, Next.js Configuration, Home Page Component, pnpm Workspace Config (+1 more)

### Community 10 - "Next Env Types"
Cohesion: 0.4
Nodes (4): code:bash (npm run dev), Deploy on Vercel, Getting Started, Learn More

### Community 11 - "Page Metadata"
Cohesion: 0.5
Nodes (5): Button Component, Button CVA Variants, PostCSS Config with Tailwind plugin, Tailwind Design System, cn className merge utility

## Knowledge Gaps
- **54 isolated node(s):** `config`, `eslintConfig`, `nextConfig`, `roboto`, `poppins` (+49 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **9 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `cn()` connect `Agent Guidance Configs` to `Layout Root + Fonts`, `Button Component Utility`, `Styling Pipeline`, `PostCSS Config`, `ESLint Config`?**
  _High betweenness centrality (0.191) - this node is a cross-community bridge._
- **Why does `Button()` connect `Button Component Utility` to `Layout Root + Fonts`, `Styling Pipeline`, `Agent Guidance Configs`, `PostCSS Config`, `Next Config`?**
  _High betweenness centrality (0.015) - this node is a cross-community bridge._
- **Why does `Todo` connect `Styling Pipeline` to `Layout Root + Fonts`, `Button Component Utility`, `App Entry Components`?**
  _High betweenness centrality (0.010) - this node is a cross-community bridge._
- **What connects `config`, `eslintConfig`, `nextConfig` to the rest of the system?**
  _54 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Layout Root + Fonts` be split into smaller, more focused modules?**
  _Cohesion score 0.08 - nodes in this community are weakly interconnected._
- **Should `Button Component Utility` be split into smaller, more focused modules?**
  _Cohesion score 0.1 - nodes in this community are weakly interconnected._
- **Should `App Entry Components` be split into smaller, more focused modules?**
  _Cohesion score 0.11 - nodes in this community are weakly interconnected._