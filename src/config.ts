import * as vscode from "vscode";
import type { LayerColors } from "./types";

const DEFAULT_COLORS: LayerColors = {
  javascript: "#f59e0b", // amber
  react: "#10b981", // emerald
  jsx: "#8b5cf6", // violet
  typescript: "#3b82f6", // blue
};

export function getColors(): LayerColors {
  const config = vscode.workspace.getConfiguration("whyReactCodeLooksLikeThat.colors");

  return {
    javascript: config.get("javascript") ?? DEFAULT_COLORS.javascript,
    typescript: config.get("typescript") ?? DEFAULT_COLORS.typescript,
    jsx: config.get("jsx") ?? DEFAULT_COLORS.jsx,
    react: config.get("react") ?? DEFAULT_COLORS.react,
  };
}
