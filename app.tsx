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
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/utils";

const COLLAPSED_STORAGE_KEY = "bb:collapsible-nav:collapsed";

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
        // ignore localStorage access issues
      }
      return next;
    });
  }, []);

  const setCollapsed = useCallback((next: boolean) => {
    setIsCollapsed(next);
    try {
      localStorage.setItem(COLLAPSED_STORAGE_KEY, String(next));
    } catch {
      // ignore
    }
  }, []);

  return { isCollapsed, toggleCollapsed, setCollapsed };
}

/** Single row for an expanded sidebar navigation item */
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

  return (
    <div className="relative group">
      <button
        type="button"
        aria-label={item.label}
        aria-current={active ? "page" : undefined}
        disabled={item.isDisabled || item.isLoading}
        {...split.splitProps}
        onClick={(event) =>
          onActivate(item.id, event.metaKey || event.ctrlKey)
        }
        className={cn(
          "w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs font-medium transition-colors text-left select-none cursor-pointer",
          active
            ? "bg-accent text-accent-foreground font-semibold shadow-xs"
            : "text-muted-foreground hover:text-foreground hover:bg-accent/50",
          (item.isDisabled || item.isLoading) &&
            "opacity-50 cursor-not-allowed pointer-events-none",
        )}
      >
        <span className="shrink-0 size-4 flex items-center justify-center">
          <experimental_SidebarNavigationIcon
            icon={item.icon}
            className={cn(
              "size-4 shrink-0 transition-colors",
              active
                ? "text-foreground"
                : "text-muted-foreground group-hover:text-foreground",
            )}
          />
        </span>
        <span className="truncate flex-1">{item.label}</span>
        {Accessory && (
          <span className="shrink-0 flex items-center">
            <Accessory />
          </span>
        )}
        {item.shortcut && (
          <kbd
            className={cn(
              "text-[10px] font-mono px-1 py-0.5 rounded border border-border/40 transition-opacity",
              isShortcutModifierHeld
                ? "opacity-100 bg-background text-foreground shadow-2xs font-bold"
                : "opacity-40 group-hover:opacity-80",
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

/** Compact icon button for the collapsed top bar */
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

  return (
    <button
      type="button"
      title={`${item.label}${item.shortcut ? ` (${item.shortcut.label})` : ""}`}
      aria-label={item.label}
      aria-current={active ? "page" : undefined}
      disabled={item.isDisabled || item.isLoading}
      {...split.splitProps}
      onClick={(event) => onActivate(item.id, event.metaKey || event.ctrlKey)}
      className={cn(
        "p-1 rounded-md transition-colors cursor-pointer flex items-center justify-center size-6",
        active
          ? "bg-accent text-accent-foreground font-semibold"
          : "text-muted-foreground hover:text-foreground hover:bg-accent/50",
      )}
    >
      <experimental_SidebarNavigationIcon
        icon={item.icon}
        className="size-3.5 shrink-0"
      />
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
  const { isCollapsed, toggleCollapsed, setCollapsed } = useCollapsedState();
  const [showHiddenSection, setShowHiddenSection] = useState(false);

  const visibleItems = useMemo(
    () => items.filter((item) => item.isVisible),
    [items],
  );
  const hiddenItems = useMemo(
    () => items.filter((item) => !item.isVisible),
    [items],
  );

  const activeItem = useMemo(
    () => items.find((item) => item.id === activeItemId) ?? null,
    [items, activeItemId],
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
    <nav
      aria-label="Sidebar navigation"
      className="flex flex-col w-full text-sidebar-foreground border-b border-border/40 pb-1 mb-1 transition-all duration-200"
    >
      {/* Header bar / Collapsible toggle strip */}
      <div className="flex items-center justify-between px-2 h-7 select-none">
        <button
          type="button"
          onClick={toggleCollapsed}
          className="flex items-center gap-1.5 py-1 px-1 -ml-1 rounded text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors cursor-pointer group"
          title={
            isCollapsed
              ? "Expand navigation (Развернуть)"
              : "Collapse navigation upward (Свернуть наверх)"
          }
          aria-expanded={!isCollapsed}
        >
          <Icon
            name={isCollapsed ? "ChevronDown" : "ChevronUp"}
            className="size-3.5 text-muted-foreground group-hover:text-foreground transition-transform duration-200"
          />
          <span className="font-semibold tracking-tight text-[11px] uppercase opacity-75 group-hover:opacity-100">
            Navigation
          </span>
          {isCollapsed ? (
            activeItem && (
              <span className="ml-1 inline-flex items-center gap-1 text-[11px] font-normal px-1.5 py-0.2 rounded bg-accent/60 text-foreground max-w-[120px] truncate">
                <experimental_SidebarNavigationIcon
                  icon={activeItem.icon}
                  className="size-3 shrink-0"
                />
                <span className="truncate">{activeItem.label}</span>
              </span>
            )
          ) : (
            <span className="text-[10px] text-muted-foreground/60 font-normal">
              ({visibleItems.length})
            </span>
          )}
        </button>

        {/* Action controls on the right of header */}
        <div className="flex items-center gap-0.5">
          {isCollapsed ? (
            // In collapsed state: show quick-action mini buttons for top items (e.g. New Thread, Search)
            <div className="flex items-center gap-0.5">
              {visibleItems.slice(0, 3).map((item) => (
                <CollapsedQuickButton
                  key={item.id}
                  item={item}
                  active={item.id === activeItemId}
                  onActivate={handleActivate}
                />
              ))}
              <button
                type="button"
                onClick={() => setCollapsed(false)}
                title="Expand navigation"
                className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors cursor-pointer size-6 flex items-center justify-center"
              >
                <Icon name="PanelTopOpen" className="size-3.5" />
              </button>
            </div>
          ) : (
            // In expanded state: customize button and collapse button
            <div className="flex items-center gap-0.5">
              <button
                type="button"
                onClick={() => actions.openCustomize()}
                title="Customize items in sidebar"
                aria-label="Customize navigation"
                className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors cursor-pointer size-6 flex items-center justify-center"
              >
                <Icon name="SlidersHorizontal" className="size-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setCollapsed(true)}
                title="Collapse upward (Свернуть наверх)"
                aria-label="Collapse navigation"
                className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors cursor-pointer size-6 flex items-center justify-center"
              >
                <Icon name="PanelTopClose" className="size-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Expanded item list with smooth folding transition */}
      <div
        className={cn(
          "transition-all duration-200 ease-in-out overflow-hidden flex flex-col gap-0.5 px-1",
          isCollapsed
            ? "max-h-0 opacity-0 pointer-events-none"
            : "max-h-[500px] opacity-100 pt-0.5",
        )}
      >
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
          <div className="mt-1 pt-1 border-t border-border/30">
            <button
              type="button"
              onClick={() => setShowHiddenSection((prev) => !prev)}
              className="w-full flex items-center justify-between px-2 py-1 text-[11px] text-muted-foreground hover:text-foreground rounded hover:bg-accent/30 transition-colors cursor-pointer"
            >
              <span className="flex items-center gap-1.5">
                <Icon
                  name={showHiddenSection ? "ChevronDown" : "ChevronRight"}
                  className="size-3"
                />
                Hidden items ({hiddenItems.length})
              </span>
              <span className="text-[10px] text-muted-foreground/60">More</span>
            </button>
            {showHiddenSection && (
              <div className="pl-2 pt-0.5 flex flex-col gap-0.5">
                {hiddenItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between group rounded hover:bg-accent/30 pr-1"
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
                      title={`Show ${item.label} in main navigation`}
                      className="p-1 text-muted-foreground hover:text-foreground rounded cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Icon name="Eye" className="size-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
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

  return (
    <button
      type="button"
      title={`${item.label}${item.shortcut ? ` (${item.shortcut.label})` : ""}`}
      aria-label={item.label}
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
          ? "bg-accent text-accent-foreground font-semibold shadow-xs"
          : "text-muted-foreground hover:text-foreground hover:bg-accent/60",
        (item.isDisabled || item.isLoading) &&
          "opacity-50 cursor-not-allowed pointer-events-none",
      )}
    >
      <experimental_SidebarNavigationIcon
        icon={item.icon}
        className="size-4 shrink-0"
      />
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
  // Calculate how many buttons fit comfortably in the header space
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
          className="rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent/50 cursor-pointer"
        >
          <Icon name="MoreHorizontal" className="size-4" />
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
