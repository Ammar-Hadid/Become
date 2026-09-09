"use client";
import { createContext, useContext, type ComponentProps } from "react";
import NextLink from "next/link";
import { useRouter } from "next/navigation";
import { contextualBusinessHref } from "@/features/entrepreneurship/explorations/utils/exploration.util";
export type ExplorationContextValue = {
  id: string;
  name: string;
  archived: boolean;
};
const Context = createContext<ExplorationContextValue | undefined>(undefined);
export function ExplorationProvider({
  value,
  children,
}: {
  value: ExplorationContextValue;
  children: React.ReactNode;
}) {
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function useExploration() {
  return useContext(Context);
}
export function BusinessLink({
  href,
  ...props
}: ComponentProps<typeof NextLink>) {
  const exploration = useExploration();
  return (
    <NextLink
      {...props}
      href={
        typeof href === "string"
          ? contextualBusinessHref(href, exploration?.id)
          : href
      }
    />
  );
}
export function useBusinessRouter() {
  const router = useRouter();
  const exploration = useExploration();
  return {
    ...router,
    push: (href: string, options?: Parameters<typeof router.push>[1]) =>
      router.push(contextualBusinessHref(href, exploration?.id), options),
    replace: (href: string, options?: Parameters<typeof router.replace>[1]) =>
      router.replace(contextualBusinessHref(href, exploration?.id), options),
  };
}
