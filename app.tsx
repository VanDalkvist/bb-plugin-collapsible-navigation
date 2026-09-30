// bb-plugin-collapsible-navigation — Collapsible Sidebar Navigation for BB
import {
  useCallback,
  useLayoutEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";
import {
  definePluginApp,
  experimental_SidebarNavigationIcon,
  experimental_useSidebarNavigation,
  experimental_useSidebarNavigationSplit,
  type ExperimentalSidebarHeaderProps,
  type ExperimentalSidebarNavigationItem,
  type ExperimentalSidebarNavigationProps,
} from "@get-bb/plugin-sdk/app";
import { cn } from "@/lib/utils";

const COLLAPSED_STORAGE_KEY = "bb:collapsible-nav:collapsed";
const SidebarNavIcon = experimental_SidebarNavigationIcon;

// Module-level coordination for moving navigation into the window header row
let inHeader = false;
const headerListeners = new Set<() => void>();
const setInHeader = (next: boolean) => {
  if (inHeader !== next) {
    inHeader = next;
    headerListeners.forEach((listener) => listener());
  }
};
const subscribeInHeader = (listener: () => void) => {
  headerListeners.add(listener);
  return () => {
    headerListeners.delete(listener);
  };
};

function useCollapsedState() {
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem(COLLAPSED_STORAGE_KEY) === "true";
    } catch {
      return false;
    }
  });

  const toggleCollapsed = useCallback(() => {
    setIsCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(COLLAPSED_STORAGE_KEY, String(next));
      } catch {
        // ignore
      }
      return next;
    });
  }, []);

  return { isCollapsed, toggleCollapsed };
}

/** Pure SVG chevron icon (never falls back to Zap / lightning) */
function ChevronIcon({ expanded }: { expanded: boolean }) {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn(
        "size-3 shrink-0 text-muted-foreground/80 transition-transform duration-200",
        expanded ? "rotate-0" : "-rotate-90",
      )}
      aria-hidden="true"
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

/** Pure SVG sliders icon for Customize button */
function CustomizeIcon() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <line x1="4" y1="21" x2="4" y2="14" />
      <line x1="4" y1="10" x2="4" y2="3" />
      <line x1="12" y1="21" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12" y2="3" />
      <line x1="20" y1="21" x2="20" y2="16" />
      <line x1="20" y1="12" x2="20" y2="3" />
      <line x1="1" y1="14" x2="7" y2="14" />
      <line x1="9" y1="8" x2="15" y2="8" />
      <line x1="17" y1="16" x2="23" y2="16" />
    </svg>
  );
}

/** Single row for an expanded sidebar navigation item with BB-native typography */
function SidebarNavItemRow({
  item,
  active,
  isShortcutModifierHeld,
  onActivate,
}: {
  item: ExperimentalSidebarNavigationItem;
  active: boolean;
  isShortcutModifierHeld: boolean;
  onActivate: (itemId: string, openInSplit: boolean) => void;
}) {
  const split = experimental_useSidebarNavigationSplit(item.id);
  const Accessory = item.experimental_Accessory;
  const tooltip = `${item.label}${item.shortcut ? ` (${item.shortcut.label})` : ""}`;

  return (
    <div className="relative group">
      <button
        type="button"
        title={tooltip}
        aria-label={tooltip}
        aria-current={active ? "page" : undefined}
        disabled={item.isDisabled || item.isLoading}
        {...split.splitProps}
        onClick={(event) =>
          onActivate(item.id, event.metaKey || event.ctrlKey)
        }
        className={cn(
          "w-full flex items-center gap-2 pl-2 pr-2 h-[var(--bb-sidebar-row-height,28px)] rounded-md text-sm font-normal text-sidebar-foreground transition-none text-left select-none cursor-pointer",
          active
            ? "bg-sidebar-accent text-sidebar-foreground font-medium"
            : "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
          (item.isDisabled || item.isLoading) &&
            "opacity-50 cursor-not-allowed pointer-events-none",
        )}
      >
        <span className="shrink-0 size-4 flex items-center justify-center">
          <SidebarNavIcon
            icon={item.icon}
            className={cn(
              "size-4 shrink-0 transition-colors",
              active
                ? "text-sidebar-foreground"
                : "text-muted-foreground group-hover:text-sidebar-foreground",
            )}
          />
        </span>
        <span className="truncate flex-1 min-w-0">{item.label}</span>
        {Accessory && (
          <span className="shrink-0 flex items-center">
            <Accessory />
          </span>
        )}
        {item.shortcut && (
          <kbd
            className={cn(
              "pointer-events-none inline-flex shrink-0 items-center justify-center whitespace-nowrap rounded-sm bg-state-hover px-1.5 py-0.5 font-sans text-xs font-normal leading-none tabular-nums text-subtle-foreground",
              isShortcutModifierHeld
                ? "opacity-100 bg-background text-foreground shadow-2xs font-semibold"
                : "opacity-60 group-hover:opacity-90",
            )}
            title={item.shortcut.ariaKeyShortcuts}
          >
            {item.shortcut.label}
          </kbd>
        )}
      </button>
    </div>
  );
}

