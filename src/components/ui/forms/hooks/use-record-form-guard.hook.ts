"use client";
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useCallback,
  type RefObject,
} from "react";
// Multiple inline Record forms share one navigation guard, so one back gesture
// cannot trigger several history.back calls or several confirmation prompts.
const baselines = new Map<HTMLFormElement, string>();
const edited = new Set<HTMLFormElement>();
const savers = new Map<HTMLFormElement, () => Promise<boolean>>();
const key = "__becomeRecordFormGuard";
const serialize = (form: HTMLFormElement) => {
  const fieldsets = [
    ...form.querySelectorAll<HTMLFieldSetElement>("fieldset[disabled]"),
  ];
  fieldsets.forEach((fieldset) => {
    fieldset.disabled = false;
  });
  try {
    return JSON.stringify([...new FormData(form).entries()]);
  } finally {
    fieldsets.forEach((fieldset) => {
      fieldset.disabled = true;
    });
  }
};
let uninstall: (() => void) | null = null;

export function hasDirtyRecordForms(scope?: ParentNode) {
  return [...baselines].some(
    ([form, value]) =>
      edited.has(form) &&
      form.isConnected &&
      (!scope || scope.contains(form)) &&
      serialize(form) !== value,
  );
}

export function confirmRecordFormDiscard(scope?: ParentNode) {
  return (
    !hasDirtyRecordForms(scope) ||
    window.confirm("You have unsaved changes. Leave and discard them?")
  );
}

/** Explicit save-aware links use this before navigating away from inline drafts. */
export async function flushRecordForms() {
  const results = await Promise.all(
    [...savers]
      .filter(([form]) => form.isConnected)
      .map(async ([form, save]) => {
        try {
          const saved = await save();
          if (saved && form.isConnected) {
            baselines.set(form, serialize(form));
            edited.delete(form);
          }
          return saved;
        } catch {
          return false;
        }
      }),
  );
  return results.every(Boolean);
}

function install() {
  let guardedUrl: string | null = null;
  let restoring = false;
  const dirty = () => hasDirtyRecordForms();
  const beforeUnload = (event: BeforeUnloadEvent) => {
    if (dirty()) {
      event.preventDefault();
      event.returnValue = "";
    }
  };
  const change = (event: Event) => {
    const form =
      event.target instanceof Element ? event.target.closest("form") : null;
    if (form && baselines.has(form)) edited.add(form);
    if (!dirty() || guardedUrl === window.location.href) return;
    guardedUrl = window.location.href;
    window.history.pushState(
      { ...window.history.state, [key]: true },
      "",
      guardedUrl,
    );
  };
  const click = (event: MouseEvent) => {
    const button =
      event.target instanceof Element
        ? event.target.closest<HTMLButtonElement>("button[type=button]")
        : null;
    if (button?.form && baselines.has(button.form)) {
      edited.add(button.form);
      // React applies collection/chip edits at the end of this event. Register
      // Back protection once their submitted values reflect that update.
      queueMicrotask(() => change(event));
    }
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.ctrlKey ||
      event.metaKey ||
      event.altKey ||
      event.shiftKey
    )
      return;
    const anchor =
      event.target instanceof Element
        ? event.target.closest<HTMLAnchorElement>("a[href]")
        : null;
    if (
      !anchor ||
      anchor.target === "_blank" ||
      anchor.hasAttribute("download")
    )
      return;
    // This link's handler awaits registered autosaves, then applies the normal
    // discard guard to any remaining manual forms.
    if (anchor.hasAttribute("data-record-save-link")) return;
    const url = new URL(anchor.href);
    if (
      url.origin !== location.origin ||
      url.pathname + url.search === location.pathname + location.search
    )
      return;
    if (!confirmRecordFormDiscard()) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  };
  const pop = () => {
    if (restoring) {
      restoring = false;
      return;
    }
    if (!guardedUrl || window.location.href !== guardedUrl) return;
    if (confirmRecordFormDiscard()) {
      guardedUrl = null;
      window.history.back();
    } else {
      restoring = true;
      window.history.forward();
    }
  };
  window.addEventListener("beforeunload", beforeUnload);
  window.addEventListener("popstate", pop);
  document.addEventListener("click", click, true);
  document.addEventListener("input", change);
  document.addEventListener("change", change);
  return () => {
    window.removeEventListener("beforeunload", beforeUnload);
    window.removeEventListener("popstate", pop);
    document.removeEventListener("click", click, true);
    document.removeEventListener("input", change);
    document.removeEventListener("change", change);
  };
}
export function useRecordFormGuard(
  ref: RefObject<HTMLFormElement | null>,
  saveBeforeLeave?: () => Promise<boolean>,
) {
  const latestSaver = useRef(saveBeforeLeave);
  useLayoutEffect(() => {
    latestSaver.current = saveBeforeLeave;
  }, [saveBeforeLeave]);
  const hasSaver = Boolean(saveBeforeLeave);
  useEffect(() => {
    const form = ref.current;
    if (!form || !hasSaver) return;
    savers.set(form, () => latestSaver.current?.() ?? Promise.resolve(true));
    return () => {
      savers.delete(form);
    };
  }, [ref, hasSaver]);
  useEffect(() => {
    const form = ref.current;
    if (!form) return;
    baselines.set(form, serialize(form));
    if (!uninstall) uninstall = install();
    return () => {
      baselines.delete(form);
      edited.delete(form);
      if (!baselines.size) {
        uninstall?.();
        uninstall = null;
      }
    };
  }, [ref]);
  return useCallback(() => {
    if (ref.current) {
      baselines.set(ref.current, serialize(ref.current));
      edited.delete(ref.current);
    }
  }, [ref]);
}
