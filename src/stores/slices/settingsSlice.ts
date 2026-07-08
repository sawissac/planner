import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

export const FONTS = ["roboto", "poppins", "caveat"] as const;
export type FontKey = (typeof FONTS)[number];

export const FONT_LABEL: Record<FontKey, string> = {
  roboto: "Roboto",
  poppins: "Poppins",
  caveat: "Caveat",
};

export const FONT_VAR: Record<FontKey, string> = {
  roboto: "var(--font-roboto)",
  poppins: "var(--font-poppins)",
  caveat: "var(--font-caveat)",
};

export const FONT_SIZES = [12, 14, 16, 18, 20, 24, 28, 32] as const;
export type FontSize = (typeof FONT_SIZES)[number];

export const FONT_WEIGHTS = [300, 400, 500, 600, 700] as const;
export type FontWeight = (typeof FONT_WEIGHTS)[number];

export const FONT_WEIGHT_LABEL: Record<FontWeight, string> = {
  300: "Light",
  400: "Regular",
  500: "Medium",
  600: "Semibold",
  700: "Bold",
};

export const DEFAULT_PRIORITY_OPTIONS = [
  "high",
  "highest",
  "critical",
  "must",
  "deferred",
] as const;

export const DEFAULT_PROGRESS_OPTIONS = ["Not Started", "InProgress", "Done"] as const;

export type TableSort = { id: string; desc: boolean };

export type SettingsState = {
  tableFont: FontKey;
  titleFontSize: FontSize;
  titleFontWeight: FontWeight;
  sidebarWidth: number;
  sidebarOpen: boolean;
  cloudAutoSync: boolean;
  columnSizing: Record<string, number>;
  userColumnSizing: Record<string, number>;
  priorityOptions: string[];
  progressOptions: string[];
  focusMode: boolean;
  darkMode: boolean;
  pageSize: number;
  sorting: TableSort[];
  globalFilter: string;
  groupFilter: string | null;
  priorityFilter: string | null;
  progressFilter: string | null;
  accentColor: string | null;
  activeTab: string;
  boardCompact: boolean;
};

const initialState: SettingsState = {
  tableFont: "roboto",
  titleFontSize: 14,
  titleFontWeight: 400,
  sidebarWidth: 320,
  sidebarOpen: true,
  cloudAutoSync: true,
  columnSizing: {},
  userColumnSizing: {},
  priorityOptions: [...DEFAULT_PRIORITY_OPTIONS],
  progressOptions: [...DEFAULT_PROGRESS_OPTIONS],
  focusMode: false,
  darkMode: false,
  pageSize: 30,
  sorting: [],
  globalFilter: "",
  groupFilter: null,
  priorityFilter: null,
  progressFilter: null,
  accentColor: null,
  activeTab: "todo",
  boardCompact: false,
};

