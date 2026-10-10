"use client";

import {
  activeEditor$,
  AdmonitionDirectiveDescriptor,
  BlockTypeSelect,
  BoldItalicUnderlineToggles,
  ChangeCodeMirrorLanguage,
  codeBlockPlugin,
  codeMirrorPlugin,
  CodeToggle,
  ConditionalContents,
  CreateLink,
  diffSourcePlugin,
  DiffSourceToggleWrapper,
  directivesPlugin,
  frontmatterPlugin,
  headingsPlugin,
  imagePlugin,
  InsertAdmonition,
  InsertCodeBlock,
  InsertFrontmatter,
  InsertImage,
  insertMarkdown$,
  InsertTable,
  InsertThematicBreak,
  linkDialogPlugin,
  linkPlugin,
  listsPlugin,
  ListsToggle,
  markdownShortcutPlugin,
  MDXEditor,
  type MDXEditorMethods,
  quotePlugin,
  Separator,
  StrikeThroughSupSubToggles,
  tablePlugin,
  thematicBreakPlugin,
  toolbarPlugin,
  UndoRedo,
  useCellValue,
  usePublisher,
} from "@mdxeditor/editor";
import { Smile } from "lucide-react";
import { forwardRef, memo, useCallback, useEffect, useMemo, useRef, useState } from "react";

import { EmojiPicker } from "@/components/customs/EmojiPicker";
import { selectionAiPlugin } from "@/components/customs/SelectionAiMenu";
import { cn } from "@/lib/cn";
import { trackEditor } from "@/lib/drafts";

function InsertEmojiButton() {
  const insertMarkdown = usePublisher(insertMarkdown$);
  const activeEditor = useCellValue(activeEditor$);
  return (
    <EmojiPicker
      onPick={(e) => {
        if (activeEditor) {
          activeEditor.focus(() => insertMarkdown(e), { defaultSelection: "rootEnd" });
        } else {
          insertMarkdown(e);
        }
      }}
      trigger={
        <button
          type="button"
          aria-label="Insert emoji"
          title="Insert emoji"
          className="inline-flex items-center justify-center rounded p-1 hover:bg-app-sidebar text-app-dim hover:text-app-bright transition-colors"
        >
          <Smile className="size-4" />
        </button>
      }
    />
  );
}

type Props = {
  markdown: string;
  onChange?: (md: string) => void;
  /** Render only, no toolbar — used to display posted comments. */
  readOnly?: boolean;
  /** Short content area for comments instead of the full-page thought. */
  compact?: boolean;
  /** Put the caret in the editor on mount (read on mount only). */
  autoFocus?: boolean;
};

/**
 * How long typing must pause before `onChange` reaches the caller. MDXEditor
 * reports every keystroke; handing each one to React state re-rendered the
 * whole host (the task table, the comment thread) per key, which is what made
 * typing feel heavy. Pending text is flushed early when the editor loses
 * focus, so clicking Save never misses the last keystrokes.
 */
const CHANGE_DEBOUNCE_MS = 200;

