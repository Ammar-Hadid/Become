"use client";

import { useEffect, type RefObject } from "react";

const HISTORY_GUARD_KEY = "__becomeEngineeringProjectFormGuard";
const UNSAVED_CHANGES_MESSAGE =
  "You have unsaved project changes. Leave and discard them?";

export function useUnsavedProjectFormGuard(
  formRef: RefObject<HTMLFormElement | null>,
) {
  useEffect(() => {
    const form = formRef.current;
    if (!form) return;

    const initialFormValue = serializeForm(form);
    let isDirty = false;
    let allowNavigation = false;
    let restoringGuardEntry = false;

    const updateDirtyState = () => {
      isDirty = serializeForm(form) !== initialFormValue;
    };
    const confirmDiscard = () =>
      !isDirty || window.confirm(UNSAVED_CHANGES_MESSAGE);

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!isDirty || allowNavigation) return;
      event.preventDefault();
      event.returnValue = "";
    };
    const handleDocumentClick = (event: MouseEvent) => {
      if (
        !isDirty ||
        allowNavigation ||
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }

      const target = event.target;
      const anchor =
        target instanceof Element
          ? target.closest<HTMLAnchorElement>("a[href]")
          : null;
      if (
        !anchor ||
        anchor.target === "_blank" ||
        anchor.hasAttribute("download")
      )
        return;

      const destination = new URL(anchor.href, window.location.href);
      if (destination.origin !== window.location.origin) return;
      if (
        destination.pathname === window.location.pathname &&
        destination.search === window.location.search
      ) {
        return;
      }

      if (!confirmDiscard()) {
        event.preventDefault();
        event.stopImmediatePropagation();
        return;
      }

      allowNavigation = true;
      window.setTimeout(() => {
        allowNavigation = false;
      }, 1_000);
    };
    const handlePopState = () => {
      if (restoringGuardEntry) {
        restoringGuardEntry = false;
        return;
      }

      if (allowNavigation) return;
      if (confirmDiscard()) {
        allowNavigation = true;
        window.history.back();
        return;
      }

      restoringGuardEntry = true;
      window.history.forward();
    };

    form.addEventListener("input", updateDirtyState);
    form.addEventListener("change", updateDirtyState);
    const observer = new MutationObserver(updateDirtyState);
    observer.observe(form, { childList: true, subtree: true });
    window.addEventListener("beforeunload", handleBeforeUnload);
    window.addEventListener("popstate", handlePopState);
    document.addEventListener("click", handleDocumentClick, true);

    const currentState = window.history.state as Record<string, unknown> | null;
    if (!currentState?.[HISTORY_GUARD_KEY]) {
      window.history.pushState(
        { ...currentState, [HISTORY_GUARD_KEY]: true },
        "",
        window.location.href,
      );
    }

    return () => {
      observer.disconnect();
      form.removeEventListener("input", updateDirtyState);
      form.removeEventListener("change", updateDirtyState);
      window.removeEventListener("beforeunload", handleBeforeUnload);
      window.removeEventListener("popstate", handlePopState);
      document.removeEventListener("click", handleDocumentClick, true);
    };
  }, [formRef]);
}

function serializeForm(form: HTMLFormElement) {
  return JSON.stringify(
    [...new FormData(form).entries()]
      .filter(([name]) => !name.startsWith("$ACTION_"))
      .map(([name, value]) => [
        name,
        typeof value === "string" ? value : `${value.name}:${value.size}`,
      ])
      .sort(([leftName, leftValue], [rightName, rightValue]) =>
        leftName === rightName
          ? leftValue.localeCompare(rightValue)
          : leftName.localeCompare(rightName),
      ),
  );
}
