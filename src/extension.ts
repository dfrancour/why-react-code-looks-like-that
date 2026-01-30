import * as vscode from "vscode";
import { classifyDocument } from "./classifier";
import {
  applyDecorations,
  clearAllDecorations,
  createDecorationTypes,
  disposeDecorationTypes,
  type DecorationTypes,
} from "./decorator";
import { getColors } from "./config";
import { registerLegendView, showLegend } from "./legend";

let decorationTypes: DecorationTypes;
let isActive = false;

export function activate(context: vscode.ExtensionContext) {
  decorationTypes = createDecorationTypes(getColors());
  registerLegendView(context);

  // Helper to turn off highlighting
  const turnOffHighlighting = () => {
    isActive = false;
    clearAllDecorations(decorationTypes);
    vscode.commands.executeCommand("setContext", "whyReactCodeLooksLikeThatActive", false);
  };

  // Toggle command
  const toggleCmd = vscode.commands.registerCommand("why-react-code-looks-like-that.toggle", () => {
    isActive = !isActive;
    if (isActive) {
      updateDecorations();
      vscode.commands.executeCommand("setContext", "whyReactCodeLooksLikeThatActive", true);
      showLegend(context, turnOffHighlighting);
    } else {
      turnOffHighlighting();
    }
  });

  // Re-decorate on editor change
  const editorChange = vscode.window.onDidChangeActiveTextEditor((editor) => {
    if (isActive && editor) {
      updateDecorations();
    }
  });

  // Re-decorate on document change (debounced)
  let timeout: ReturnType<typeof setTimeout> | undefined;
  const docChange = vscode.workspace.onDidChangeTextDocument((event) => {
    if (
      isActive &&
      event.document === vscode.window.activeTextEditor?.document
    ) {
      if (timeout) {clearTimeout(timeout);}
      timeout = setTimeout(updateDecorations, 300);
    }
  });

  // Re-create decoration types when configuration changes
  const configChange = vscode.workspace.onDidChangeConfiguration((event) => {
    if (event.affectsConfiguration("whyReactCodeLooksLikeThat.colors")) {
      disposeDecorationTypes(decorationTypes);
      decorationTypes = createDecorationTypes(getColors());
      if (isActive) {
        updateDecorations();
      }
    }
  });

  context.subscriptions.push(toggleCmd, editorChange, docChange, configChange);
}

function updateDecorations() {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {return;}

  const fileName = editor.document.fileName;
  if (!fileName.match(/\.(tsx|jsx)$/)) {return;}

  const regions = classifyDocument(editor.document.getText());
  applyDecorations(editor, regions, decorationTypes);
}

export function deactivate() {
  if (decorationTypes) {
    disposeDecorationTypes(decorationTypes);
  }
}
