"use client";

import { insertMarkdown$, usePublisher } from "@mdxeditor/editor";
import { Images } from "lucide-react";
import { useState } from "react";

import { ImageGrid } from "@/components/customs/ImageGrid";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

/**
 * Editor toolbar button: opens the image gallery; picking an image embeds it
 * at the cursor (agents then read it through the Plan API).
 */
export function ImagePickerButton() {
  const [open, setOpen] = useState(false);
  const insert = usePublisher(insertMarkdown$);
  return (
    <>
      <button
        type="button"
        title="Insert from gallery"
        aria-label="Insert image from gallery"
        data-testid="editor-image-gallery-button"
        onClick={() => setOpen(true)}
        className="inline-flex size-7 items-center justify-center rounded text-app-dim hover:bg-app-hover hover:text-app-bright"
      >
        <Images className="size-4" />
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent data-testid="image-picker-dialog" className="w-[min(440px,94vw)]">
          <DialogHeader>
            <DialogTitle>Image gallery</DialogTitle>
            <DialogDescription className="sr-only">Pick an image to insert</DialogDescription>
          </DialogHeader>
          <DialogBody>
            <ImageGrid
              testId="image-picker-grid"
              onPick={(_, markdown) => {
                insert(markdown);
                setOpen(false);
              }}
            />
          </DialogBody>
        </DialogContent>
      </Dialog>
    </>
  );
}
