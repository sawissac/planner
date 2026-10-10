import * as React from "react";

import { cn } from "@/lib/cn";
import * as ui from "@/lib/ui-styles";

/**
 * Multi-line text field — the `ui.input` box (hairline `border-mid`, accent
 * focus ring) grown to fit its content via `field-sizing`.
 *
 * Not in compacto-ui yet — written to its contract (`--app-*` only,
 * `data-slot`, `ui-styles` recipe) so it can be upstreamed unchanged.
 */
function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        ui.input,
        "field-sizing-content min-h-16 resize-none",
        "aria-invalid:border-app-error aria-invalid:ring-2 aria-invalid:ring-app-error/20",
        className,
      )}
      {...props}
    />
  );
}

export { Textarea };
