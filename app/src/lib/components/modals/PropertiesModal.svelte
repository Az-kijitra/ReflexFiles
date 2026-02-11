<script>
  import ModalShell from "$lib/components/modals/ModalShell.svelte";
  import ModalChoiceActions from "$lib/components/modals/ModalChoiceActions.svelte";
  /** @type {HTMLElement | null} */
  export let propertiesModalEl = null;
  /** @type {HTMLElement | null} */
  export let propertiesCloseButton = null;
  export let propertiesData = null;
  export let dirStatsTimeoutMs = 3000;
  export let dirStatsInFlight = false;
  export let t;
  export let formatSize;
  export let formatModified;
  export let saveDirStatsTimeout;
  export let clearDirStatsCache;
  export let retryDirStats;
  export let cancelDirStats;
  export let closeProperties;
  export let autofocus;
  export let trapModalTab;
</script>

<ModalShell
  bind:modalEl={propertiesModalEl}
  title={t("properties.title")}
  modalClass="properties-modal"
  {trapModalTab}
  {autofocus}
  onKeydown={(event) => {
    if (event.key === "Escape") {
      event.preventDefault();
      closeProperties();
    }
  }}
>
  <div slot="body">
    {#if propertiesData}
      <div class="properties-grid">
        <div class="label">{t("properties.name")}</div>
        <div class="value">{propertiesData.name}</div>

        <div class="label">{t("properties.path")}</div>
        <div class="value">{propertiesData.path}</div>

        <div class="label">{t("properties.type")}</div>
        <div class="value">{propertiesData.type}</div>

        <div class="label">{t("properties.size")}</div>
        <div class="value">
          {#if propertiesData.type === "dir" && propertiesData.dir_stats_pending}
            {t("properties.calc")}
          {:else if propertiesData.type === "dir" && propertiesData.dir_stats_timeout}
            {t("properties.timeout")}
          {:else if propertiesData.type === "dir" && propertiesData.dir_stats_canceled}
            -
          {:else}
            {formatSize(propertiesData.size)}
          {/if}
        </div>

        <div class="label">{t("properties.created")}</div>
        <div class="value">{formatModified(propertiesData.created)}</div>

        <div class="label">{t("properties.modified")}</div>
        <div class="value">{formatModified(propertiesData.modified)}</div>

        <div class="label">{t("properties.accessed")}</div>
        <div class="value">{formatModified(propertiesData.accessed)}</div>

        <div class="label">{t("properties.hidden")}</div>
        <div class="value">{propertiesData.hidden ? t("properties.yes") : t("properties.no")}</div>

        <div class="label">{t("properties.readonly")}</div>
        <div class="value">{propertiesData.readonly ? t("properties.yes") : t("properties.no")}</div>

        <div class="label">{t("properties.system")}</div>
        <div class="value">{propertiesData.system ? t("properties.yes") : t("properties.no")}</div>

        {#if propertiesData.type === "file"}
          <div class="label">{t("properties.extension")}</div>
          <div class="value">{propertiesData.ext || "-"}</div>
        {:else}
          <div class="label">{t("properties.files")}</div>
          <div class="value">
            {#if propertiesData.dir_stats_pending}
              {t("properties.calc")}
            {:else if propertiesData.dir_stats_timeout}
              {t("properties.timeout")}
            {:else if propertiesData.dir_stats_canceled}
              -
            {:else}
              {propertiesData.files}
            {/if}
          </div>

          <div class="label">{t("properties.folders")}</div>
          <div class="value">
            {#if propertiesData.dir_stats_pending}
              {t("properties.calc")}
            {:else if propertiesData.dir_stats_timeout}
              {t("properties.timeout")}
            {:else if propertiesData.dir_stats_canceled}
              -
            {:else}
              {propertiesData.dirs}
            {/if}
          </div>
        {/if}
      </div>
    {/if}
  </div>
  <div slot="actions">
    {#if propertiesData && propertiesData.type === "dir"}
      <label class="timeout-control">
        {t("properties.timeout_label")}
        <input
          type="number"
          min="500"
          step="500"
          bind:value={dirStatsTimeoutMs}
          onchange={saveDirStatsTimeout}
          onblur={saveDirStatsTimeout}
        />
      </label>
    {/if}
    {#if propertiesData && propertiesData.type === "dir"}
      <ModalChoiceActions
        choices={[
          { label: t("properties.clear_cache"), onSelect: clearDirStatsCache },
          { label: t("properties.retry"), onSelect: retryDirStats, disabled: dirStatsInFlight },
          { label: t("properties.cancel_calc"), onSelect: cancelDirStats, disabled: !dirStatsInFlight },
        ]}
      />
    {/if}
    <button bind:this={propertiesCloseButton} onclick={closeProperties}>
      {t("close")}
    </button>
  </div>
</ModalShell>
