import type { ResourceRef } from "$lib/types";

export function toGdriveResourceRef(path: string): ResourceRef | null {
  const raw = String(path || "").trim();
  if (!raw.startsWith("gdrive://")) {
    return null;
  }
  const resourceId = raw.slice("gdrive://".length).replace(/^\/+|\/+$/g, "");
  if (!resourceId) {
    return null;
  }
  return {
    provider: "gdrive",
    resource_id: resourceId,
  };
}
