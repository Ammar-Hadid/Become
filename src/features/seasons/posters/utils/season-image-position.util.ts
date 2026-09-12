export type SeasonImagePosition = {
  x: number;
  y: number;
};

export type SeasonImageOverflow = {
  x: number;
  y: number;
};

function clampUnit(value: number) {
  return Math.min(1, Math.max(0, value));
}

export function seasonImagePosition(x: number, y: number): SeasonImagePosition {
  return { x: clampUnit(x), y: clampUnit(y) };
}

export function seasonImageCoverOverflow(
  containerWidth: number,
  containerHeight: number,
  imageWidth: number,
  imageHeight: number,
): SeasonImageOverflow {
  if (
    containerWidth <= 0 ||
    containerHeight <= 0 ||
    imageWidth <= 0 ||
    imageHeight <= 0
  )
    return { x: 0, y: 0 };
  const scale = Math.max(
    containerWidth / imageWidth,
    containerHeight / imageHeight,
  );
  return {
    x: Math.max(0, imageWidth * scale - containerWidth),
    y: Math.max(0, imageHeight * scale - containerHeight),
  };
}

export function seasonImagePositionAfterDrag(
  start: SeasonImagePosition,
  deltaX: number,
  deltaY: number,
  overflow: SeasonImageOverflow,
): SeasonImagePosition {
  return seasonImagePosition(
    overflow.x > 0 ? start.x - deltaX / overflow.x : start.x,
    overflow.y > 0 ? start.y - deltaY / overflow.y : start.y,
  );
}

export function seasonImagePositionAfterNudge(
  current: SeasonImagePosition,
  key: "ArrowLeft" | "ArrowRight" | "ArrowUp" | "ArrowDown",
  large = false,
): SeasonImagePosition {
  const step = large ? 0.08 : 0.02;
  return seasonImagePosition(
    current.x + (key === "ArrowLeft" ? step : key === "ArrowRight" ? -step : 0),
    current.y + (key === "ArrowUp" ? step : key === "ArrowDown" ? -step : 0),
  );
}

export function seasonImagePositionDescription({ x, y }: SeasonImagePosition) {
  const horizontal = x < 0.34 ? "left" : x > 0.66 ? "right" : "centered";
  const vertical = y < 0.34 ? "high" : y > 0.66 ? "low" : "centered";
  if (horizontal === "centered" && vertical === "centered")
    return "Image focus is centered.";
  if (horizontal === "centered") return `Image focus is ${vertical}.`;
  if (vertical === "centered") return `Image focus is ${horizontal}.`;
  return `Image focus is ${horizontal} and ${vertical}.`;
}
