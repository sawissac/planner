"use client";

import { X } from "lucide-react";

import { ImageGrid } from "@/components/customs/ImageGrid";
import { Button } from "@/components/ui/button";
import { SidebarContent, SidebarGroup, SidebarHeader, SidebarTitle } from "@/components/ui/sidebar";

/**
 * Sidebar pane (the rail's Images tab): every image on the image server, with
 * upload and delete. Copy an image's markdown to reference it in a thought or
 * comment, or use the editor's gallery button to insert one directly. Agents
 * read the embedded images through the Plan API.
 *
 * @param props.onClose - Leaves the pane (back to the file list).
 */
export function ImageGallery({ onClose }: { onClose: () => void }) {
  return (
    <>
      <SidebarHeader>
        <SidebarTitle>Images</SidebarTitle>
        <Button
          size="icon-sm"
          variant="ghost"
          onClick={onClose}
          aria-label="Back to files"
          title="Back to files"
          data-testid="sidebar-images-back-button"
        >
          <X />
        </Button>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup data-testid="sidebar-images">
          <ImageGrid testId="sidebar-images-grid" />
        </SidebarGroup>
      </SidebarContent>
    </>
  );
}
