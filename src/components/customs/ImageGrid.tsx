"use client";

import { Copy, ImagePlus, Trash2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { ConfirmDialog, type ConfirmState } from "@/components/customs/ConfirmDialog";
import { type ImagePreview, ImagePreviewDialog } from "@/components/customs/ImagePreviewDialog";
import { Button } from "@/components/ui/button";
import { useSignedIn } from "@/hooks/useSignedIn";
import { cn } from "@/lib/cn";
import {
  deleteImage,
  IMAGE_DRAG_TYPE,
  imageBlobUrl,
  imageEmbed,
  listImages,
  requireImageServer,
  type ServerImage,
  uploadImage,
} from "@/lib/image-server";
import * as ui from "@/lib/ui-styles";

function Thumb({ image, onOpen }: { image: ServerImage; onOpen?: (src: string) => void }) {
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    let live = true;
    requireImageServer()
      .then((server) => imageBlobUrl(server, image.id))
      .then((url) => live && setSrc(url))
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [image.id]);
  return src ? (
    // eslint-disable-next-line @next/next/no-img-element -- blob URL of an authenticated image
    <img
      src={src}
      alt={image.name}
      loading="lazy"
      draggable={false}
      onClick={onOpen && (() => onOpen(src))}
      className="size-full object-cover"
    />
  ) : (
    <div className="size-full animate-pulse bg-app-hover" />
  );
}

/**
 * Grid of the images on the image server, with upload and delete. Used by
 * the sidebar gallery (`onPick` unset: click opens full size, the copy
 * button copies the markdown embed) and by the editor's image picker
 * (`onPick` set: click hands back the embed markdown).
 *
 * @param props.onPick - Called with the image and its embed markdown.
 * @param props.actions - Rendered in the toolbar beside Upload (e.g. a close button).
 */
export function ImageGrid({
  onPick,
  actions,
  testId = "image-grid",
}: {
  onPick?: (image: ServerImage, markdown: string) => void;
  actions?: React.ReactNode;
  testId?: string;
}) {
  const signedIn = useSignedIn();
  const [images, setImages] = useState<ServerImage[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<ImagePreview | null>(null);
  const [confirmState, setConfirmState] = useState<ConfirmState>({ open: false, title: "" });
  const [copied, setCopied] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const run = useCallback(async (fn: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    if (!signedIn) {
      setImages([]);
      return;
    }
    void run(async () => setImages(await listImages()));
  }, [signedIn, run]);

  const upload = (list: File[]) => {
    if (fileRef.current) {
      fileRef.current.value = "";
    }
    void run(async () => {
      for (const file of list) {
        const image = await uploadImage(file);
        setImages((xs) => [image, ...xs]);
      }
    });
  };

  const [dragging, setDragging] = useState(false);
  const isFiles = (e: React.DragEvent) => e.dataTransfer.types.includes("Files");

  const embed = async (image: ServerImage) => imageEmbed(await requireImageServer(), image);

  const copy = (image: ServerImage) =>
    run(async () => {
      await navigator.clipboard.writeText(await embed(image));
      setCopied(image.id);
      setTimeout(() => setCopied((c) => (c === image.id ? null : c)), 1500);
    });

  const remove = (image: ServerImage) =>
    run(async () => {
      await deleteImage(image.id);
      setImages((xs) => xs.filter((x) => x.id !== image.id));
    });

  return (
    <div
      data-testid={testId}
      onDragOver={(e) => {
        if (signedIn && isFiles(e)) {
          e.preventDefault();
          setDragging(true);
        }
      }}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
          setDragging(false);
        }
      }}
      onDrop={(e) => {
        if (isFiles(e)) {
          e.preventDefault();
          setDragging(false);
          upload(Array.from(e.dataTransfer.files).filter((f) => f.type.startsWith("image/")));
        }
      }}
      className={cn(
        "flex min-h-40 flex-col gap-2 rounded-md",
        dragging && "outline-2 outline-dashed outline-app-accent",
      )}
    >
      <div className="flex items-center gap-1">
        <input
          ref={fileRef}
          type="file"
          multiple
          accept="image/png,image/jpeg,image/gif,image/webp,image/avif"
          className="hidden"
          onChange={(e) => upload(Array.from(e.target.files ?? []))}
          data-testid={`${testId}-file-input`}
        />
        <Button
          size="sm"
          variant="outline"
          disabled={!signedIn || busy}
          onClick={() => fileRef.current?.click()}
          data-testid={`${testId}-upload-button`}
        >
          <ImagePlus /> Upload
        </Button>
        {actions}
      </div>

      {!signedIn ? (
        <p className={ui.help}>Sign in to use the image gallery.</p>
      ) : (
        images.length === 0 &&
        !busy &&
        !error && (
          <p className={ui.help}>No images yet. Upload or drop one to reference it anywhere.</p>
        )
      )}
      {error && (
        <p role="alert" className={cn(ui.help, "text-app-error")}>
          {error}
        </p>
      )}

      <ul className="grid grid-cols-[repeat(auto-fill,minmax(84px,1fr))] gap-2">
        {images.map((image) => (
          <li
            key={image.id}
            data-testid={`${testId}-item-${image.id}`}
            draggable
            onDragStart={(e) => {
              // Dropped on an editor, this embeds the image (see ThoughtEditor).
              e.dataTransfer.effectAllowed = "copy";
              e.dataTransfer.setData(IMAGE_DRAG_TYPE, JSON.stringify(image));
            }}
            className="group relative overflow-hidden rounded-md border border-app-border bg-app-panel"
          >
            <div
              className={cn("aspect-[4/3]", onPick && "cursor-pointer")}
              onClick={onPick && (() => void embed(image).then((md) => onPick(image, md)))}
            >
              <Thumb
                image={image}
                onOpen={onPick ? undefined : (src) => setPreview({ src, alt: image.name })}
              />
            </div>
            <p className="truncate px-1.5 py-1 text-[11px] text-app-dim" title={image.name}>
              {image.name}
            </p>
            <div className="absolute top-1 right-1 flex gap-1 opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100">
              <Button
                size="icon-sm"
                variant="outline"
                onClick={() => copy(image)}
                aria-label="Copy markdown"
                title={copied === image.id ? "Copied" : "Copy markdown"}
                data-testid={`${testId}-copy-${image.id}`}
              >
                <Copy />
              </Button>
              <Button
                size="icon-sm"
                variant="outline"
                onClick={() =>
                  setConfirmState({
                    open: true,
                    title: "Delete image?",
                    description: `"${image.name}" will be deleted. Embeds of it will stop loading.`,
                    confirmLabel: "Delete",
                    destructive: true,
                    onConfirm: () => remove(image),
                  })
                }
                aria-label="Delete image"
                title="Delete image"
                data-testid={`${testId}-delete-${image.id}`}
              >
                <Trash2 />
              </Button>
            </div>
          </li>
        ))}
      </ul>

      <ImagePreviewDialog image={preview} onClose={() => setPreview(null)} />
      <ConfirmDialog
        state={confirmState}
        onOpenChange={(o) => setConfirmState((s) => ({ ...s, open: o }))}
      />
    </div>
  );
}
