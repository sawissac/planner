# Graph Report - planner  (2026-05-18)

## Corpus Check
- 88 files · ~66,802 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 712 nodes · 1548 edges · 46 communities (34 shown, 12 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 7 edges (avg confidence: 0.76)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `7d28861a`
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
- [[_COMMUNITY_Community 20|Community 20]]
- [[_COMMUNITY_Community 21|Community 21]]
- [[_COMMUNITY_Community 22|Community 22]]
- [[_COMMUNITY_Community 23|Community 23]]
- [[_COMMUNITY_Community 24|Community 24]]
- [[_COMMUNITY_Community 25|Community 25]]
- [[_COMMUNITY_Community 26|Community 26]]
- [[_COMMUNITY_Community 27|Community 27]]
- [[_COMMUNITY_Community 28|Community 28]]
- [[_COMMUNITY_Community 29|Community 29]]
- [[_COMMUNITY_Community 30|Community 30]]
- [[_COMMUNITY_Community 31|Community 31]]
- [[_COMMUNITY_Community 32|Community 32]]
- [[_COMMUNITY_Community 33|Community 33]]
- [[_COMMUNITY_Community 34|Community 34]]
- [[_COMMUNITY_Community 35|Community 35]]
- [[_COMMUNITY_Community 36|Community 36]]
- [[_COMMUNITY_Community 37|Community 37]]
- [[_COMMUNITY_Community 38|Community 38]]
- [[_COMMUNITY_Community 39|Community 39]]
- [[_COMMUNITY_Community 40|Community 40]]
- [[_COMMUNITY_Community 41|Community 41]]
- [[_COMMUNITY_Community 42|Community 42]]
- [[_COMMUNITY_Community 45|Community 45]]

## God Nodes (most connected - your core abstractions)
1. `cn()` - 190 edges
2. `Button()` - 27 edges
3. `DropdownMenuContent()` - 16 edges
4. `DropdownMenu()` - 15 edges
5. `DropdownMenuTrigger()` - 15 edges
6. `DropdownMenuItem()` - 13 edges
7. `DateRangeCell()` - 10 edges
8. `DropdownMenuSeparator()` - 10 edges
9. `runLoop()` - 9 edges
10. `buttonVariants` - 8 edges

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

## Communities (46 total, 12 thin omitted)

### Community 0 - "Layout Root + Fonts"
Cohesion: 0.03
Nodes (50): AttachmentsContext, LocalAttachmentsContext, PromptInputActionAddAttachmentsProps, PromptInputActionMenuContentProps, PromptInputActionMenuItemProps, PromptInputActionMenuProps, PromptInputActionMenuTriggerProps, PromptInputAttachmentProps (+42 more)

### Community 1 - "Button Component Utility"
Cohesion: 0.06
Nodes (50): Conversation(), ConversationContent(), ConversationContentProps, ConversationEmptyState(), ConversationEmptyStateProps, ConversationProps, ConversationScrollButton(), ConversationScrollButtonProps (+42 more)

### Community 2 - "App Entry Components"
Cohesion: 0.06
Nodes (45): caveat, geistMono, geistSans, metadata, poppins, roboto, viewport, HydrationContext (+37 more)

### Community 3 - "Styling Pipeline"
Cohesion: 0.07
Nodes (45): DateRangeCell(), fmtDate(), fmtFull(), fmtTime12(), HOURS, isDayEnd(), isDayStart(), isSameDay() (+37 more)

### Community 4 - "Agent Guidance Configs"
Cohesion: 0.07
Nodes (40): PromptInputActionMenuContent(), PromptInputActionMenuItem(), PromptInputButton(), PromptInputCommand(), PromptInputCommandEmpty(), PromptInputCommandGroup(), PromptInputCommandInput(), PromptInputCommandItem() (+32 more)

### Community 5 - "PostCSS Config"
Cohesion: 0.06
Nodes (23): OpenAITool, endOfDay(), parseDate(), runTool(), startOfDay(), ToolName, ToolResult, metadata (+15 more)

### Community 6 - "ESLint Config"
Cohesion: 0.09
Nodes (20): GROUPS, Shortcut, DatePicker(), fmtDate(), fmtTime12(), HOURS, MINUTES, NumberDropdown() (+12 more)

### Community 7 - "Next Config"
Cohesion: 0.07
Nodes (30): Message(), MessageActionProps, MessageActions(), MessageActionsProps, MessageAttachment(), MessageAttachmentProps, MessageAttachments(), MessageAttachmentsProps (+22 more)

### Community 8 - "Home Page"
Cohesion: 0.13
Nodes (17): BoardView(), Card(), colorFor(), Column(), ColumnBody(), ColumnProps, DEFAULTS, DragHandle (+9 more)

### Community 9 - "TS/Lint Env"
Cohesion: 0.19
Nodes (15): AccentPicker(), PRESETS, AssigneeCell(), AVATAR_COLORS, colorFor(), DEFAULTS, PRIORITY_COLOR, PriorityCell() (+7 more)

### Community 10 - "Next Env Types"
Cohesion: 0.15
Nodes (14): AnalyticsChart(), DayDatum, RangeFilter(), RANGES, DateRangeValue, DayDatum, GroupRow, TimelineView() (+6 more)

### Community 11 - "Page Metadata"
Cohesion: 0.19
Nodes (16): getStore(), hydrate(), isSettingsLike(), isTodoLike(), isTodosState(), isUsersState(), loadSettings(), loadTodos() (+8 more)

### Community 12 - "Community 12"
Cohesion: 0.17
Nodes (16): TitleStyleControls(), DEFAULT_PROGRESS_OPTIONS, FONT_LABEL, FONT_SIZES, FONT_VAR, FONT_WEIGHT_LABEL, FONT_WEIGHTS, FontKey (+8 more)

### Community 13 - "Community 13"
Cohesion: 0.12
Nodes (11): AnalyticsHeatmap(), Cell, DAYS_DISPLAY, JS_DAY_TO_ROW, Props, Group, initialState, Todo (+3 more)

### Community 14 - "Community 14"
Cohesion: 0.15
Nodes (10): DriveSyncButton(), ExportBundle, isExportBundle(), Sidebar(), useFullscreen(), isTodoFile(), initialState, User (+2 more)

### Community 15 - "Community 15"
Cohesion: 0.19
Nodes (12): ConfirmDialog(), ConfirmState, AlertDialog(), AlertDialogAction(), AlertDialogCancel(), AlertDialogContent(), AlertDialogDescription(), AlertDialogFooter() (+4 more)

### Community 16 - "Community 16"
Cohesion: 0.16
Nodes (13): Message(), MessageActionProps, MessageActions(), MessageActionsProps, MessageAvatar(), MessageAvatarProps, MessageContent(), MessageContentProps (+5 more)

### Community 17 - "Community 17"
Cohesion: 0.15
Nodes (10): CodeBlock(), CodeBlockCode(), CodeBlockCodeProps, CodeBlockGroup(), CodeBlockGroupProps, CodeBlockProps, INITIAL_COMPONENTS, Markdown (+2 more)

### Community 18 - "Community 18"
Cohesion: 0.15
Nodes (7): GroupFilterHeader(), PriorityFilterHeader(), ProgressFilterHeader(), RowMeta, SortOption, TitleCell(), Checkbox()

### Community 19 - "Community 19"
Cohesion: 0.21
Nodes (10): InputGroup(), InputGroupAddon(), inputGroupAddonVariants, InputGroupButton(), inputGroupButtonVariants, InputGroupInput(), InputGroupText(), InputGroupTextarea() (+2 more)

### Community 20 - "Community 20"
Cohesion: 0.2
Nodes (11): PromptInput(), PromptInputAction(), PromptInputActionProps, PromptInputActions(), PromptInputActionsProps, PromptInputContext, PromptInputContextType, PromptInputProps (+3 more)

### Community 21 - "Community 21"
Cohesion: 0.22
Nodes (6): TodoTable(), UserRowActions(), RowMeta, SortOption, UserTable(), useTouchRowDrag()

### Community 22 - "Community 22"
Cohesion: 0.2
Nodes (9): Command(), CommandDialog(), CommandEmpty(), CommandGroup(), CommandInput(), CommandItem(), CommandList(), CommandSeparator() (+1 more)

### Community 23 - "Community 23"
Cohesion: 0.22
Nodes (4): AssigneeBreakdown(), BAR_PALETTE, GroupBreakdown(), Row

### Community 24 - "Community 24"
Cohesion: 0.25
Nodes (9): Next.js Agent Rules: read docs first, Graphify Codebase Map Guidance, Geist Mono Font Loader, Geist Sans Font Loader, RootLayout Component, Next.js Configuration, Home Page Component, pnpm Workspace Config (+1 more)

### Community 25 - "Community 25"
Cohesion: 0.25
Nodes (8): PromptInput(), PromptInputActionAddAttachments(), PromptInputAttachment(), PromptInputAttachments(), PromptInputTextarea(), useOptionalPromptInputController(), useOptionalProviderAttachments(), usePromptInputAttachments()

### Community 26 - "Community 26"
Cohesion: 0.38
Nodes (5): ButtonGroup(), ButtonGroupSeparator(), ButtonGroupText(), buttonGroupVariants, Separator()

### Community 27 - "Community 27"
Cohesion: 0.4
Nodes (4): copy, fetched, SHELL, url

### Community 28 - "Community 28"
Cohesion: 0.4
Nodes (3): Loader(), LoaderIconProps, LoaderProps

### Community 29 - "Community 29"
Cohesion: 0.4
Nodes (4): code:bash (npm run dev), Deploy on Vercel, Getting Started, Learn More

### Community 30 - "Community 30"
Cohesion: 0.5
Nodes (5): Button Component, Button CVA Variants, PostCSS Config with Tailwind plugin, Tailwind Design System, cn className merge utility

### Community 31 - "Community 31"
Cohesion: 0.5
Nodes (3): HoverCard(), HoverCardContent(), HoverCardTrigger()

## Knowledge Gaps
- **191 isolated node(s):** `config`, `eslintConfig`, `nextConfig`, `SHELL`, `url` (+186 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **12 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `cn()` connect `Agent Guidance Configs` to `Layout Root + Fonts`, `Button Component Utility`, `Styling Pipeline`, `PostCSS Config`, `ESLint Config`, `Next Config`, `Home Page`, `TS/Lint Env`, `Next Env Types`, `Community 12`, `Community 14`, `Community 15`, `Community 16`, `Community 17`, `Community 18`, `Community 19`, `Community 20`, `Community 21`, `Community 22`, `Community 25`, `Community 26`, `Community 28`, `Community 31`?**
  _High betweenness centrality (0.332) - this node is a cross-community bridge._
- **Why does `Button()` connect `TS/Lint Env` to `Layout Root + Fonts`, `Button Component Utility`, `App Entry Components`, `Styling Pipeline`, `Agent Guidance Configs`, `ESLint Config`, `Next Config`, `Home Page`, `Next Env Types`, `Community 12`, `Community 14`, `Community 15`, `Community 18`, `Community 19`?**
  _High betweenness centrality (0.044) - this node is a cross-community bridge._
- **Why does `DropdownMenuContent()` connect `TS/Lint Env` to `Layout Root + Fonts`, `Button Component Utility`, `Styling Pipeline`, `Agent Guidance Configs`, `ESLint Config`, `Home Page`, `Next Env Types`, `Community 12`, `Community 18`, `Community 21`?**
  _High betweenness centrality (0.008) - this node is a cross-community bridge._
- **What connects `config`, `eslintConfig`, `nextConfig` to the rest of the system?**
  _191 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Layout Root + Fonts` be split into smaller, more focused modules?**
  _Cohesion score 0.03 - nodes in this community are weakly interconnected._
- **Should `Button Component Utility` be split into smaller, more focused modules?**
  _Cohesion score 0.06 - nodes in this community are weakly interconnected._
- **Should `App Entry Components` be split into smaller, more focused modules?**
  _Cohesion score 0.06 - nodes in this community are weakly interconnected._