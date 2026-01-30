import * as vscode from "vscode";
import { getColors } from "./config";

let legendViewProvider: LegendViewProvider | undefined;

class LegendViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = "whyReactCodeLooksLikeThatLegend";
  private _view?: vscode.WebviewView;
  private _onTurnOff?: () => void;

  constructor(private readonly _extensionUri: vscode.Uri) {}

  setOnTurnOff(callback: () => void) {
    this._onTurnOff = callback;
  }

  resolveWebviewView(webviewView: vscode.WebviewView) {
    this._view = webviewView;
    webviewView.webview.options = { enableScripts: true };
    webviewView.webview.html = getLegendHtml();

    webviewView.webview.onDidReceiveMessage((message) => {
      if (message.command === "turnOff" && this._onTurnOff) {
        this._onTurnOff();
      } else if (message.command === "openAbout") {
        vscode.env.openExternal(
          vscode.Uri.parse("https://marketplace.visualstudio.com/items?itemName=dfrancour.why-react-code-looks-like-that")
        );
      }
    });
  }
}

export function registerLegendView(context: vscode.ExtensionContext): void {
  legendViewProvider = new LegendViewProvider(context.extensionUri);
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      LegendViewProvider.viewType,
      legendViewProvider
    )
  );
}

export function showLegend(
  context: vscode.ExtensionContext,
  onTurnOff: () => void
): void {
  if (legendViewProvider) {
    legendViewProvider.setOnTurnOff(onTurnOff);
  }
  vscode.commands.executeCommand("whyReactCodeLooksLikeThatLegend.focus");
}

export function hideLegend(): void {
  // View hides automatically via "when": "whyReactCodeLooksLikeThatActive" context
}

function getLegendHtml(): string {
  const colors = getColors();

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Why React Code Looks Like That</title>
  <style>
    body {
      font-family: var(--vscode-font-family);
      padding: 10px;
      color: var(--vscode-foreground);
      background-color: var(--vscode-editor-background);
    }
    .legend-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
      margin-bottom: 12px;
    }
    .legend-item {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .color-box {
      width: 14px;
      height: 14px;
      border-radius: 2px;
      flex-shrink: 0;
    }
    .label {
      font-size: 12px;
    }
    button {
      width: 100%;
      padding: 6px 10px;
      background-color: var(--vscode-button-background);
      color: var(--vscode-button-foreground);
      border: none;
      border-radius: 3px;
      cursor: pointer;
      font-size: 12px;
    }
    button:hover {
      background-color: var(--vscode-button-hoverBackground);
    }
    .button-group {
      display: flex;
      gap: 8px;
    }
    .secondary {
      background-color: var(--vscode-button-secondaryBackground);
      color: var(--vscode-button-secondaryForeground);
    }
    .secondary:hover {
      background-color: var(--vscode-button-secondaryHoverBackground);
    }
  </style>
</head>
<body>
  <div class="legend-grid">
    <div class="legend-item">
      <div class="color-box" style="background-color: ${colors.typescript}"></div>
      <span class="label">TypeScript</span>
    </div>
    <div class="legend-item">
      <div class="color-box" style="background-color: ${colors.jsx}"></div>
      <span class="label">JSX</span>
    </div>
    <div class="legend-item">
      <div class="color-box" style="background-color: ${colors.javascript}"></div>
      <span class="label">JavaScript</span>
    </div>
    <div class="legend-item">
      <div class="color-box" style="background-color: ${colors.react}"></div>
      <span class="label">React</span>
    </div>
  </div>
  <div class="button-group">
    <button id="turnOffBtn">Turn Off</button>
    <button id="aboutBtn" class="secondary">About</button>
  </div>
  <script>
    const vscode = acquireVsCodeApi();
    document.getElementById('turnOffBtn').addEventListener('click', () => {
      vscode.postMessage({ command: 'turnOff' });
    });
    document.getElementById('aboutBtn').addEventListener('click', () => {
      vscode.postMessage({ command: 'openAbout' });
    });
  </script>
</body>
</html>`;
}