const settingsSlice = createSlice({
  name: "settings",
  initialState,
  reducers: {
    setFont(state, action: PayloadAction<FontKey>) {
      state.tableFont = action.payload;
    },
    setFontSize(state, action: PayloadAction<FontSize>) {
      state.titleFontSize = action.payload;
    },
    setFontWeight(state, action: PayloadAction<FontWeight>) {
      state.titleFontWeight = action.payload;
    },
    setSidebarWidth(state, action: PayloadAction<number>) {
      state.sidebarWidth = Math.max(200, Math.min(640, action.payload));
    },
    setSidebarOpen(state, action: PayloadAction<boolean>) {
      state.sidebarOpen = action.payload;
    },
    setCloudAutoSync(state, action: PayloadAction<boolean>) {
      state.cloudAutoSync = action.payload;
    },
    setColumnSizing(state, action: PayloadAction<Record<string, number>>) {
      state.columnSizing = action.payload;
    },
    setUserColumnSizing(state, action: PayloadAction<Record<string, number>>) {
      state.userColumnSizing = action.payload;
    },
    addPriorityOption(state, action: PayloadAction<string>) {
      const v = action.payload.trim();
      if (!v) {
        return;
      }
      if (!state.priorityOptions.some((p) => p.toLowerCase() === v.toLowerCase())) {
        state.priorityOptions.push(v);
      }
    },
    removePriorityOption(state, action: PayloadAction<string>) {
      if ((DEFAULT_PRIORITY_OPTIONS as readonly string[]).includes(action.payload)) {
        return;
      }
      state.priorityOptions = state.priorityOptions.filter((p) => p !== action.payload);
    },
    renamePriorityOption(state, action: PayloadAction<{ from: string; to: string }>) {
      const { from, to } = action.payload;
      const next = to.trim();
      if (!next || from === next) {
        return;
      }
      if ((DEFAULT_PRIORITY_OPTIONS as readonly string[]).includes(from)) {
        return;
      }
      if (state.priorityOptions.some((p) => p.toLowerCase() === next.toLowerCase() && p !== from)) {
        return;
      }
      state.priorityOptions = state.priorityOptions.map((p) => (p === from ? next : p));
      if (state.priorityFilter === from) {
        state.priorityFilter = next;
      }
    },
    addProgressOption(state, action: PayloadAction<string>) {
      const v = action.payload.trim();
      if (!v) {
        return;
      }
      if (!state.progressOptions.some((p) => p.toLowerCase() === v.toLowerCase())) {
        state.progressOptions.push(v);
      }
    },
    removeProgressOption(state, action: PayloadAction<string>) {
      if ((DEFAULT_PROGRESS_OPTIONS as readonly string[]).includes(action.payload)) {
        return;
      }
      state.progressOptions = state.progressOptions.filter((p) => p !== action.payload);
    },
    reorderProgressOption(state, action: PayloadAction<{ from: string; to: string }>) {
      const { from, to } = action.payload;
      if (from === to) {
        return;
      }
      const fromIdx = state.progressOptions.indexOf(from);
      const toIdx = state.progressOptions.indexOf(to);
      if (fromIdx === -1 || toIdx === -1) {
        return;
      }
      const [moved] = state.progressOptions.splice(fromIdx, 1);
      state.progressOptions.splice(toIdx, 0, moved);
    },
    renameProgressOption(state, action: PayloadAction<{ from: string; to: string }>) {
      const { from, to } = action.payload;
      const next = to.trim();
      if (!next || from === next) {
        return;
      }
      if ((DEFAULT_PROGRESS_OPTIONS as readonly string[]).includes(from)) {
        return;
      }
      if (state.progressOptions.some((p) => p.toLowerCase() === next.toLowerCase() && p !== from)) {
        return;
      }
      state.progressOptions = state.progressOptions.map((p) => (p === from ? next : p));
      if (state.progressFilter === from) {
        state.progressFilter = next;
      }
    },
    setFocusMode(state, action: PayloadAction<boolean>) {
      state.focusMode = action.payload;
    },
    setDarkMode(state, action: PayloadAction<boolean>) {
      state.darkMode = action.payload;
    },
    setPageSize(state, action: PayloadAction<number>) {
      state.pageSize = action.payload;
    },
    setSorting(state, action: PayloadAction<TableSort[]>) {
      state.sorting = action.payload;
    },
    setGlobalFilter(state, action: PayloadAction<string>) {
      state.globalFilter = action.payload;
    },
    setGroupFilter(state, action: PayloadAction<string | null>) {
      state.groupFilter = action.payload;
    },
    setPriorityFilter(state, action: PayloadAction<string | null>) {
      state.priorityFilter = action.payload;
    },
    setProgressFilter(state, action: PayloadAction<string | null>) {
      state.progressFilter = action.payload;
    },
    setAccentColor(state, action: PayloadAction<string | null>) {
      state.accentColor = action.payload;
    },
    setActiveTab(state, action: PayloadAction<string>) {
      state.activeTab = action.payload;
    },
    setBoardCompact(state, action: PayloadAction<boolean>) {
      state.boardCompact = action.payload;
    },
    replaceSettings(state, action: PayloadAction<SettingsState>) {
      state.tableFont = action.payload.tableFont;
      state.titleFontSize = action.payload.titleFontSize;
      state.titleFontWeight = action.payload.titleFontWeight;
      state.sidebarWidth = action.payload.sidebarWidth;
      state.sidebarOpen = action.payload.sidebarOpen ?? true;
      state.cloudAutoSync = action.payload.cloudAutoSync ?? true;
      state.columnSizing = action.payload.columnSizing;
      state.userColumnSizing = action.payload.userColumnSizing ?? {};
      state.priorityOptions = action.payload.priorityOptions;
      state.progressOptions = action.payload.progressOptions ?? [...DEFAULT_PROGRESS_OPTIONS];
      state.focusMode = action.payload.focusMode ?? false;
      state.darkMode = action.payload.darkMode ?? false;
      state.pageSize = action.payload.pageSize ?? 30;
      state.sorting = action.payload.sorting ?? [];
      state.globalFilter = action.payload.globalFilter ?? "";
      state.groupFilter = action.payload.groupFilter ?? null;
      state.priorityFilter = action.payload.priorityFilter ?? null;
      state.progressFilter = action.payload.progressFilter ?? null;
      state.accentColor = action.payload.accentColor ?? null;
      state.activeTab = action.payload.activeTab ?? "todo";
      state.boardCompact = action.payload.boardCompact ?? false;
    },
  },
});

export const {
  setFont,
  setFontSize,
  setFontWeight,
  setSidebarWidth,
  setSidebarOpen,
  setCloudAutoSync,
  setColumnSizing,
  setUserColumnSizing,
  addPriorityOption,
  removePriorityOption,
  renamePriorityOption,
  addProgressOption,
  removeProgressOption,
  renameProgressOption,
  reorderProgressOption,
  setFocusMode,
  setDarkMode,
  setPageSize,
  setSorting,
  setGlobalFilter,
  setGroupFilter,
  setPriorityFilter,
  setProgressFilter,
  setAccentColor,
  setActiveTab,
  setBoardCompact,
  replaceSettings,
} = settingsSlice.actions;
export default settingsSlice.reducer;
