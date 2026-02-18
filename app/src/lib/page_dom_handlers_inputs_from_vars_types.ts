/**
 * @param {{
 *   state: (() => {
 *     listEl: HTMLElement | null;
 *     pathInputEl: HTMLInputElement | null;
 *     treeEl: HTMLElement | null;
 *     dropdownEl: HTMLElement | null;
 *     contextMenuEl: HTMLElement | null;
 *     pasteConfirmOpen: boolean;
 *     deleteConfirmOpen: boolean;
 *     jumpUrlOpen: boolean;
 *     sortMenuOpen: boolean;
 *     zipModalOpen: boolean;
 *     failureModalOpen: boolean;
 *     dropdownOpen: boolean;
 *     renameOpen: boolean;
 *     createOpen: boolean;
 *     propertiesOpen: boolean;
 *     contextMenuOpen: boolean;
 *     showTree: boolean;
 *     showHidden: boolean;
 *     showSize: boolean;
 *     showTime: boolean;
 *     searchActive: boolean;
 *     currentPath: string;
 *     dropdownMode: string;
 *     entries: unknown[];
 *     focusedIndex: number;
 *     listRows: number;
 *     selectedPaths: string[];
 *     jumpList: unknown[];
 *     pathHistory: string[];
 *     menuOpen: string;
 *     menuBarEl: HTMLElement | null;
 *   }) | {
 *     listEl: HTMLElement | null;
 *     pathInputEl: HTMLInputElement | null;
 *     treeEl: HTMLElement | null;
 *     dropdownEl: HTMLElement | null;
 *     contextMenuEl: HTMLElement | null;
 *     pasteConfirmOpen: boolean;
 *     deleteConfirmOpen: boolean;
 *     jumpUrlOpen: boolean;
 *     sortMenuOpen: boolean;
 *     zipModalOpen: boolean;
 *     failureModalOpen: boolean;
 *     dropdownOpen: boolean;
 *     renameOpen: boolean;
 *     createOpen: boolean;
 *     propertiesOpen: boolean;
 *     contextMenuOpen: boolean;
 *     showTree: boolean;
 *     showHidden: boolean;
 *     showSize: boolean;
 *     showTime: boolean;
 *     searchActive: boolean;
 *     currentPath: string;
 *     dropdownMode: string;
 *     entries: unknown[];
 *     focusedIndex: number;
 *     listRows: number;
 *     selectedPaths: string[];
 *     jumpList: unknown[];
 *     pathHistory: string[];
 *     menuOpen: string;
 *     menuBarEl: HTMLElement | null;
 *   };
 *   actions: (() => Record<string, (...args: any[]) => any>) | Record<string, (...args: any[]) => any>;
 *   helpers: (() => {
 *     handleGlobalKey: (event: KeyboardEvent, ctx: any) => boolean;
 *     t: (key: string, params?: Record<string, string | number>) => string;
 *     confirm: (question: string) => Promise<boolean>;
 *     eventToKeyString: (event: KeyboardEvent) => string;
 *     normalizeKeyString: (value: string) => string;
 *   }) | {
 *     handleGlobalKey: (event: KeyboardEvent, ctx: any) => boolean;
 *     t: (key: string, params?: Record<string, string | number>) => string;
 *     confirm: (question: string) => Promise<boolean>;
 *     eventToKeyString: (event: KeyboardEvent) => string;
 *     normalizeKeyString: (value: string) => string;
 *   };
 *   constants: {
 *     KEYMAP_ACTIONS: Record<string, string>;
 *   };
 * }} params
 */

export type DomHandlersInputsFromVars = Record<string, any>;
