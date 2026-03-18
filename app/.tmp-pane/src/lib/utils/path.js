"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getParentPath = getParentPath;
/**
 * @param {string} path
 */
function getParentPath(path) {
    if (!path)
        return "";
    if (/^[A-Za-z]:[\\\/]?$/.test(path))
        return "";
    if (path === "/")
        return "";
    const trimmed = path.replace(/[\\\/]+$/, "");
    const parent = trimmed.replace(/[\\\/][^\\\/]+$/, "");
    if (/^[A-Za-z]:$/.test(parent))
        return `${parent}\\`;
    if (parent === "" && trimmed.startsWith("/"))
        return "/";
    return parent && parent !== trimmed ? parent : "";
}
