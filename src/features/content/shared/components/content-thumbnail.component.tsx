import Image from "next/image";
import { Aperture } from "lucide-react";
import { cn } from "@/lib/styles/utils/class-name.util";

export function ContentThumbnail({
  url,
  alt,
  className,
  priority = false,
}: {
  url: string | null;
  alt: string;
  className?: string;
  priority?: boolean;
}) {
  return (
    <div className={cn("content-thumbnail", className)}>
      {url ? (
        <Image
          src={url}
          alt={alt}
          fill
          priority={priority}
          sizes="(max-width: 639px) 100vw, (max-width: 1023px) 60vw, 520px"
        />
      ) : (
        <span className="content-thumbnail-fallback" aria-hidden="true">
          <Aperture />
        </span>
      )}
    </div>
  );
}
