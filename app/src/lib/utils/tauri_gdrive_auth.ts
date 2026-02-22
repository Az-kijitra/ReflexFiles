import type {
  GdriveAuthCallbackCaptured,
  GdriveAuthCallbackValidated,
  GdriveAuthStartPayload,
  GdriveAuthStatus,
} from "$lib/types";
import { invoke } from "$lib/tauri_client";

export function gdriveAuthGetStatus(): Promise<GdriveAuthStatus> {
  return invoke("gdrive_auth_get_status");
}

export function gdriveAuthStartSession(
  clientId: string,
  redirectUri: string,
  scopes: string[] = []
): Promise<GdriveAuthStartPayload> {
  return invoke("gdrive_auth_start_session", { clientId, redirectUri, scopes });
}

export function gdriveAuthValidateCallback(
  state: string,
  code: string
): Promise<GdriveAuthCallbackValidated> {
  return invoke("gdrive_auth_validate_callback", { state, code });
}

export function gdriveAuthWaitForCallback(
  timeoutMs: number | null = null
): Promise<GdriveAuthCallbackCaptured> {
  return invoke("gdrive_auth_wait_for_callback", { timeoutMs });
}

export function gdriveAuthCompleteExchange(
  accountId: string,
  scopes: string[] = [],
  refreshToken: string | null = null,
  accessToken: string | null = null,
  accessTokenExpiresInSec: number | null = null
): Promise<GdriveAuthStatus> {
  return invoke("gdrive_auth_complete_exchange", {
    accountId,
    scopes,
    refreshToken,
    accessToken,
    accessTokenExpiresInSec,
  });
}

export function gdriveAuthSignOut(accountId: string | null = null): Promise<GdriveAuthStatus> {
  return invoke("gdrive_auth_sign_out", { accountId });
}

export function gdriveAuthStoreClientSecret(clientId: string, clientSecret: string): Promise<void> {
  return invoke("gdrive_auth_store_client_secret", { clientId, clientSecret });
}

export function gdriveAuthLoadClientSecret(clientId: string): Promise<string | null> {
  return invoke("gdrive_auth_load_client_secret", { clientId });
}

export function gdriveAuthClearClientSecret(clientId: string): Promise<void> {
  return invoke("gdrive_auth_clear_client_secret", { clientId });
}
