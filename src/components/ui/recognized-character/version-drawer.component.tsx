"use client";
import Image from "next/image";
import { Check, X } from "lucide-react";
import { useRef } from "react";
import { Button } from "@/components/ui/buttons/button.component";
import { Drawer } from "@/components/ui/drawers/drawer.component";
import { usePresence } from "@/components/ui/motion/hooks/use-presence.hook";
import "./recognized-character.css";
export type CharacterEdition = {
  id: number;
  title: string;
  medium: string;
  year?: number | null;
  cover?: string | null;
};
export function VersionDrawer({
  open,
  works,
  selected,
  onSelect,
  onClose,
  trigger,
}: {
  open: boolean;
  works: CharacterEdition[];
  selected: number;
  onSelect: (id: number) => void;
  onClose: () => void;
  trigger: React.RefObject<HTMLButtonElement | null>;
}) {
  const presence = usePresence(open, "surface");
  const close = useRef<HTMLButtonElement>(null);
  if (!presence.isPresent) return null;
  const groups = ["TV anime", "Manga", "Anime film", "Other editions"];
  return (
    <Drawer
      open={open}
      presenceState={presence.presenceState}
      exiting={presence.isExiting}
      onPresenceAnimationEnd={presence.onPresenceAnimationEnd}
      onClose={onClose}
      titleId="reference-version-title"
      initialFocusRef={close}
      returnFocusRef={trigger}
      header={
        <>
          <div>
            <p className="type-overline">SOURCE & ADAPTATION</p>
            <h2 className="type-widget-title" id="reference-version-title">
              Choose your version
            </h2>
            <p className="type-body-sm">Choose the edition you have in mind.</p>
          </div>
          <Button
            ref={close}
            variant="ghost"
            size="icon"
            aria-label="Close version selection"
            onClick={onClose}
          >
            <X />
          </Button>
        </>
      }
    >
      <div className="reference-version-groups">
        {groups.map((group) => {
          const rows = works.filter((work) =>
            group === "Other editions"
              ? !groups.slice(0, 3).includes(work.medium)
              : work.medium === group,
          );
          return rows.length ? (
            <section key={group}>
              <h3 className="type-overline">{group}</h3>
              <div className="reference-version-list">
                {rows.map((work) => (
                  <Button
                    key={work.id}
                    variant="ghost"
                    className="reference-version-option"
                    aria-pressed={selected === work.id}
                    onClick={() => onSelect(work.id)}
                  >
                    {work.cover ? (
                      <Image
                        src={work.cover}
                        width={54}
                        height={76}
                        unoptimized
                        alt=""
                      />
                    ) : (
                      <span
                        className="reference-version-no-cover"
                        aria-hidden="true"
                      />
                    )}
                    <span>
                      <strong>{work.title}</strong>
                      <span className="type-caption">
                        {work.medium} · {work.year ?? "Year unavailable"}
                      </span>
                    </span>
                    {selected === work.id && (
                      <Check aria-label="Current version" />
                    )}
                  </Button>
                ))}
              </div>
            </section>
          ) : null;
        })}
      </div>
    </Drawer>
  );
}
