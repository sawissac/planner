"use client";

import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import * as React from "react";
import { DayPicker, getDefaultClassNames } from "react-day-picker";

import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/cn";

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

/**
 * Which fields the calendar shows: the month grid, a time field, or both.
 *
 * `"datetime"` stacks the time field under the grid; `"time"` drops the grid
 * entirely, so every `DayPicker` prop is ignored in that mode.
 */
export type CalendarGranularity = "date" | "time" | "datetime";

/**
 * Reads a `Date`'s wall-clock time as the `"HH:mm"` string the time field
 * speaks — 24-hour, zero-padded, in the runtime's local zone. `undefined`
 * becomes `""`, which is an empty field rather than an uncontrolled one.
 *
 * @param date - The date to read, or `undefined` for none selected.
 * @param seconds - Append `:ss`, for a calendar with `timeStep={1}`.
 *
 * @example
 * ```tsx
 * <Calendar granularity="datetime" time={getCalendarTime(when)} … />
 * ```
 */
function getCalendarTime(date: Date | undefined, seconds = false): string {
  if (!date) {
    return "";
  }
  const pad = (n: number) => String(n).padStart(2, "0");
  const hm = `${pad(date.getHours())}:${pad(date.getMinutes())}`;
  return seconds ? `${hm}:${pad(date.getSeconds())}` : hm;
}

/**
 * Writes a `"HH:mm"` or `"HH:mm:ss"` string onto a copy of `date`, leaving the
 * calendar day untouched. The inverse of {@link getCalendarTime}, and the other
 * half of wiring `granularity="datetime"` to one `Date` in state.
 *
 * Returns the date unchanged when `time` is empty (the field was cleared) and
 * `undefined` when there is no date yet — a time with no day is not a moment,
 * so pick the day first.
 *
 * @param date - The date whose day part to keep.
 * @param time - Time from the field, e.g. `"09:30"`.
 *
 * @example
 * ```tsx
 * onTimeChange={(t) => setWhen(setCalendarTime(when, t))}
 * ```
 */
function setCalendarTime(
  date: Date | undefined,
  time: string,
): Date | undefined {
  if (!date || !time) {
    return date;
  }
  const [hours, minutes, seconds] = time.split(":").map(Number);
  const next = new Date(date);
  next.setHours(hours ?? 0, minutes ?? 0, seconds ?? 0, 0);
  return next;
}

function toMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return (hours || 0) * 60 + (minutes || 0);
}