/** Compact icon button for the collapsed state with explicit tooltip */
function CollapsedQuickButton({
  item,
  active,
  onActivate,
}: {
  item: ExperimentalSidebarNavigationItem;
  active: boolean;
  onActivate: (itemId: string, openInSplit: boolean) => void;
}) {
  const split = experimental_useSidebarNavigationSplit(item.id);
  const tooltip = `${item.label}${item.shortcut ? ` (${item.shortcut.label})` : ""}`;

  return (
    <button
      type="button"
      title={tooltip}
      aria-label={tooltip}
      aria-current={active ? "page" : undefined}
      disabled={item.isDisabled || item.isLoading}
      {...split.splitProps}
      onClick={(event) => onActivate(item.id, event.metaKey || event.ctrlKey)}
      className={cn(
        "size-7 rounded-md transition-colors cursor-pointer flex items-center justify-center shrink-0",
        active
          ? "bg-sidebar-accent text-sidebar-foreground font-semibold shadow-xs"
          : "text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent",
        (item.isDisabled || item.isLoading) &&
          "opacity-50 cursor-not-allowed pointer-events-none",
      )}
    >
      <SidebarNavIcon icon={item.icon} className="size-4 shrink-0" />
    </button>
  );
}

/** Main collapsible sidebar navigation component */
function CollapsibleSidebarNavigation({
  isCompactViewport,
}: ExperimentalSidebarNavigationProps) {
  const isMountedInHeader = useSyncExternalStore(
    subscribeInHeader,
    () => inHeader,
  );
  const { items, activeItemId, isShortcutModifierHeld, actions } =
    experimental_useSidebarNavigation();
  const { isCollapsed, toggleCollapsed } = useCollapsedState();
  const [showHiddenSection, setShowHiddenSection] = useState(false);

  const visibleItems = useMemo(
    () => items.filter((item) => item.isVisible),
    [items],
  );
  const hiddenItems = useMemo(
    () => items.filter((item) => !item.isVisible),
    [items],
  );

  const handleActivate = useCallback(
    (itemId: string, openInSplit: boolean) => {
      actions.activate(itemId, { openInSplit });
    },
    [actions],
  );

  // If header slot is rendering navigation, collapse the body completely to avoid duplicates
  if (isMountedInHeader) {
    return null;
  }

  return (
    <nav aria-label="Sidebar navigation" className="flex flex-col w-full">
      {/* When Collapsed: ONE SINGLE LINE (h-7) with Navigation title on left and non-wrapping icons on right */}
      {isCollapsed ? (
        <div className="flex items-center justify-between gap-1 px-2 h-7 select-none overflow-hidden flex-nowrap w-full">
          {/* Header toggler */}
          <div
            role="button"
            tabIndex={0}
            onClick={toggleCollapsed}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                toggleCollapsed();
              }
            }}
            title="Expand navigation"
            aria-expanded={false}
            className="flex items-center gap-1.5 shrink-0 cursor-pointer text-xs font-medium text-muted-foreground hover:text-foreground transition-colors py-1"
          >
            <ChevronIcon expanded={false} />
            <span className="text-xs font-medium tracking-tight">Navigation</span>
          </div>

          {/* Single-row icon strip for all pinned items — no wrapping, hides what doesn't fit */}
          <div
            className="flex items-center gap-0.5 min-w-0 overflow-hidden flex-nowrap justify-end shrink"
            role="toolbar"
            aria-label="Pinned navigation icons"
          >
            {visibleItems.map((item) => (
              <CollapsedQuickButton
                key={item.id}
                item={item}
                active={item.id === activeItemId}
                onActivate={handleActivate}
              />
            ))}
          </div>
        </div>
      ) : (
        /* When Expanded: header on top, then full list of rows */
        <>
          <div
            role="button"
            tabIndex={0}
            onClick={toggleCollapsed}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                toggleCollapsed();
              }
            }}
            title="Collapse navigation upward"
            aria-expanded={true}
            className="flex items-center justify-between px-2 h-7 select-none cursor-pointer group text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            <div className="flex items-center gap-1.5">
              <ChevronIcon expanded={true} />
              <span className="text-xs font-medium tracking-tight">Navigation</span>
              <span className="text-[11px] text-muted-foreground/60 font-normal">
                ({visibleItems.length})
              </span>
            </div>

            {/* Customize button */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                actions.openCustomize();
              }}
              title="Customize sidebar navigation"
              aria-label="Customize navigation"
              className="size-5 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-sidebar-accent opacity-60 group-hover:opacity-100 transition-opacity cursor-pointer"
            >
              <CustomizeIcon />
            </button>
          </div>

          {/* Full rows with labels */}
          <div className="flex flex-col gap-0.5 px-2 pt-1">
            {visibleItems.map((item) => (
              <SidebarNavItemRow
                key={item.id}
                item={item}
                active={item.id === activeItemId}
                isShortcutModifierHeld={isShortcutModifierHeld}
                onActivate={handleActivate}
              />
            ))}

            {/* Hidden items overflow drawer */}
            {hiddenItems.length > 0 && (
              <div className="mt-1 pt-1 border-t border-sidebar-border/20">
                <button
                  type="button"
                  onClick={() => setShowHiddenSection((prev) => !prev)}
                  title="Show hidden items"
                  className="w-full flex items-center justify-between px-2 h-6 text-xs text-muted-foreground hover:text-foreground rounded hover:bg-sidebar-accent transition-colors cursor-pointer"
                >
                  <span className="flex items-center gap-1.5">
                    <ChevronIcon expanded={showHiddenSection} />
                    <span>Hidden items ({hiddenItems.length})</span>
                  </span>
                  <span className="text-[10px] text-muted-foreground/60">
                    More
                  </span>
                </button>
                {showHiddenSection && (
                  <div className="pt-0.5 flex flex-col gap-0.5">
                    {hiddenItems.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between group rounded hover:bg-sidebar-accent/50 pr-1"
                      >
                        <div className="flex-1 min-w-0">
                          <SidebarNavItemRow
                            item={item}
                            active={item.id === activeItemId}
                            isShortcutModifierHeld={isShortcutModifierHeld}
                            onActivate={handleActivate}
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => actions.setVisible(item.id, true)}
                          title={`Unhide "${item.label}"`}
                          aria-label={`Unhide ${item.label}`}
                          className="size-5 rounded flex items-center justify-center text-muted-foreground hover:text-foreground cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <svg
                            width="12"
                            height="12"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                            <circle cx="12" cy="12" r="3" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </>
      )}

      {/* Divider matching native BB divider */}
      <div
        aria-hidden="true"
        className="mx-2 my-2 shrink-0 border-t border-sidebar-border/25"
      />
    </nav>
  );
}

