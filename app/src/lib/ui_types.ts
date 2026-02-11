import { KEYMAP_ACTIONS, SORT_MENU_KEYS } from "./ui_constants";

export type ActionId = (typeof KEYMAP_ACTIONS)[number]["id"];
export type MenuGroup = "file" | "edit" | "view" | "navigate" | "help";
export type SortKey = (typeof SORT_MENU_KEYS)[number];
export type Theme = "light" | "dark";
