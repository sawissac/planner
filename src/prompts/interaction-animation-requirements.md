# User Interaction Animation Requirements — Tablet & Desktop

Scope: pointer-driven UI (mouse + trackpad on desktop, touch + stylus on tablet) for the organization portal. Phone breakpoints out of scope.

## 1. Stack Constraints

Animation MUST use what ships in the repo. No new animation library without approval.

- **Tailwind v4 + `tw-animate-css`** — utility classes (`animate-in`, `animate-out`, `fade-in`, `slide-in-from-*`, `zoom-in`, `duration-*`, `ease-*`). Primary tool.
- **Radix UI (`radix-ui`)** — animate via `data-[state=open]` / `data-[state=closed]` attribute selectors. Dialog, Dropdown, Popover, Tooltip, Accordion, Tabs.
- **`vaul`** — drawer/sheet physics. Use as-is; do not re-animate on top.
- **`sonner`** — toast enter/exit. Use built-in transitions.
- **Plain CSS transitions** — hover, focus, press states on buttons/cards/rows.
- **D3 (`d3`)** — chart-only transitions (see §7). Do not use D3 for DOM/layout UI.
- **`motion`** (framer-motion successor, `motion/react`) — **approved** for spring/physics-driven interactions where CSS can't express the feel (e.g. the global click burst, `@/components/customs/ClickBurst`). Prefer the lighter tools above for simple state/hover/enter transitions; reach for `motion` when you need spring physics or orchestration. Keep animations `transform`/`opacity`-only and honour reduced motion (§6).

No `react-spring`. Beyond the approved set above, raise before adding a new animation dep.

## 2. Motion Tokens (define once, reuse)

Add to `src/styles/globals.css` as CSS custom properties. Every animation references a token — no inline magic numbers.

| Token                       | Value                               | Use                                   |
| --------------------------- | ----------------------------------- | ------------------------------------- |
| `--motion-duration-instant` | 80ms                                | press feedback, checkbox tick         |
| `--motion-duration-fast`    | 150ms                               | hover, focus ring, small state change |
| `--motion-duration-base`    | 220ms                               | dropdown, tooltip, tab switch         |
| `--motion-duration-slow`    | 320ms                               | dialog, drawer, page-section reveal   |
| `--motion-ease-standard`    | `cubic-bezier(0.2, 0, 0, 1)`        | enters, most transitions              |
| `--motion-ease-accelerate`  | `cubic-bezier(0.4, 0, 1, 1)`        | exits                                 |
| `--motion-ease-spring`      | `cubic-bezier(0.34, 1.56, 0.64, 1)` | playful overshoot (sparingly)         |

Rule: enter = standard ease, exit = accelerate ease + ~30% shorter duration. Exits faster than enters.

## 3. Device-Specific Behavior

| Concern          | Desktop (pointer: fine)                    | Tablet (pointer: coarse)                                             |
| ---------------- | ------------------------------------------ | -------------------------------------------------------------------- |
| Hover states     | Full — gate behind `@media (hover: hover)` | No hover; show state on `:active`/press instead                      |
| Tap/press target | 32px min interactive                       | **44px min** interactive                                             |
| Press feedback   | subtle (`scale 0.98`, 80ms)                | mandatory — touch has no cursor, press scale + bg shift confirms tap |
| Tooltips         | hover-triggered, 500ms delay               | long-press triggered OR omit; never hover-only info                  |
| Drag handles     | visible on hover                           | always visible                                                       |
| Scroll           | wheel/trackbar                             | momentum (native), no JS hijack                                      |

Detect with CSS media queries, NOT user-agent. Use `@media (hover: hover) and (pointer: fine)` for desktop hover, `@media (pointer: coarse)` for tablet sizing.

## 4. Component Interaction Specs

### Buttons / clickable rows

- Hover (desktop): bg/border shift, `--motion-duration-fast`.
- Press (all): `scale(0.98)` + bg darken, `--motion-duration-instant`. Release springs back via `--motion-ease-standard`.
- Focus-visible: ring fades in `--motion-duration-fast`. Keyboard nav must show it.
- Disabled: no transition, no press.

