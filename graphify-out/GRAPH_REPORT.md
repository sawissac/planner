# Graph Report - planner  (2026-05-18)

## Corpus Check
- 89 files · ~68,027 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 725 nodes · 1578 edges · 38 communities (27 shown, 11 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 7 edges (avg confidence: 0.76)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `6f6fda54`
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
- [[_COMMUNITY_Community 37|Community 37]]

## God Nodes (most connected - your core abstractions)
1. `cn()` - 191 edges
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

## Communities (38 total, 11 thin omitted)

### Community 0 - "Layout Root + Fonts"
Cohesion: 0.05
Nodes (62): DateRangeCell(), fmtDate(), fmtFull(), fmtTime12(), HOURS, isDayEnd(), isDayStart(), isSameDay() (+54 more)

### Community 1 - "Button Component Utility"
Cohesion: 0.05
Nodes (56): PRESETS, AssigneeCell(), AVATAR_COLORS, colorFor(), DEFAULTS, PRIORITY_COLOR, PriorityCell(), colorFor() (+48 more)

### Community 2 - "App Entry Components"
Cohesion: 0.03
Nodes (50): AttachmentsContext, LocalAttachmentsContext, PromptInputActionAddAttachmentsProps, PromptInputActionMenuContentProps, PromptInputActionMenuItemProps, PromptInputActionMenuProps, PromptInputActionMenuTriggerProps, PromptInputAttachmentProps (+42 more)

### Community 3 - "Styling Pipeline"
Cohesion: 0.06
Nodes (28): Conversation(), ConversationContent(), ConversationContentProps, ConversationEmptyState(), ConversationEmptyStateProps, ConversationProps, ConversationScrollButton(), ConversationScrollButtonProps (+20 more)

### Community 4 - "Agent Guidance Configs"
Cohesion: 0.06
Nodes (35): HydrationContext, getStore(), hydrate(), isSettingsLike(), isTodoLike(), isTodosState(), isUsersState(), loadSettings() (+27 more)

### Community 5 - "PostCSS Config"
Cohesion: 0.08
Nodes (42): chatCompletion(), ChatCompletionResponse, getApiKey(), getEndpoint(), getOllamaBaseUrl(), listOllamaModels(), listOpenrouterFreeModels(), OpenAIMessage (+34 more)

### Community 6 - "ESLint Config"
Cohesion: 0.06
Nodes (35): Message(), MessageActionProps, MessageActions(), MessageActionsProps, MessageAttachment(), MessageAttachmentProps, MessageAttachments(), MessageAttachmentsProps (+27 more)

### Community 7 - "Next Config"
Cohesion: 0.11
Nodes (33): DriveSyncButton(), authedFetch(), doFetch(), ensureTokenClient(), fetchRemote(), findFileId(), GoogleTokenClient, GoogleTokenResponse (+25 more)

### Community 8 - "Home Page"
Cohesion: 0.07
Nodes (25): AccentPicker(), AssigneeBreakdown(), BAR_PALETTE, GroupBreakdown(), Row, AnalyticsChart(), DayDatum, RangeFilter() (+17 more)

### Community 9 - "TS/Lint Env"
Cohesion: 0.07
Nodes (35): PromptInputActionMenuContent(), PromptInputActionMenuItem(), PromptInputBody(), PromptInputButton(), PromptInputCommand(), PromptInputCommandEmpty(), PromptInputCommandGroup(), PromptInputCommandInput() (+27 more)

### Community 10 - "Next Env Types"
Cohesion: 0.1
Nodes (23): BoardView(), Card(), colorFor(), Column(), ColumnBody(), ColumnProps, DEFAULTS, DragHandle (+15 more)

### Community 11 - "Page Metadata"
Cohesion: 0.12
Nodes (16): Avatar(), AvatarBadge(), AvatarFallback(), AvatarGroup(), AvatarGroupCount(), AvatarImage(), Markdown, Message() (+8 more)

### Community 12 - "Community 12"
Cohesion: 0.19
Nodes (9): ExportBundle, isExportBundle(), Sidebar(), useFullscreen(), isTodoFile(), Tooltip(), TooltipContent(), TooltipProvider() (+1 more)

### Community 13 - "Community 13"
Cohesion: 0.17
Nodes (12): PromptInput(), PromptInputAction(), PromptInputActionProps, PromptInputActions(), PromptInputActionsProps, PromptInputContext, PromptInputContextType, PromptInputProps (+4 more)

### Community 14 - "Community 14"
Cohesion: 0.16
Nodes (9): CodeBlock(), CodeBlockCode(), CodeBlockCodeProps, CodeBlockGroup(), CodeBlockGroupProps, CodeBlockProps, INITIAL_COMPONENTS, MarkdownProps (+1 more)

### Community 15 - "Community 15"
Cohesion: 0.18
Nodes (9): caveat, geistMono, geistSans, metadata, poppins, roboto, viewport, Providers() (+1 more)

### Community 16 - "Community 16"
Cohesion: 0.18
Nodes (10): Command(), CommandDialog(), CommandEmpty(), CommandGroup(), CommandInput(), CommandItem(), CommandList(), CommandSeparator() (+2 more)

### Community 17 - "Community 17"
Cohesion: 0.24
Nodes (9): InputGroup(), InputGroupAddon(), inputGroupAddonVariants, InputGroupButton(), inputGroupButtonVariants, InputGroupInput(), InputGroupText(), InputGroupTextarea() (+1 more)

### Community 18 - "Community 18"
Cohesion: 0.25
Nodes (9): Next.js Agent Rules: read docs first, Graphify Codebase Map Guidance, Geist Mono Font Loader, Geist Sans Font Loader, RootLayout Component, Next.js Configuration, Home Page Component, pnpm Workspace Config (+1 more)

### Community 19 - "Community 19"
Cohesion: 0.25
Nodes (8): PromptInput(), PromptInputActionAddAttachments(), PromptInputAttachment(), PromptInputAttachments(), PromptInputTextarea(), useOptionalPromptInputController(), useOptionalProviderAttachments(), usePromptInputAttachments()

### Community 20 - "Community 20"
Cohesion: 0.4
Nodes (4): copy, fetched, SHELL, url

### Community 21 - "Community 21"
Cohesion: 0.4
Nodes (3): Loader(), LoaderIconProps, LoaderProps

### Community 22 - "Community 22"
Cohesion: 0.4
Nodes (4): code:bash (npm run dev), Deploy on Vercel, Getting Started, Learn More

### Community 23 - "Community 23"
Cohesion: 0.5
Nodes (5): Button Component, Button CVA Variants, PostCSS Config with Tailwind plugin, Tailwind Design System, cn className merge utility

### Community 24 - "Community 24"
Cohesion: 0.5
Nodes (3): HoverCard(), HoverCardContent(), HoverCardTrigger()

## Knowledge Gaps
- **192 isolated node(s):** `config`, `eslintConfig`, `nextConfig`, `SHELL`, `url` (+187 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **11 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `cn()` connect `TS/Lint Env` to `Layout Root + Fonts`, `Button Component Utility`, `App Entry Components`, `Styling Pipeline`, `ESLint Config`, `Next Config`, `Home Page`, `Next Env Types`, `Page Metadata`, `Community 12`, `Community 13`, `Community 14`, `Community 16`, `Community 17`, `Community 19`, `Community 21`, `Community 24`?**
  _High betweenness centrality (0.331) - this node is a cross-community bridge._
- **Why does `Button()` connect `Styling Pipeline` to `Layout Root + Fonts`, `Button Component Utility`, `App Entry Components`, `ESLint Config`, `Next Config`, `Home Page`, `TS/Lint Env`, `Next Env Types`, `Community 12`, `Community 17`?**
  _High betweenness centrality (0.043) - this node is a cross-community bridge._
- **Why does `DropdownMenuContent()` connect `Button Component Utility` to `Layout Root + Fonts`, `App Entry Components`, `Styling Pipeline`, `Home Page`, `TS/Lint Env`, `Next Env Types`?**
  _High betweenness centrality (0.008) - this node is a cross-community bridge._
- **What connects `config`, `eslintConfig`, `nextConfig` to the rest of the system?**
  _192 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Layout Root + Fonts` be split into smaller, more focused modules?**
  _Cohesion score 0.05 - nodes in this community are weakly interconnected._
- **Should `Button Component Utility` be split into smaller, more focused modules?**
  _Cohesion score 0.05 - nodes in this community are weakly interconnected._
- **Should `App Entry Components` be split into smaller, more focused modules?**
  _Cohesion score 0.03 - nodes in this community are weakly interconnected._