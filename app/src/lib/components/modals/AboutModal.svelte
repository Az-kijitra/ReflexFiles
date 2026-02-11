<script>
  import ModalShell from "$lib/components/modals/ModalShell.svelte";
  import ModalCloseActions from "$lib/components/modals/ModalCloseActions.svelte";
  import { handleConfirmCancelKeydown } from "$lib/utils/modal_keyboard";

  /** @type {HTMLElement | null} */
  export let aboutModalEl = null;
  export let t;
  export let openUrl;
  export let ABOUT_URL = "";
  export let ABOUT_LICENSE = "";
  export let closeAbout;
  export let trapModalTab;
</script>

<ModalShell
  bind:modalEl={aboutModalEl}
  title={t("about.title")}
  modalClass="about-modal"
  {trapModalTab}
  onKeydown={(event) => {
    handleConfirmCancelKeydown(event, {
      onConfirm: closeAbout,
      onCancel: closeAbout,
      stopPropagation: true,
    });
  }}
>
  <div slot="body" class="about-body">
    <img class="about-logo" src="/ReflexFiles.png" alt="ReflexFiles" />
    <div class="about-row">
      <span class="about-label">{t("about.homepage")}</span>
      <button class="about-link" onclick={() => openUrl(ABOUT_URL)}>
        {ABOUT_URL}
      </button>
    </div>
    <div class="about-row">
      <span class="about-label">{t("about.license")}</span>
      <span>{ABOUT_LICENSE}</span>
    </div>
  </div>
  <ModalCloseActions slot="actions" label={t("about.close")} onClose={closeAbout} />
</ModalShell>
