"use client";
import { useState } from "react";
export function CaptureKey() {
  const [key] = useState(() => crypto.randomUUID());
  return <input type="hidden" name="captureKey" value={key} />;
}
