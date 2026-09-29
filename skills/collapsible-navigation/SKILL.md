---
name: collapsible-navigation
description: Collapsible sidebar navigation for BB. Allows collapsing navigation controls upward into a compact strip to maximize vertical space for the thread list.
---

# Collapsible Navigation

The Collapsible Navigation plugin provides a collapsible alternative to BB's default sidebar navigation strip (`experimental_sidebarNavigation`) and compact header icons (`experimental_sidebarHeader`).

## Features

- **Upward Collapsible Panel**: Folds navigation items upward into a slim 28px header, giving vertical screen space to the thread list.
- **Quick Actions in Collapsed State**: Quick 1-click access to top visible actions (New Thread, Search) without having to expand the full list.
- **Active Route Indication**: Shows the active item badge and icon even when collapsed.
- **Full BB Navigation Support**: Drag to split (`split.splitProps`), shortcut modifier display, customize editor shortcut (`actions.openCustomize()`), and accessory rendering.
- **Hidden Items Drawer**: Non-destructive access to hidden navigation items with one-click restore.
- **Persistent State**: Remembers collapsed/expanded state across restarts in `localStorage`.
- **Header Slot Alternative**: Optional `experimental_sidebarHeader` slot to position navigation icons directly into the window top bar beside window controls.

## Configuration & Selection

In BB Settings → Appearance:
- **Navigation**: select `Collapsible Navigation` (or automatic).
- **Header**: optionally select `Header Navigation Icons` to move icons directly into the sidebar header.