/** Header icon button for the window top bar (experimental_sidebarHeader) */
function HeaderNavIconButton({
  item,
  active,
  controlSize,
  actions,
}: {
  item: ExperimentalSidebarNavigationItem;
  active: boolean;
  controlSize: number;
  actions: ReturnType<typeof experimental_useSidebarNavigation>["actions"];
}) {
  const split = experimental_useSidebarNavigationSplit(item.id);
  const tooltip = `${item.label}${item.shortcut ? ` (${item.shortcut.label})` : ""}`;

  return (
    <button
      type="button"
      title={tooltip}
      aria-label={tooltip}
      aria-current={active ? "page" : undefined}
      disabled={item.isDisabled || item.isLoading}
      {...split.splitProps}
      onClick={(event) =>
        actions.activate(item.id, {
          openInSplit: event.metaKey || event.ctrlKey,
        })
      }
      style={{ width: controlSize, height: controlSize }}
      className={cn(
        "rounded-md flex items-center justify-center transition-colors cursor-pointer select-none",
        active
          ? "bg-sidebar-accent text-sidebar-foreground font-semibold shadow-xs"
          : "text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent",
        (item.isDisabled || item.isLoading) &&
          "opacity-50 cursor-not-allowed pointer-events-none",
      )}
    >
      <SidebarNavIcon icon={item.icon} className="size-4 shrink-0" />
    </button>
  );
}

/** Sidebar Header component (moves navigation into the top header row) */
function SidebarHeaderNavigation({
  width,
  controlSize,
}: ExperimentalSidebarHeaderProps) {
  useLayoutEffect(() => {
    setInHeader(true);
    return () => {
      setInHeader(false);
    };
  }, []);

  const { items, activeItemId, actions } =
    experimental_useSidebarNavigation();
  const visibleItems = useMemo(
    () => items.filter((item) => item.isVisible),
    [items],
  );
  const capacity = Math.max(1, Math.floor((width + 4) / (controlSize + 4)));
  const displayedItems = visibleItems.slice(0, capacity);

  return (
    <div
      className="flex items-center gap-1 overflow-hidden"
      style={{ height: controlSize }}
      aria-label="Header navigation"
    >
      {displayedItems.map((item) => (
        <HeaderNavIconButton
          key={item.id}
          item={item}
          active={item.id === activeItemId}
          controlSize={controlSize}
          actions={actions}
        />
      ))}
      {visibleItems.length > capacity && (
        <button
          type="button"
          onClick={() => actions.openCustomize()}
          title={`More items (${visibleItems.length - capacity})`}
          style={{ width: controlSize, height: controlSize }}
          className="rounded-md flex items-center justify-center text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent cursor-pointer"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="1" />
            <circle cx="19" cy="12" r="1" />
            <circle cx="5" cy="12" r="1" />
          </svg>
        </button>
      )}
    </div>
  );
}

export default definePluginApp((app) => {
  // Primary slot: Collapsible Sidebar Navigation above the thread list
  app.slots.experimental_sidebarNavigation({
    id: "collapsible",
    title: "Collapsible Navigation",
    description: "Collapsible sidebar navigation bar that folds up to save vertical space.",
    component: CollapsibleSidebarNavigation,
  });

  // Complementary slot: Move navigation into the sidebar header row beside window controls
  app.slots.experimental_sidebarHeader({
    id: "header-navigation",
    title: "Header Navigation Icons",
    description: "Compact navigation icon strip in the sidebar header row.",
    component: SidebarHeaderNavigation,
  });
});
