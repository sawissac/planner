# Rules for building features

A feature is a self-contained UI module under `src/features/<Name>/`. See
**@project_structure.md** for exact file placement.

## Naming & shape

- Folder name is PascalCase; entry file matches the folder: `src/features/<Name>/<Name>.tsx` (e.g. `AppDrawer/AppDrawer.tsx`).
- Every feature exposes a barrel `src/features/<Name>/index.ts` that re-exports its public surface (the entry component, mostly).
- A route's `page.tsx` is a thin shell that mounts one feature via its barrel.

## Imports & boundaries

- Cross-feature imports go through the barrel: `@/features/<Name>` — never reach into another feature's internal files.
- A part used by more than one feature is **promoted to its own feature folder**, not deep-imported.
- Truly private sub-components stay in `src/features/<Name>/components/<Name>.tsx`.

## State

- State is NOT owned by the feature. Slices live in `src/stores/slices/<name>Slice.ts`; one slice per state concern.
- Components never read a slice or call `useAppSelector`/`useAppDispatch` directly — **always go through a hook**.
- That access hook is a shared hook in `src/hooks/use<Name>.ts` (it returns derived state + bound action dispatchers). No `hooks/` folder inside a feature folder.

## Shared domain

When logic/data is shared across features, put it in its shared home, not the feature:

- Types → `src/types/<name>.ts`
- Pure helpers (no React/Redux) → `src/lib/<name>.ts`
- Static catalogs / enums → `src/constants/<name>.ts` (`.tsx` only if it holds component/icon refs)
- Validation → `src/schemas/<domain>.ts`

## Reference: Tool Builder

Orchestrator feature `ToolBuilder/` composes one feature per panel (`Topbar`,
`ToolsPanel`, `BuilderPanel`, `NodeCard`, `NodeEditor`, `PalettePanel`,
`PreviewPane`). Shared domain lives at `@/stores/slices/toolBuilderSlice`,
`@/hooks/useToolBuilder`, `@/types/tool-builder`, `@/constants/tool-builder`,
`@/lib/tool-builder-runtime`.
