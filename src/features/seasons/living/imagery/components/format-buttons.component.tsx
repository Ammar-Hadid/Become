"use client";
import { Monitor, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/buttons/button.component";
import type { Format } from "../utils/imagery-selection.util";
export function FormatButtons({
  format,
  onSelect,
  disabled,
}: {
  format: Format;
  onSelect: (format: Format) => void;
  disabled?: boolean;
}) {
  return (
    <div className="imagery-row" role="group" aria-label="Artwork format">
      <Button
        size="sm"
        variant={format === "DESKTOP" ? "primary" : "secondary"}
        aria-pressed={format === "DESKTOP"}
        disabled={disabled}
        onClick={() => onSelect("DESKTOP")}
      >
        <Monitor aria-hidden="true" />
        Desktop
      </Button>
      <Button
        size="sm"
        variant={format === "MOBILE" ? "primary" : "secondary"}
        aria-pressed={format === "MOBILE"}
        disabled={disabled}
        onClick={() => onSelect("MOBILE")}
      >
        <Smartphone aria-hidden="true" />
        Mobile
      </Button>
    </div>
  );
}
