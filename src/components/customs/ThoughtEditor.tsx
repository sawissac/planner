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
import { ImagePickerButton } from "@/components/customs/ImagePickerButton";
import { type ImagePreview, ImagePreviewDialog } from "@/components/customs/ImagePreviewDialog";
import { selectionAiPlugin } from "@/components/customs/SelectionAiMenu";
import { cn } from "@/lib/cn";
import { trackEditor } from "@/lib/drafts";
import {
  IMAGE_DRAG_TYPE,
  imageEmbed,
  requireImageServer,
  resolveImageSrc,
  uploadEmbeds,
  uploadForEditor,
} from "@/lib/image-server";

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

const IMAGE_SELECTOR = '[data-editor-block-type="image"]';
/** Longest line still read as an image caption (see the caption effect). */
const CAPTION_MAX = 80;

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
        // Image-server embeds load with the token from Settings.
        imagePreviewHandler: resolveImageSrc,
        // The image dialog's file upload goes to the image server.
        imageUploadHandler: uploadForEditor,
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

  // Images render as thumbnails; pressing one opens it full size. While
  // editing, a single click selects the image (resize, edit), so the preview
  // takes a double-click there.
  const [preview, setPreview] = useState<ImagePreview | null>(null);
  const openPreview = useCallback((e: React.MouseEvent) => {
    const img = (e.target as HTMLElement).closest<HTMLImageElement>(`${IMAGE_SELECTOR} img`);
    if (img) {
      e.preventDefault();
      const caption = img.closest<HTMLElement>("p[data-caption]")?.dataset.caption;
      setPreview({ src: img.currentSrc || img.src, alt: caption || img.alt || img.title });
    }
  }, []);

  // Editing: drop a gallery image, or image files from the OS, to embed them
  // (files upload to the image server first). The caret moves to the drop point.
  const editorRef = useRef<MDXEditorMethods | null>(null);
  const setEditorRef = useCallback(
    (m: MDXEditorMethods | null) => {
      editorRef.current = m;
      if (typeof ref === "function") {
        ref(m);
      } else if (ref) {
        ref.current = m;
      }
    },
    [ref],
  );
  const acceptsDrop = (e: React.DragEvent) =>
    e.dataTransfer.types.includes(IMAGE_DRAG_TYPE) || e.dataTransfer.types.includes("Files");
  const handleDrop = (e: React.DragEvent) => {
    if (!acceptsDrop(e)) {
      return;
    }
    e.preventDefault();
    e.stopPropagation();
    const { clientX: x, clientY: y } = e;
    const gallery = e.dataTransfer.getData(IMAGE_DRAG_TYPE);
    const files = Array.from(e.dataTransfer.files).filter((f) => f.type.startsWith("image/"));
    void (async () => {
      let embeds: string[] = [];
      if (gallery) {
        embeds = [imageEmbed(await requireImageServer(), JSON.parse(gallery))];
      } else if (files.length) {
        embeds = await uploadEmbeds(files);
      }
      const caret = document.caretRangeFromPoint?.(x, y);
      if (caret) {
        window
          .getSelection()
          ?.setBaseAndExtent(
            caret.startContainer,
            caret.startOffset,
            caret.startContainer,
            caret.startOffset,
          );
      }
      requestAnimationFrame(() => editorRef.current?.insertMarkdown(embeds.join("\n\n")));
    })().catch(() => {});
  };

  // Read-only: a short line right above an image (`**Hero**`, then the
  // image) is its caption. Fold it into the image's thumbnail cell so the
  // pictures still tile two to a row. Only attributes change — Lexical
  // watches the DOM tree, not attributes — and the CSS does the rest.
  useEffect(() => {
    const root = wrapperRef.current;
    if (!readOnly || !root) {
      return;
    }
    const apply = () => {
      for (const p of root.querySelectorAll<HTMLElement>("[contenteditable] > p")) {
        const next = p.nextElementSibling;
        const text = p.textContent?.trim() ?? "";
        const isCaption =
          !!text &&
          text.length <= CAPTION_MAX &&
          !p.querySelector(IMAGE_SELECTOR) &&
          next instanceof HTMLParagraphElement &&
          !!next.querySelector(IMAGE_SELECTOR) &&
          !next.querySelector("[data-lexical-text]");
        p.toggleAttribute("data-image-caption", isCaption);
        if (isCaption) {
          next.dataset.caption = text;
          // The CSS reads it as a string (`attr()` breaks the CSS pipeline).
          next.style.setProperty("--image-caption", JSON.stringify(text));
        } else if (
          !(p.previousElementSibling as HTMLElement | null)?.hasAttribute("data-image-caption")
        ) {
          delete p.dataset.caption;
          p.style.removeProperty("--image-caption");
        }
      }
    };
    apply();
    const observer = new MutationObserver(apply);
    observer.observe(root, { childList: true, subtree: true, characterData: true });
    return () => observer.disconnect();
  }, [readOnly]);

  return (
    <div
      ref={wrapperRef}
      onBlur={flush}
      onClick={readOnly ? openPreview : undefined}
      onDoubleClick={readOnly ? undefined : openPreview}
      onDragOver={readOnly ? undefined : (e) => acceptsDrop(e) && e.preventDefault()}
      onDropCapture={readOnly ? undefined : handleDrop}
      className="contents"
    >
      <MDXEditor
        ref={setEditorRef}
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
      <ImagePreviewDialog image={preview} onClose={() => setPreview(null)} />
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
                    <ImagePickerButton />
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