### Dialogs (Radix Dialog) — `OrganizationAction*`, `RoleChangeConfirmAlert`, `TransferModal`

- Overlay: `fade-in` / `fade-out`, `--motion-duration-base`.
- Content: `fade-in` + `zoom-in-95` + `slide-in-from-top-2` enter at `--motion-duration-slow`; reverse + accelerate ease on close.
- Drive off `data-[state]`, not React state.

### Dropdowns / Popovers / Tooltips (Radix)

- `fade-in` + `slide-in-from-*` (2–8px, direction = `data-side`), `--motion-duration-base`.
- Tooltip enter delay 500ms desktop; suppress on coarse pointer.

### Tabs (Radix Tabs) — analytics/detail views

- Content cross-fade `--motion-duration-base`. Active indicator slides between triggers, `--motion-ease-standard`.
- Respect reduced-motion: swap slide for instant.

### Tables — `MemberUserTable`, `OrganizationUserTable`, `MemberUserTableGrid`

- Virtualized (`@tanstack/react-virtual`) — **do not** animate per-row mount/unmount; it fights virtualization and stutters on tablet. Rows appear instantly.
- Row hover (desktop only): bg highlight `--motion-duration-fast`.
- Selection: checkbox/bg shift `--motion-duration-fast`.
- Sort/filter result change: no row choreography. Skeleton or subtle container fade only.
- Expand/detail row: height/`grid-template-rows` transition `--motion-duration-base`.

### Drawers / Sheets (vaul)

- Use vaul defaults (drag-to-dismiss, velocity snap). Tablet: drag gesture mandatory and must feel native.
- Backdrop fades with sheet position.

### Toasts (sonner)

- Built-in slide+fade. Don't override. Stack collapse on hover (desktop) / on tap (tablet).

### Tree (org tree — `tree`, `tree-move`, `tree-rename`, `tree-delete`)

- Expand/collapse: chevron rotate `--motion-duration-fast` + children height/fade `--motion-duration-base`.
- Move/reorder: highlight drop target; settle moved node with one `--motion-ease-spring` pulse. No long reflow animation.

## 5. Loading & Async (mutations: assign, transfer, role change, domain update)

- Optimistic UI where safe; otherwise skeleton + disable trigger.
- Button pending: inline spinner replaces label, width locked (no layout jump).
- Skeletons: `animate-pulse`, `--motion-duration-slow`+ loop. Match final layout dimensions to prevent shift.
- Min display ~200ms to avoid flash; if data resolves faster, skip skeleton entirely.

## 6. Accessibility — non-negotiable

- Honor `prefers-reduced-motion: reduce`: drop transforms/slides/zoom, keep opacity ≤120ms or instant. Wrap all motion in a media guard.
- Never block interaction on an animation finishing. Animation is feedback, not a gate.
- Focus order and visibility preserved through every transition.
- No motion-only state signal — pair with color/icon/text.
- No flashing > 3Hz.

## 7. Performance Budget

- Animate only `transform` + `opacity`. Avoid `width`/`height`/`top`/`left`/`box-shadow` in transitions (use `grid-template-rows` or `scale` for size).
- 60fps target; tablet GPUs weaker — keep concurrent animations few, avoid large blur/shadow animation.
- `will-change` only during an active animation, removed after. No permanent `will-change`.
- No animation on scroll-tied layout that triggers reflow.
- Total enter choreography on any view ≤ 600ms to interactive.

## 8. Definition of Done

- [ ] All durations/eases via §2 tokens, zero hardcoded values.
- [ ] Hover gated behind `@media (hover: hover)`; tablet press feedback present.
- [ ] 44px min targets on coarse pointer.
- [ ] `prefers-reduced-motion` path verified for every animated component.
- [ ] Virtualized tables: no per-row mount animation.
- [ ] Animations use `transform`/`opacity` only; checked in DevTools (no layout thrash).
- [ ] Radix components animate via `data-[state]`, not JS.
- [ ] Verified on a real/emulated tablet (touch) and desktop (mouse + keyboard).