const ThoughtEditorImpl = forwardRef<MDXEditorMethods, Props>(function ThoughtEditor(
  { markdown, onChange, readOnly = false, compact = false, autoFocus = false },
  ref,
) {
  // MDXEditor only reads `markdown` on mount; pin it so the plugin list below
  // stays referentially stable across the caller's re-renders.
  const [initialMarkdown] = useState(markdown);
  const onChangeRef = useRef(onChange);
  const pendingRef = useRef<string | null>(null);
  const timerRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  const flush = useCallback(() => {
    window.clearTimeout(timerRef.current);
    const next = pendingRef.current;
    if (next !== null) {
      pendingRef.current = null;
      onChangeRef.current?.(next);
    }
  }, []);

  const handleChange = useCallback(
    (md: string, initialMarkdownNormalize: boolean) => {
      // Mount-time whitespace/bullet normalization is not a user edit.
      if (initialMarkdownNormalize) {
        return;
      }
      pendingRef.current = md;
      window.clearTimeout(timerRef.current);
      timerRef.current = window.setTimeout(flush, CHANGE_DEBOUNCE_MS);
    },
    [flush],
  );

  // MDXEditor's own `autoFocus` loses the race with the button that mounted
  // the editor, so focus the content area once Lexical has rendered it.
  const wrapperRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!autoFocus) {
      return;
    }
    let raf = 0;
    let tries = 0;
    const tick = () => {
      const el = wrapperRef.current?.querySelector<HTMLElement>("[contenteditable='true']");
      if (el) {
        el.focus();
      } else if (tries++ < 30) {
        raf = window.requestAnimationFrame(tick);
      }
    };
    raf = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(raf);
  }, [autoFocus]);

  // Unmounting drops a still-pending change: every host treats leaving the
  // editor without Save as discard.
  useEffect(() => () => window.clearTimeout(timerRef.current), []);

  // "Copy context" flushes the last keystrokes before saving drafts.
  const editable = !readOnly && !!onChange;
  useEffect(() => (editable ? trackEditor(flush) : undefined), [editable, flush]);

  const plugins = useMemo(
    () => [
      headingsPlugin(),
      listsPlugin(),
      quotePlugin(),
      thematicBreakPlugin(),
      linkPlugin(),
      linkDialogPlugin(),
      imagePlugin({
        allowSetImageDimensions: true,
        disableImageResize: false,
      }),
      tablePlugin(),
      frontmatterPlugin(),
      codeBlockPlugin({ defaultCodeBlockLanguage: "ts" }),
      codeMirrorPlugin({
        codeBlockLanguages: {
          ts: "TypeScript",
          tsx: "TSX",
          js: "JavaScript",
          jsx: "JSX",
          css: "CSS",
          html: "HTML",
          json: "JSON",
          md: "Markdown",
          bash: "Bash",
          sh: "Shell",
          py: "Python",
          go: "Go",
          rs: "Rust",
          sql: "SQL",
          yaml: "YAML",
          "": "Text",
        },
      }),
      directivesPlugin({
        directiveDescriptors: [AdmonitionDirectiveDescriptor],
      }),
      markdownShortcutPlugin(),
      ...(readOnly ? [] : editingPlugins(initialMarkdown)),
    ],
    [readOnly, initialMarkdown],
  );

  return (
    <div ref={wrapperRef} onBlur={flush} className="contents">
      <MDXEditor
        ref={ref}
        // Anchors the selection AI menu, which positions itself in here.
        className="relative"
        markdown={initialMarkdown}
        onChange={onChange ? handleChange : undefined}
        readOnly={readOnly}
        contentEditableClassName={cn(
          "outline-none px-3 py-2",
          readOnly ? "min-h-0" : compact ? "min-h-24" : "min-h-80",
        )}
        plugins={plugins}
      />
    </div>
  );
});

/**
 * Markdown editor for thoughts and comments.
 *
 * `markdown` is the initial value only (remount with a `key` to load new
 * content). `onChange` is debounced — see {@link CHANGE_DEBOUNCE_MS} — and
 * skips MDXEditor's mount-time normalization. Memoized on `readOnly` /
 * `compact` alone, so a host re-rendering while the user types never
 * re-renders the editor.
 */
export const ThoughtEditor = memo(
  ThoughtEditorImpl,
  (prev, next) => prev.readOnly === next.readOnly && prev.compact === next.compact,
);

function editingPlugins(markdown: string) {
  return [
    selectionAiPlugin(),
    diffSourcePlugin({ viewMode: "rich-text", diffMarkdown: markdown }),
    toolbarPlugin({
      toolbarContents: () => (
        <DiffSourceToggleWrapper>
          <UndoRedo />
          <Separator />
          <BoldItalicUnderlineToggles />
          <CodeToggle />
          <Separator />
          <StrikeThroughSupSubToggles />
          <Separator />
          <ListsToggle />
          <Separator />
          <ConditionalContents
            options={[
              {
                when: (editor) => editor?.editorType === "codeblock",
                contents: () => <ChangeCodeMirrorLanguage />,
              },
              {
                fallback: () => (
                  <>
                    <InsertEmojiButton />
                    <BlockTypeSelect />
                    <CreateLink />
                    <InsertImage />
                    <Separator />
                    <InsertTable />
                    <InsertThematicBreak />
                    <Separator />
                    <InsertCodeBlock />
                    <InsertAdmonition />
                    <Separator />
                    <InsertFrontmatter />
                    <Separator />
                  </>
                ),
              },
            ]}
          />
        </DiffSourceToggleWrapper>
      ),
    }),
  ];
}
