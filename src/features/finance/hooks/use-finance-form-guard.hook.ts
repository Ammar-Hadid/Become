"use client";
import { useEffect, useCallback, type RefObject } from "react";
// Multiple inline Finance forms share one navigation guard, so one back gesture
// cannot trigger several history.back calls or several confirmation prompts.
const baselines = new Map<HTMLFormElement, string>();
const edited = new Set<HTMLFormElement>();
const key = "__becomeFinanceFormGuard";
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

export function hasDirtyFinanceForms(scope?: ParentNode) {
  return [...baselines].some(
    ([form, value]) =>
      edited.has(form) &&
      form.isConnected &&
      (!scope || scope.contains(form)) &&
      serialize(form) !== value,
  );
}

export function confirmFinanceFormDiscard(scope?: ParentNode) {
  return (
    !hasDirtyFinanceForms(scope) ||
    window.confirm("You have unsaved Finance changes. Leave and discard them?")
  );
}

function install() {
  let guardedUrl: string | null = null;
  let restoring = false;
  const dirty = () => hasDirtyFinanceForms();
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
    if (button?.form && baselines.has(button.form)) edited.add(button.form);
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
    const url = new URL(anchor.href);
    if (
      url.origin !== location.origin ||
      url.pathname + url.search === location.pathname + location.search
    )
      return;
    if (!confirmFinanceFormDiscard()) {
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
    if (confirmFinanceFormDiscard()) {
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
export function useFinanceFormGuard(ref: RefObject<HTMLFormElement | null>) {
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
