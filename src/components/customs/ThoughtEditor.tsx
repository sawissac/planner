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
import { forwardRef, useEffect, useState } from "react";

import { EmojiPicker } from "@/components/customs/EmojiPicker";

function InsertEmojiButton() {
  const insertMarkdown = usePublisher(insertMarkdown$);
  const activeEditor = useCellValue(activeEditor$);
  const [container, setContainer] = useState<HTMLElement | null>(null);

  useEffect(() => {
    setContainer(document.querySelector<HTMLElement>('[data-slot="drawer-content"]'));
  }, []);

  return (
    <EmojiPicker
      container={container}
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
          className="inline-flex items-center justify-center rounded p-1 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
        >
          <Smile className="size-4" />
        </button>
      }
    />
  );
}

type Props = {
  markdown: string;
  onChange: (md: string) => void;
};

export const ThoughtEditor = forwardRef<MDXEditorMethods, Props>(function ThoughtEditor(
  { markdown, onChange },
  ref,
) {
  return (
    <MDXEditor
      ref={ref}
      markdown={markdown}
      onChange={onChange}
      contentEditableClassName="min-h-80 outline-none px-3 py-2"
      plugins={[
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
        diffSourcePlugin({ viewMode: "rich-text", diffMarkdown: markdown }),
        markdownShortcutPlugin(),
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
      ]}
    />
  );
});
