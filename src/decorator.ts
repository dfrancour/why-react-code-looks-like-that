import * as vscode from "vscode";
import type { ClassifiedRegion, SyntaxLayer, LayerColors } from "./types";

export type DecorationTypes = Record<SyntaxLayer, vscode.TextEditorDecorationType>;

export function createDecorationTypes(colors: LayerColors): DecorationTypes {
  return {
    javascript: vscode.window.createTextEditorDecorationType({
      color: colors.javascript,
    }),
    typescript: vscode.window.createTextEditorDecorationType({
      color: colors.typescript,
    }),
    jsx: vscode.window.createTextEditorDecorationType({
      color: colors.jsx,
    }),
    react: vscode.window.createTextEditorDecorationType({
      color: colors.react,
    }),
  };
}

export function disposeDecorationTypes(decorationTypes: DecorationTypes): void {
  for (const type of Object.values(decorationTypes)) {
    type.dispose();
  }
}

export function applyDecorations(
  editor: vscode.TextEditor,
  regions: ClassifiedRegion[],
  decorationTypes: DecorationTypes
): void {
  const decorations: Record<SyntaxLayer, vscode.DecorationOptions[]> = {
    javascript: [],
    typescript: [],
    jsx: [],
    react: [],
  };

  for (const region of regions) {
    const startPos = editor.document.positionAt(region.start);
    const endPos = editor.document.positionAt(region.end);
    decorations[region.layer].push({
      range: new vscode.Range(startPos, endPos),
    });
  }

  for (const layer of Object.keys(decorations) as SyntaxLayer[]) {
    editor.setDecorations(decorationTypes[layer], decorations[layer]);
  }
}

export function clearDecorations(
  editor: vscode.TextEditor | undefined,
  decorationTypes: DecorationTypes
): void {
  if (!editor) {return;}
  for (const type of Object.values(decorationTypes)) {
    editor.setDecorations(type, []);
  }
}

export function clearAllDecorations(
  decorationTypes: DecorationTypes
): void {
  for (const editor of vscode.window.visibleTextEditors) {
    for (const type of Object.values(decorationTypes)) {
      editor.setDecorations(type, []);
    }
  }
}
