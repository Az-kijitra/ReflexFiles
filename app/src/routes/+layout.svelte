<script>
  import { onMount } from "svelte";
  import { goto } from "$app/navigation";

  function isViewerWindow() {
    try {
      return sessionStorage.getItem("__rf_viewer_window") === "1";
    } catch {
      return false;
    }
  }

  onMount(() => {
    void (async () => {
      try {
        const viewerWindow = isViewerWindow();
        const path = window.location.pathname;

        if (viewerWindow && path !== "/viewer") {
          await goto("/viewer", { replaceState: true, noScroll: true, keepFocus: true });
          return;
        }

        if (!viewerWindow && path === "/viewer") {
          await goto("/", { replaceState: true, noScroll: true, keepFocus: true });
        }
      } catch {
        // ignore routing guard errors
      }
    })();
  });
</script>

<slot />