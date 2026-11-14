import Image from "next/image";
import { cn } from "@/lib/cn";
import type { Photo } from "@/lib/site";

// A campus photo with its licence credit (required for CC BY-SA images).
export function CampusPhoto({
  photo,
  aspect,
  sizes,
  priority = false,
  className,
}: {
  photo: Photo;
  aspect: string;
  sizes: string;
  priority?: boolean;
  className?: string;
}) {
  return (
    <figure className={className}>
      <div className={cn("relative overflow-hidden rounded-lg border border-line bg-line", aspect)}>
        <Image src={photo.src} alt={photo.alt} fill priority={priority} sizes={sizes} className="object-cover" />
      </div>
      {photo.credit ? (
        <figcaption className="mt-2 text-xs text-ink-muted">
          Photo:{" "}
          <a href={photo.credit.url} className="underline underline-offset-2 hover:text-ink" rel="noopener noreferrer" target="_blank">
            {photo.credit.author}
          </a>
          , {photo.credit.license}
        </figcaption>
      ) : null}
    </figure>
  );
}