function fromMinutes(total: number): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(Math.floor(total / 60) % 24)}:${pad(total % 60)}`;
}

/**
 * Every `"HH:mm"` from `start` to `end` inclusive, `step` minutes apart.
 * Internal: a caller who wants an irregular list passes `timeSlots` instead.
 */
function buildTimeSlots(start: string, end: string, step: number): string[] {
  const last = toMinutes(end);
  const stride = Math.max(1, Math.round(step));
  const slots: string[] = [];
  for (let minute = toMinutes(start); minute <= last; minute += stride) {
    slots.push(fromMinutes(minute));
  }
  return slots;
}

/**
 * Month-grid calendar over `react-day-picker`, restyled for the flat design
 * system: `app-*` tokens only, no shadows, the selected day a solid accent
 * block, today a hairline ring, hover a tint.
 *
 * Every `DayPicker` prop passes through (`mode`, `selected`, `onSelect`,
 * `captionLayout`, `disabled`, …), and `className` / `classNames` merge on top
 * of the defaults so a caller can tweak one slot without redeclaring the rest.
 *
 * `granularity` picks which fields it shows: `"date"` (the default, grid
 * only), `"time"` (a lone time field, no grid — every `DayPicker` prop is
 * ignored) or `"datetime"` (both, the field on a hairline under the grid).
 *
 * Time is a `"HH:mm"` string rather than part of `selected`, because
 * `DayPicker` types `selected`/`onSelect` as a closed union keyed on `mode` —
 * a `Date` there would mean one thing under `mode="single"` and nothing under
 * `mode="range"`. {@link getCalendarTime} and {@link setCalendarTime} bridge
 * the two, so a datetime calendar still drives one `Date` in state.
 *
 * Run `onSelect` through {@link setCalendarTime} as well, as the example below
 * does. `DayPicker` hands back midnight on the day that was clicked — it deals
 * in days, not moments — so a bare `onSelect={setWhen}` silently resets the
 * time to `00:00` every time someone picks a different day.
 *
 * Time is picked from a column of slots beside the grid, not typed into a
 * field: a scrollable list of rows, one per `timeStep` minutes from `timeStart`
 * to `timeEnd`, the chosen one a solid accent block like the chosen day. A list
 * is what makes the common case — "half past nine, like every other booking" —
 * one click, and it is the only form that can show which times are unavailable,
 * which `timeDisabled` greys out in place. Pass `timeSlots` for a list that is
 * not a regular interval.
 *
 * Rows are labelled through the calendar's own `locale`, so the list reads
 * `9:30 AM` under `en-US` and `09:30` under `de-DE` without a `hour12` prop to
 * get wrong. A row is one `--cell-size` tall and a week-gap from the next, the
 * grid's own module, so the two halves keep one rhythm rather than the column
 * running dense beside it.
 *
 * The panel stands one six-week month tall. The grid is fixed to six weeks
 * whenever a column is beside it, so paging from a five-week month to a
 * six-week one no longer resizes the whole panel, and a lone column comes out
 * the same height as a calendar sitting next to it. Both read that height from
 * `--calendar-grid-height`, which `className` can override.
 *
 * Below the `sm` breakpoint the column moves under the grid, four rows tall,
 * with the hairline on top instead of the side — a grid plus a column is
 * wider than a phone in portrait. Above it the two sit side by side as
 * described. The panel never exceeds its container (`max-w-full`), so it is
 * safe inside a full-width sheet or a popover pinned to a viewport edge.
 *
 * The column brings the selected row into view when it is off
 * screen — on mount, so it does not open at midnight, and after a change from
 * outside — but leaves a row that is already visible where it is.
 *
 * A `time` that is not one of the slots leaves the column with nothing
 * selected — worth knowing, because `getCalendarTime(new Date())` is almost
 * never on a boundary. Seed state with a slot value, or widen `timeSlots`.
 *
 * The rows are a labelled group of `aria-pressed` buttons, the same shape as
 * {@link OptionList}'s, rather than a `listbox` of `option`s: a listbox
 * promises arrow-key roving and `aria-activedescendant`, and announcing that
 * contract without implementing it is worse for a screen reader than plain
 * toggles that tab like everything else on the panel.
 *
 * `react-day-picker` is an optional peer dependency — installing it is only
 * required if you import this module.
 *
 * Test ids derive from a `data-testid` on the calendar: each day becomes
 * `${testId}-day-<yyyy-mm-dd>` (ISO, so a test never has to guess the runtime
 * locale's date format), the arrows `${testId}-prev-button` /
 * `${testId}-next-button`, and each time slot `${testId}-time-<HH:mm>` (the
 * 24-hour value, not the localized label a test would have to guess). The base
 * itself lands on whatever the outermost element is — the grid under
 * `"date"`, the panel wrapping both under the other two.
 *
 * @param props.granularity - `"date"` (default), `"time"` or `"datetime"`.
 * @param props.time - Controlled selection, `"HH:mm"`. `""` for none.
 * @param props.defaultTime - Starting selection for the uncontrolled form.
 * @param props.onTimeChange - Called with the row's `"HH:mm"` value when it is
 *   clicked.
 * @param props.timeStep - Minutes between generated slots. Default `30`.
 * @param props.timeStart - First generated slot. Default `"00:00"`.
 * @param props.timeEnd - Last generated slot, inclusive. Default `"23:30"`.
 * @param props.timeSlots - Explicit `"HH:mm"` list, for an irregular set of
 *   times. Replaces the generated one.
 * @param props.timeDisabled - Per-slot predicate. A `true` greys the row out
 *   and makes it unclickable, for a time that is taken or out of hours.
 * @param props.formatTime - Row label from a `"HH:mm"` value. Defaults to the
 *   calendar `locale`'s own hour/minute format.
 * @param props.timeLabel - Accessible name for the column, since its rows are
 *   the only thing in it. Supply a translated string; defaults to `"Time"`.
 * @param props.showOutsideDays - Render the leading/trailing days of the
 *   neighbouring months (default `true`).
 * @param props.captionLayout - Month caption: `label` (default) or one of the
 *   `dropdown` variants for month/year selects.
 * @param props.buttonVariant - `Button` variant for the prev/next arrows
 *   (default `ghost`).
 * @param props.locale - `react-day-picker` locale. Also drives the month
 *   dropdown's own labels, so a localized calendar does not end up with
 *   English month abbreviations in its caption.
 * @param props.className - Extra classes merged onto the outermost element.
 *
 * @example
 * ```tsx
 * <Calendar mode="single" selected={date} onSelect={setDate} />
 * ```
 *
 * @example
 * ```tsx
 * const [when, setWhen] = React.useState<Date>();
 *
 * <Calendar
 *   granularity="datetime"
 *   mode="single"
 *   selected={when}
 *   onSelect={(day) => setWhen(setCalendarTime(day, getCalendarTime(when)))}
 *   time={getCalendarTime(when)}
 *   onTimeChange={(next) => setWhen(setCalendarTime(when, next))}
 *   timeStart="08:00"
 *   timeEnd="18:00"
 *   timeDisabled={(slot) => booked.includes(slot)}
 *   timeLabel={t("schedule.time")}
 * />
 * ```
 */
function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  captionLayout = "label",
  buttonVariant = "ghost",
  formatters,
  components,
  locale,
  granularity = "date",
  fixedWeeks,
  time,
  defaultTime = "",
  onTimeChange,
  timeStep = 30,
  timeStart = "00:00",
  timeEnd = "23:30",
  timeSlots,
  timeDisabled,
  formatTime = (slot) => {
    const [hours, minutes] = slot.split(":").map(Number);
    return new Date(2000, 0, 1, hours || 0, minutes || 0).toLocaleTimeString(
      locale?.code,
      { hour: "numeric", minute: "2-digit" },
    );
  },
  timeLabel = "Time",
  "data-testid": testId,
  ...props
}: CalendarProps & {
  buttonVariant?: React.ComponentProps<typeof Button>["variant"];
  granularity?: CalendarGranularity;
  time?: string;
  defaultTime?: string;
  onTimeChange?: (time: string) => void;
  timeStep?: number;
  timeStart?: string;
  timeEnd?: string;
  timeSlots?: string[];
  timeDisabled?: (time: string) => boolean;
  formatTime?: (time: string) => string;
  timeLabel?: string;
  /**
   * Base for derived test ids. `DayPicker`'s own props type is a closed union
   * that does not admit arbitrary `data-*`, so this is declared explicitly
   * rather than read off the rest props.
   */
  "data-testid"?: string;
}) {
  const defaultClassNames = getDefaultClassNames();

  const showGrid = granularity !== "time";
  const showTime = granularity !== "date";

  // Uncontrolled unless `time` is given, like the day selection above it.
  const [ownTime, setOwnTime] = React.useState(defaultTime);
  const selectedTime = time ?? ownTime;

  const slots = React.useMemo(
    () => timeSlots ?? buildTimeSlots(timeStart, timeEnd, timeStep),
    [timeSlots, timeStart, timeEnd, timeStep],
  );

  // Bring the selection into view by setting scrollTop rather than calling
  // scrollIntoView, which would also scroll every ancestor — including the
  // page behind an open popover.
  const listRef = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    const list = listRef.current;
    if (!showTime || !list) {
      return;
    }
    // A frame late on purpose. The scroller is absolutely positioned inside a
    // frame that stretches to the grid, so on the effect's first pass its
    // clientHeight can still be the pre-layout value and the centring maths
    // lands hundreds of pixels off.
    const frame = requestAnimationFrame(() => {
      const active = list.querySelector<HTMLElement>("[data-active]");
      if (!active) {
        return;
      }
      const top = active.offsetTop;
      const onScreen =
        top >= list.scrollTop &&
        top + active.offsetHeight <= list.scrollTop + list.clientHeight;
      // Leave a visible selection where it is: re-centring on every click
      // would yank the list out from under the pointer.
      if (!onScreen) {
        list.scrollTop = top - list.clientHeight / 2 + active.offsetHeight / 2;
      }
    });
    return () => cancelAnimationFrame(frame);
    // Only when the selection itself changes — not on every scroll afterwards.
  }, [showTime, selectedTime]);

  // Wrapped, the panel is the outermost element, so it takes the caller's
  // className and test id and the grid keeps only its own defaults.
  const grid = showGrid ? (
    <DayPicker
      showOutsideDays={showOutsideDays}
      // Beside a time column the month must not change height as you page
      // through it: a five-week month and a six-week one would resize the
      // whole panel, and the column with it.
      fixedWeeks={fixedWeeks ?? showTime}
      locale={locale}
      className={cn(
        "group/calendar p-2 text-app-text [--cell-size:--spacing(8)]",
        // The panel owns the surface when there is one. An opaque background
        // here as well would paint a square over its rounded corners.
        showTime ? undefined : "bg-app-panel",
        "[[data-slot=popover-content]_&]:bg-transparent",
        showTime ? undefined : className,
      )}
      captionLayout={captionLayout}
      formatters={{
        // Follow the caller's locale rather than the runtime default, so a
        // localized calendar doesn't caption itself in English.
        formatMonthDropdown: (date) =>
          date.toLocaleString(locale?.code, { month: "short" }),
        ...formatters,
      }}
      classNames={{
        root: cn("w-fit", defaultClassNames.root),
        months: cn(
          "relative flex flex-col gap-4 md:flex-row",
          defaultClassNames.months,
        ),
        month: cn("flex w-full flex-col gap-3", defaultClassNames.month),
        nav: cn(
          "absolute inset-x-0 top-0 flex w-full items-center justify-between gap-1",
          defaultClassNames.nav,
        ),
        button_previous: cn(
          buttonVariants({ variant: buttonVariant, size: "icon-sm" }),
          "size-(--cell-size) p-0 text-app-dim aria-disabled:opacity-50",
          defaultClassNames.button_previous,
        ),
        button_next: cn(
          buttonVariants({ variant: buttonVariant, size: "icon-sm" }),
          "size-(--cell-size) p-0 text-app-dim aria-disabled:opacity-50",
          defaultClassNames.button_next,
        ),
        month_caption: cn(
          "flex h-(--cell-size) w-full items-center justify-center px-(--cell-size)",
          defaultClassNames.month_caption,
        ),
        dropdowns: cn(
          "flex h-(--cell-size) w-full items-center justify-center gap-1.5 font-title text-[12px] font-semibold",
          defaultClassNames.dropdowns,
        ),
        dropdown_root: cn(
          "relative rounded-md border border-app-border-mid has-focus:border-app-accent has-focus:ring-2 has-focus:ring-app-accent/30",
          defaultClassNames.dropdown_root,
        ),
        dropdown: cn(
          "absolute inset-0 bg-app-panel opacity-0",
          defaultClassNames.dropdown,
        ),
        caption_label: cn(
          "font-title text-[12px] font-semibold text-app-bright select-none",
          captionLayout === "label"
            ? ""
            : "flex h-7 items-center gap-1 rounded-md pr-1 pl-2 [&>svg]:size-3.5 [&>svg]:text-app-dim",
          defaultClassNames.caption_label,
        ),
        month_grid: cn("w-full border-collapse", defaultClassNames.month_grid),
        weekdays: cn("flex", defaultClassNames.weekdays),
        weekday: cn(
          "flex h-4 flex-1 items-center justify-center rounded-md font-title text-[10px] font-semibold tracking-[0.08em] text-app-dim uppercase select-none",
          defaultClassNames.weekday,
        ),
        week: cn("mt-1 flex w-full", defaultClassNames.week),
        week_number_header: cn(
          "w-(--cell-size) select-none",
          defaultClassNames.week_number_header,
        ),
        week_number: cn(
          "font-mono text-[10px] text-app-dim select-none",
          defaultClassNames.week_number,
        ),
        day: cn(
          "group/day relative aspect-square h-full w-full p-0 text-center select-none",
          defaultClassNames.day,
        ),
        today: cn("", defaultClassNames.today),
        outside: cn(
          "text-app-dim aria-selected:text-app-dim",
          defaultClassNames.outside,
        ),
        disabled: cn("text-app-dim opacity-40", defaultClassNames.disabled),
        hidden: cn("invisible", defaultClassNames.hidden),
        ...classNames,
      }}
      components={{
        Root: ({ className, rootRef, ...rootProps }) => (
          <div
            data-slot="calendar"
            data-testid={showTime ? undefined : testId}
            ref={rootRef}
            className={cn(className)}
            {...rootProps}
          />
        ),
        Chevron: ({ className, orientation, ...chevronProps }) => {
          if (orientation === "left") {
            return (
              <ChevronLeft
                className={cn("size-4", className)}
                {...chevronProps}
              />
            );
          }
          if (orientation === "right") {
            return (
              <ChevronRight
                className={cn("size-4", className)}
                {...chevronProps}
              />
            );
          }
          return (
            <ChevronDown
              className={cn("size-4", className)}
              {...chevronProps}
            />
          );
        },
        PreviousMonthButton: (navProps) => (
          <button
            data-slot="calendar-prev-button"
            data-testid={testId ? `${testId}-prev-button` : undefined}
            {...navProps}
          />
        ),
        NextMonthButton: (navProps) => (
          <button
            data-slot="calendar-next-button"
            data-testid={testId ? `${testId}-next-button` : undefined}
            {...navProps}
          />
        ),
        DayButton: (dayProps) => (
          <CalendarDayButton testIdBase={testId} {...dayProps} />
        ),
        WeekNumber: ({ children, ...weekProps }) => (
          <td {...weekProps}>
            <div className="flex size-(--cell-size) items-center justify-center text-center">
              {children}
            </div>
          </td>
        ),
        ...components,
      }}
      {...props}
    />
  ) : null;

  if (!showTime) {
    return grid;
  }

  return (
    <div
      data-slot="calendar-panel"
      data-testid={testId}
      className={cn(
        // overflow-hidden so a caller's radius actually clips what is inside
        // it — the grid, the column's scrollbar and a row's hover tint all run
        // to the panel's edge.
        // Stacked below `sm`, side by side above it: a grid plus a column is
        // wider than a phone in portrait, and a column under the grid is the
        // same reach for a thumb as beside it is for a pointer.
        "flex w-fit max-w-full flex-col items-stretch overflow-hidden bg-app-panel text-app-text sm:flex-row",
        // Same module as the day cells, so the slot rows keep the grid's
        // rhythm instead of running at a denser pitch beside it.
        "[--cell-size:--spacing(8)]",
        // What a six-week month measures, in the tokens that build it: the
        // panel's own padding, the caption, the gap under it, the weekday row
        // and six weeks of cell-plus-gap. A lone column stands at exactly that
        // height, so a time picker and a date picker side by side agree.
        "[--calendar-grid-height:calc(var(--cell-size)*7+--spacing(17))]",
        // Four rows of slots when the column sits under the grid: enough to
        // read as a list, not so many that the panel outgrows a phone screen.
        "[--calendar-time-stacked-height:calc(var(--cell-size)*4+--spacing(7))]",
        "[[data-slot=popover-content]_&]:bg-transparent",
        className,
      )}
    >
      {grid}
      <div
        data-slot="calendar-time"
        className={cn(
          // The frame stretches to the panel and holds no height of its own,
          // so a hundred slots cannot stretch it; the scroller fills it
          // absolutely and scrolls inside.
          "relative shrink-0 self-stretch",
          // Under the grid the frame spans the panel and takes a fixed height
          // of its own; beside it, it goes back to a fixed width and lets
          // stretch supply the height. The hairline moves with it.
          //
          // Alone, the frame is what gives the panel its height — it carries
          // that rather than the panel, whose border-box would swallow
          // whatever border the caller put on it and come up short by exactly
          // that much.
          showGrid
            ? "h-(--calendar-time-stacked-height) border-t border-app-border sm:h-auto sm:w-32 sm:border-t-0 sm:border-l"
            : "h-(--calendar-grid-height) w-32",
        )}
      >
        <div
          ref={listRef}
          role="group"
          aria-label={timeLabel}
          className="absolute inset-0 flex flex-col gap-1 overflow-y-auto p-2"
        >
          {slots.map((slot) => {
            const active = slot === selectedTime;
            return (
              <button
                key={slot}
                type="button"
                data-slot="calendar-time-option"
                data-testid={testId ? `${testId}-time-${slot}` : undefined}
                aria-pressed={active}
                data-active={active || undefined}
                disabled={timeDisabled?.(slot)}
                onClick={() => {
                  setOwnTime(slot);
                  onTimeChange?.(slot);
                }}
                className={cn(
                  "flex h-(--cell-size) shrink-0 items-center rounded-md px-2.5 text-[12px] text-app-text",
                  "transition-colors duration-(--motion-duration-fast) hover:bg-app-hover hover:text-app-bright",
                  "focus-visible:ring-2 focus-visible:ring-app-accent/40 focus-visible:outline-none",
                  "disabled:pointer-events-none disabled:text-app-dim disabled:opacity-40",
                  "data-active:bg-app-accent data-active:font-semibold data-active:text-app-on-solid",
                )}
              >
                {formatTime(slot)}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/**
 * One day cell. Flat states: selected is a solid accent block, today a hairline
 * accent ring, hover a tint. Focus follows the grid's keyboard cursor.
 *
 * @param props.testIdBase - When set, the cell gets
 *   `${testIdBase}-day-<yyyy-mm-dd>`. {@link Calendar} supplies it from its own
 *   `data-testid`; there is no reason to pass it by hand.
 */
function CalendarDayButton({
  className,
  day,
  modifiers,
  testIdBase,
  ...props
}: React.ComponentProps<typeof import("react-day-picker").DayButton> & {
  testIdBase?: string;
}) {
  const defaultClassNames = getDefaultClassNames();

  const ref = React.useRef<HTMLButtonElement>(null);
  React.useEffect(() => {
    if (modifiers.focused) {
      ref.current?.focus();
    }
  }, [modifiers.focused]);

  // Local ISO date, not toISOString() — the latter converts to UTC and would
  // label the cell with the previous day for anyone east of Greenwich.
  const iso = `${day.date.getFullYear()}-${String(day.date.getMonth() + 1).padStart(2, "0")}-${String(day.date.getDate()).padStart(2, "0")}`;

  return (
    <Button
      ref={ref}
      variant="ghost"
      size="icon-sm"
      data-slot="calendar-day"
      data-testid={testIdBase ? `${testIdBase}-day-${iso}` : undefined}
      data-day={day.date.toLocaleDateString()}
      data-selected-single={
        modifiers.selected &&
        !modifiers.range_start &&
        !modifiers.range_end &&
        !modifiers.range_middle
      }
      data-range-start={modifiers.range_start}
      data-range-end={modifiers.range_end}
      data-range-middle={modifiers.range_middle}
      className={cn(
        "flex aspect-square size-auto w-full min-w-(--cell-size) flex-col gap-1 rounded-md leading-none font-normal text-app-text",
        "transition-colors duration-(--motion-duration-fast) hover:bg-app-hover hover:text-app-bright",
        "data-[today=true]:ring-1 data-[today=true]:ring-app-border-accent",
        "data-[selected-single=true]:bg-app-accent data-[selected-single=true]:text-app-on-solid data-[selected-single=true]:hover:bg-app-accent",
        "data-[range-start=true]:rounded-r-none data-[range-start=true]:bg-app-accent data-[range-start=true]:text-app-on-solid",
        "data-[range-end=true]:rounded-l-none data-[range-end=true]:bg-app-accent data-[range-end=true]:text-app-on-solid",
        "data-[range-middle=true]:rounded-none data-[range-middle=true]:bg-app-accent-faint data-[range-middle=true]:text-app-bright",
        "group-data-[focused=true]/day:relative group-data-[focused=true]/day:z-10 group-data-[focused=true]/day:ring-2 group-data-[focused=true]/day:ring-app-accent/40",
        "[&>span]:text-[10px] [&>span]:opacity-70",
        defaultClassNames.day,
        className,
      )}
      data-today={modifiers.today || undefined}
      {...props}
    />
  );
}

export { Calendar, CalendarDayButton, getCalendarTime, setCalendarTime };
