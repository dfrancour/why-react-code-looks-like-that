export type SyntaxLayer = "javascript" | "typescript" | "jsx" | "react";

export interface ClassifiedRegion {
  start: number;
  end: number;
  layer: SyntaxLayer;
}

export interface LayerColors {
  javascript: string;
  typescript: string;
  jsx: string;
  react: string;
}
