// bb-plugin-collapsible-navigation — Collapsible Sidebar Navigation backend
import { type BbPluginApi } from "@get-bb/plugin-sdk";

export default async function plugin(bb: BbPluginApi) {
  bb.log.info("Collapsible Navigation loaded");

  // Declarative settings — editable in Settings → Plugins and via `bb plugin config`
  bb.settings.define({
    defaultCollapsed: {
      type: "boolean",
      label: "Start collapsed",
      default: false,
    },
    showQuickActions: {
      type: "boolean",
      label: "Show quick actions when collapsed",
      default: true,
    },
  });

  // When installed, automatically activate our collapsible navigation provider
  bb.onInstall(async () => {
    try {
      const { preferences } = await bb.sdk.system.uiPreferences.list();
      const currentNavProvider = preferences["sidebar.navigationProvider"]?.value;
      if (
        currentNavProvider === "__automatic__" ||
        currentNavProvider === "navigation/navigation" ||
        !currentNavProvider
      ) {
        await bb.sdk.system.uiPreferences.set({
          key: "sidebar.navigationProvider",
          value: "bb-plugin-collapsible-navigation/collapsible",
          expectedRevision: preferences["sidebar.navigationProvider"]?.revision,
        });
        bb.log.info("Set sidebar.navigationProvider to bb-plugin-collapsible-navigation/collapsible");
      }
    } catch (error) {
      bb.log.warn("Failed to set default navigation provider on install", { error });
    }
  });
}
