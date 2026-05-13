# Graph Report - .  (2026-05-13)

## Corpus Check
- Corpus is ~715 words - fits in a single context window. You may not need a graph.

## Summary
- 36 nodes · 30 edges · 12 communities (7 shown, 5 thin omitted)
- Extraction: 77% EXTRACTED · 23% INFERRED · 0% AMBIGUOUS · INFERRED: 7 edges (avg confidence: 0.76)
- Token cost: 24,792 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Layout Root + Fonts|Layout Root + Fonts]]
- [[_COMMUNITY_Button Component Utility|Button Component Utility]]
- [[_COMMUNITY_App Entry Components|App Entry Components]]
- [[_COMMUNITY_Styling Pipeline|Styling Pipeline]]
- [[_COMMUNITY_Agent Guidance Configs|Agent Guidance Configs]]
- [[_COMMUNITY_PostCSS Config|PostCSS Config]]
- [[_COMMUNITY_ESLint Config|ESLint Config]]
- [[_COMMUNITY_Next Config|Next Config]]
- [[_COMMUNITY_TSLint Env|TS/Lint Env]]
- [[_COMMUNITY_Page Metadata|Page Metadata]]

## God Nodes (most connected - your core abstractions)
1. `RootLayout Component` - 4 edges
2. `Button()` - 3 edges
3. `cn()` - 3 edges
4. `Button CVA Variants` - 3 edges
5. `Next.js Agent Rules: read docs first` - 3 edges
6. `buttonVariants` - 2 edges
7. `Next.js Configuration` - 2 edges
8. `Geist Sans Font Loader` - 2 edges
9. `Home Page Component` - 2 edges
10. `Button Component` - 2 edges

## Surprising Connections (you probably didn't know these)
- `Next.js Agent Rules: read docs first` --rationale_for--> `RootLayout Component`  [INFERRED]
  AGENTS.md → src/app/layout.tsx
- `Next.js Agent Rules: read docs first` --rationale_for--> `Next.js Configuration`  [INFERRED]
  AGENTS.md → next.config.ts
- `pnpm Workspace Config` --conceptually_related_to--> `Next.js Configuration`  [INFERRED]
  pnpm-workspace.yaml → next.config.ts
- `Next.js Project README` --references--> `Geist Sans Font Loader`  [EXTRACTED]
  README.md → src/app/layout.tsx
- `Next.js Project README` --references--> `Home Page Component`  [EXTRACTED]
  README.md → src/app/page.tsx

## Hyperedges (group relationships)
- **Tailwind+CVA+cn styling pipeline** — postcss_config, button_buttonvariants, utils_cn, tailwind_design_system [INFERRED 0.85]
- **Next.js App Router project setup** — next_config, nextenv_dts, layout_rootlayout, page_home, eslint_config [INFERRED 0.85]

## Communities (12 total, 5 thin omitted)

### Community 0 - "Layout Root + Fonts"
Cohesion: 0.4
Nodes (3): geistMono, geistSans, metadata

### Community 1 - "Button Component Utility"
Cohesion: 0.7
Nodes (3): cn(), Button(), buttonVariants

### Community 2 - "App Entry Components"
Cohesion: 0.5
Nodes (5): Geist Mono Font Loader, Geist Sans Font Loader, RootLayout Component, Home Page Component, Next.js Project README

### Community 3 - "Styling Pipeline"
Cohesion: 0.5
Nodes (5): Button Component, Button CVA Variants, PostCSS Config with Tailwind plugin, Tailwind Design System, cn className merge utility

### Community 4 - "Agent Guidance Configs"
Cohesion: 0.5
Nodes (4): Next.js Agent Rules: read docs first, Graphify Codebase Map Guidance, Next.js Configuration, pnpm Workspace Config

## Knowledge Gaps
- **13 isolated node(s):** `config`, `eslintConfig`, `nextConfig`, `geistSans`, `geistMono` (+8 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **5 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `RootLayout Component` connect `App Entry Components` to `Agent Guidance Configs`?**
  _High betweenness centrality (0.033) - this node is a cross-community bridge._
- **Why does `Next.js Agent Rules: read docs first` connect `Agent Guidance Configs` to `App Entry Components`?**
  _High betweenness centrality (0.029) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `RootLayout Component` (e.g. with `Home Page Component` and `Next.js Agent Rules: read docs first`) actually correct?**
  _`RootLayout Component` has 2 INFERRED edges - model-reasoned connections that need verification._
- **Are the 2 inferred relationships involving `Button CVA Variants` (e.g. with `Tailwind Design System` and `cn className merge utility`) actually correct?**
  _`Button CVA Variants` has 2 INFERRED edges - model-reasoned connections that need verification._
- **Are the 2 inferred relationships involving `Next.js Agent Rules: read docs first` (e.g. with `Next.js Configuration` and `RootLayout Component`) actually correct?**
  _`Next.js Agent Rules: read docs first` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `config`, `eslintConfig`, `nextConfig` to the rest of the system?**
  _13 weakly-connected nodes found - possible documentation gaps or missing edges._