"use client";

import { ExternalLink } from "lucide-react";

import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export type ImagePreview = { src: string; alt: string };

/**
 * Full-size view of an image embedded in a thought or comment. The editor
 * shows images as small thumbnails (see `.mdxeditor` image rules in
 * `globals.css`); pressing one opens this.
 *
 * @param props.image - The image to show; `null` keeps the dialog closed.
 * @param props.onClose - Called when the dialog is dismissed.
 *
 * @example
 *   <ImagePreviewDialog image={preview} onClose={() => setPreview(null)} />
 */
export function ImagePreviewDialog({
  image,
  onClose,
}: {
  image: ImagePreview | null;
  onClose: () => void;
}) {
  const title = image?.alt || "Image";
  return (
    <Dialog open={!!image} onOpenChange={(open) => !open && onClose()}>
      <DialogContent data-testid="image-preview-dialog" className="w-[min(1100px,94vw)]">
        <DialogHeader data-testid="image-preview-dialog-header">
          <DialogTitle className="truncate">{title}</DialogTitle>
          <DialogDescription className="sr-only">Full-size image preview</DialogDescription>
        </DialogHeader>
        <DialogBody className="flex flex-col items-center gap-2 p-3">
          {image && (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element -- authenticated API route, not a static asset */}
              <img
                data-testid="image-preview-dialog-image"
                src={image.src}
                alt={title}
                className="max-h-[calc(100dvh-9rem)] max-w-full rounded-md object-contain"
              />
              <a
                data-testid="image-preview-dialog-open-link"
                href={image.src}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 self-end text-xs text-app-dim hover:text-app-bright"
              >
                Open original <ExternalLink className="size-3" aria-hidden />
              </a>
            </>
          )}
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
