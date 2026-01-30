import * as ts from "typescript";
import type { ClassifiedRegion, SyntaxLayer } from "./types";

const REACT_HOOKS = new Set([
  "useState",
  "useEffect",
  "useContext",
  "useReducer",
  "useCallback",
  "useMemo",
  "useRef",
  "useImperativeHandle",
  "useLayoutEffect",
  "useDebugValue",
  "useDeferredValue",
  "useTransition",
  "useId",
  "useSyncExternalStore",
  "useInsertionEffect",
  "use", // React 19 - use(Promise) or use(Context)
]);

const REACT_TYPES = new Set([
  // Component types
  "FC",
  "FunctionComponent",
  "ComponentType",
  "ComponentClass",
  "ElementType",
  "ExoticComponent",
  "ForwardRefExoticComponent",
  "MemoExoticComponent",
  "LazyExoticComponent",
  // Element and node types
  "ReactNode",
  "ReactElement",
  "ReactChild",
  "ReactFragment",
  "ReactPortal",
  "ReactText",
  // JSX namespace types
  "Element",
  "IntrinsicElements",
  // Props helpers
  "PropsWithChildren",
  "PropsWithRef",
  "ComponentProps",
  "ComponentPropsWithRef",
  "ComponentPropsWithoutRef",
  // HTML/SVG attribute types
  "HTMLAttributes",
  "SVGAttributes",
  "HTMLProps",
  "CSSProperties",
  "DOMAttributes",
  "AriaAttributes",
  // Ref types
  "Ref",
  "RefObject",
  "MutableRefObject",
  "ForwardedRef",
  "LegacyRef",
  "RefCallback",
  "ElementRef",
  "ComponentRef",
  // Event types
  "SyntheticEvent",
  "ChangeEvent",
  "MouseEvent",
  "FormEvent",
  "KeyboardEvent",
  "FocusEvent",
  "DragEvent",
  "TouchEvent",
  "PointerEvent",
  "WheelEvent",
  "AnimationEvent",
  "TransitionEvent",
  "ClipboardEvent",
  "CompositionEvent",
  "UIEvent",
  // State types
  "Dispatch",
  "SetStateAction",
  "ReducerState",
  "ReducerAction",
  // Context types
  "Context",
  "Provider",
  "Consumer",
  // Special component types
  "Suspense",
  "SuspenseProps",
  "StrictMode",
  "Profiler",
  "ProfilerProps",
  "Fragment",
  // Key type
  "Key",
]);

// React utility functions (when imported directly, not via React.*)
const REACT_UTILS = new Set([
  "memo",
  "forwardRef",
  "lazy",
  "createContext",
  "createRef",
  "cloneElement",
  "isValidElement",
  "createElement",
  "Children",
  "Fragment",
  "Suspense",
  "StrictMode",
  "Profiler",
]);

// React-specific JSX attribute names
const REACT_JSX_ATTRIBUTES = new Set(["key", "ref"]);

// React Server Components directives (appear as string literals at top of file)
const REACT_DIRECTIVES = new Set(["use client", "use server"]);

// Priority: higher number wins when regions overlap
const PRIORITY: Record<SyntaxLayer, number> = {
  javascript: 1,
  jsx: 2,
  typescript: 3,
  react: 4,
};

interface RawRegion {
  start: number;
  end: number;
  layer: SyntaxLayer;
  priority: number;
}

/**
 * Find the colon token in a node's children.
 * Returns the position of the colon, or null if not found.
 */
function findColonToken(
  node: ts.Node,
  sourceFile: ts.SourceFile
): ts.Node | null {
  const children = node.getChildren(sourceFile);
  return (
    children.find((c) => c.kind === ts.SyntaxKind.ColonToken) ?? null
  );
}

/**
 * Find the opening '<' bracket by scanning backwards from a position.
 * Returns the position of '<', or -1 if not found.
 */
function findOpeningBracket(sourceText: string, beforePos: number): number {
  let pos = beforePos;
  while (pos > 0 && sourceText[pos] !== '<') {
    pos--;
  }
  return sourceText[pos] === '<' ? pos : -1;
}

/**
 * Find the matching closing bracket for an opening '<', handling nested brackets.
 * Returns the position of the closing '>', or -1 if not found.
 */
function findMatchingCloseBracket(
  sourceText: string,
  openBracketPos: number
): number {
  let depth = 1;
  let pos = openBracketPos + 1;
  while (pos < sourceText.length && depth > 0) {
    const char = sourceText[pos];
    if (char === '<') {
      depth++;
    } else if (char === '>') {
      depth--;
    }
    pos++;
  }
  return depth === 0 ? pos - 1 : -1;
}

/**
 * Find the full range of a type parameter list including angle brackets: <T, U>
 * Returns [start, end] positions or null if not found.
 */
function findTypeParameterListRange(
  typeParameters: ts.NodeArray<ts.TypeParameterDeclaration>,
  sourceText: string,
  sourceFile: ts.SourceFile
): [number, number] | null {
  if (typeParameters.length === 0) {return null;}

  const firstParam = typeParameters[0];

  // Find opening < before first param
  const openBracket = findOpeningBracket(sourceText, firstParam.getStart(sourceFile) - 1);
  if (openBracket === -1) {return null;}

  // Find matching closing > (handles nested brackets like <T extends Map<K, V>>)
  const closeBracket = findMatchingCloseBracket(sourceText, openBracket);
  if (closeBracket === -1) {return null;}

  return [openBracket, closeBracket + 1];
}

export function classifyDocument(sourceText: string): ClassifiedRegion[] {
  const sourceFile = ts.createSourceFile(
    "temp.tsx",
    sourceText,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX
  );

  const rawRegions: RawRegion[] = [];

  // Track enum names defined in this file for member access detection
  const enumNames = new Set<string>();

  function addRegion(start: number, end: number, layer: SyntaxLayer) {
    if (start < end) {
      rawRegions.push({ start, end, layer, priority: PRIORITY[layer] });
    }
  }

  function visit(node: ts.Node) {
    // === SPECIAL CASES (handle structure, then recurse manually) ===

    // Misparsed generic arrow function: <T>(arg: T) => arg
    // In TSX, TypeScript parses bare <T> as JSX. Detect and reclassify.
    if (ts.isJsxElement(node)) {
      const opening = node.openingElement;
      if (
        ts.isIdentifier(opening.tagName) &&
        opening.attributes.properties.length === 0 &&
        node.children.length > 0 &&
        ts.isJsxText(node.children[0]) &&
        node.children[0].getText(sourceFile).includes("=>")
      ) {
        // Mark <T> as TypeScript, rest as JavaScript
        addRegion(node.getStart(sourceFile), opening.getEnd(), "typescript");
        addRegion(opening.getEnd(), node.getEnd(), "javascript");
        // Recurse into children in case there's real JSX nested inside
        for (let i = 1; i < node.children.length; i++) {
          visit(node.children[i]);
        }
        return;
      }
    }

    // JSX Self-closing element: <Foo attr={value} /> or <Foo<T> attr={value} />
    // Only mark < tagName /> as JSX, let attributes be classified separately
    if (ts.isJsxSelfClosingElement(node)) {
      const start = node.getStart(sourceFile);
      const tagName = node.tagName;
      const end = node.getEnd();

      // Check if tagName is React.* (e.g., React.Fragment)
      if (ts.isPropertyAccessExpression(tagName) &&
          ts.isIdentifier(tagName.expression) &&
          tagName.expression.text === "React") {
        // Mark '<' as JSX
        addRegion(start, start + 1, "jsx");
        // Mark 'React.Fragment' (or similar) as React
        addRegion(tagName.getStart(sourceFile), tagName.getEnd(), "react");
      } else {
        // Mark '<' and tagName as JSX
        addRegion(start, tagName.getEnd(), "jsx");
      }

      // Handle type arguments: <Component<Props> />
      if (node.typeArguments && node.typeArguments.length > 0) {
        const firstTypeArg = node.typeArguments[0];
        const openBracket = findOpeningBracket(sourceText, firstTypeArg.getStart(sourceFile) - 1);
        if (openBracket !== -1) {
          const closeBracket = findMatchingCloseBracket(sourceText, openBracket);
          if (closeBracket !== -1) {
            addRegion(openBracket, closeBracket + 1, "typescript");
          }
        }
      }

      // Mark '/>' at the end as JSX
      addRegion(end - 2, end, "jsx");

      // Recurse into attributes (they'll be handled by JsxAttribute handler)
      ts.forEachChild(node, visit);
      return;
    }

    // JSX Opening element: <Foo attr={value}> or <Foo<T> attr={value}>
    // Only mark < tagName > as JSX, let attributes be classified separately
    if (ts.isJsxOpeningElement(node)) {
      const start = node.getStart(sourceFile);
      const tagName = node.tagName;
      const end = node.getEnd();

      // Check if tagName is React.* (e.g., React.Fragment)
      if (ts.isPropertyAccessExpression(tagName) &&
          ts.isIdentifier(tagName.expression) &&
          tagName.expression.text === "React") {
        // Mark '<' as JSX
        addRegion(start, start + 1, "jsx");
        // Mark 'React.Fragment' (or similar) as React
        addRegion(tagName.getStart(sourceFile), tagName.getEnd(), "react");
      } else {
        // Mark '<' and tagName as JSX
        addRegion(start, tagName.getEnd(), "jsx");
      }

      // Handle type arguments: <Component<Props>>
      if (node.typeArguments && node.typeArguments.length > 0) {
        const firstTypeArg = node.typeArguments[0];
        const openBracket = findOpeningBracket(sourceText, firstTypeArg.getStart(sourceFile) - 1);
        if (openBracket !== -1) {
          const closeBracket = findMatchingCloseBracket(sourceText, openBracket);
          if (closeBracket !== -1) {
            addRegion(openBracket, closeBracket + 1, "typescript");
          }
        }
      }

      // Mark '>' at the end as JSX
      addRegion(end - 1, end, "jsx");

      // Recurse into attributes
      ts.forEachChild(node, visit);
      return;
    }

    // JSX Closing element: </Foo>
    if (ts.isJsxClosingElement(node)) {
      const start = node.getStart(sourceFile);
      const tagName = node.tagName;
      const end = node.getEnd();

      // Check if tagName is React.* (e.g., React.Fragment)
      if (ts.isPropertyAccessExpression(tagName) &&
          ts.isIdentifier(tagName.expression) &&
          tagName.expression.text === "React") {
        // Mark '</' as JSX
        addRegion(start, start + 2, "jsx");
        // Mark 'React.Fragment' (or similar) as React
        addRegion(tagName.getStart(sourceFile), tagName.getEnd(), "react");
        // Mark '>' as JSX
        addRegion(end - 1, end, "jsx");
      } else {
        // Mark the whole thing as JSX
        addRegion(start, end, "jsx");
      }
      return;
    }

    // JSX Expression: {content} - braces are JSX, content is classified separately
    if (ts.isJsxExpression(node)) {
      const start = node.getStart(sourceFile);
      const end = node.getEnd();
      // Opening brace is JSX
      addRegion(start, start + 1, "jsx");
      // Closing brace is JSX (if present - might be missing in incomplete code)
      if (sourceText[end - 1] === "}") {
        addRegion(end - 1, end, "jsx");
      }
      // Let the expression inside be classified by recursion
      ts.forEachChild(node, visit);
      return;
    }

    // JSX Spread Attribute: {...props} or { ...props }
    // The braces and spread are JSX, the expression inside is JavaScript
    if (ts.isJsxSpreadAttribute(node)) {
      const start = node.getStart(sourceFile);
      const end = node.getEnd();
      // Find the actual position of '...' by scanning from the opening brace
      // The spread operator could have whitespace after the brace: { ...props }
      let spreadStart = start + 1; // skip '{'
      while (spreadStart < end && /\s/.test(sourceText[spreadStart])) {
        spreadStart++;
      }
      // Mark opening brace, any whitespace, and spread operator '{...' or '{ ...' as JSX
      const spreadEnd = spreadStart + 3; // '...' is 3 characters
      addRegion(start, spreadEnd, "jsx");
      // Closing brace is JSX
      addRegion(end - 1, end, "jsx");
      // The expression inside is classified by recursion
      ts.forEachChild(node, visit);
      return;
    }

    // JSX Attribute: special handling for React-specific attributes like 'key'
    // Structure: name = initializer (initializer is StringLiteral or JsxExpression)
    if (ts.isJsxAttribute(node)) {
      const nameNode = node.name;
      const nameEnd = nameNode.getEnd();

      if (ts.isIdentifier(nameNode)) {
        if (REACT_JSX_ATTRIBUTES.has(nameNode.text)) {
          // 'key' and 'ref' are React concepts
          addRegion(nameNode.getStart(sourceFile), nameEnd, "react");
        } else {
          // Other attribute names are JSX
          addRegion(nameNode.getStart(sourceFile), nameEnd, "jsx");
        }
      }

      // Handle the initializer (value)
      const initializer = node.initializer;
      if (initializer) {
        // Mark the '=' between name and value as JSX
        addRegion(nameEnd, initializer.getStart(sourceFile), "jsx");

        if (ts.isStringLiteral(initializer)) {
          // String literal values like ".jsx" are JSX syntax
          addRegion(initializer.getStart(sourceFile), initializer.getEnd(), "jsx");
        } else if (ts.isJsxExpression(initializer)) {
          // JsxExpression {value} - let it be handled by JsxExpression handler
          visit(initializer);
        }
      }
      return;
    }

    // Decorators: @Component({ ... }) or @injectable
    // Decorators are TypeScript (experimental) / JS stage 3 proposal
    // We classify them as TypeScript since they require TS config to use
    if (ts.isDecorator(node)) {
      addRegion(node.getStart(sourceFile), node.getEnd(), "typescript");
      return;
    }

    // Directive prologues: "use client", "use server", "use strict"
    // These are expression statements containing just a string literal
    if (ts.isExpressionStatement(node) && ts.isStringLiteral(node.expression)) {
      const directive = node.expression.text;
      if (REACT_DIRECTIVES.has(directive)) {
        addRegion(node.getStart(sourceFile), node.getEnd(), "react");
        return;
      }
      // "use strict" and other directives are JavaScript
      addRegion(node.getStart(sourceFile), node.getEnd(), "javascript");
      return;
    }

    // Variable statements with 'declare' modifier: declare const x: string;
    // Also handles 'using' and 'await using' declarations (TS 5.2+)
    if (ts.isVariableStatement(node)) {
      const hasDeclare = node.modifiers?.some(
        m => m.kind === ts.SyntaxKind.DeclareKeyword
      );
      if (hasDeclare) {
        // Ambient declaration - entire thing is TypeScript
        addRegion(node.getStart(sourceFile), node.getEnd(), "typescript");
        return;
      }
      // Check for 'using' or 'await using' declarations (TS 5.2+)
      // NodeFlags.Using = 4, NodeFlags.AwaitUsing = 6 (Using | Const)
      // We only need to check the Using bit since AwaitUsing includes it
      const flags = node.declarationList.flags;
      const isUsingDeclaration = (flags & ts.NodeFlags.Using) !== 0;
      if (isUsingDeclaration) {
        // 'using' and 'await using' are TypeScript (currently)
        // Mark the 'using' or 'await using' keyword as TypeScript
        const declStart = node.declarationList.getStart(sourceFile);
        const firstDecl = node.declarationList.declarations[0];
        if (firstDecl) {
          addRegion(declStart, firstDecl.getStart(sourceFile), "typescript");
        }
        // Rest is JavaScript
        addRegion(node.getStart(sourceFile), node.getEnd(), "javascript");
        ts.forEachChild(node, visit);
        return;
      }
      // Regular variable statement - classify as JavaScript
      addRegion(node.getStart(sourceFile), node.getEnd(), "javascript");
      ts.forEachChild(node, visit);
      return;
    }

    // Interface declarations: interface Foo<T> { ... }
    // Mark the whole thing as TypeScript, but recurse to find React types within
    if (ts.isInterfaceDeclaration(node)) {
      addRegion(node.getStart(sourceFile), node.getEnd(), "typescript");
      // Recurse to find React types (e.g., extends HTMLAttributes<...>)
      // React types have higher priority and will override TypeScript where found
      ts.forEachChild(node, visit);
      return;
    }

    // Type alias declarations: type Foo<T> = ...
    if (ts.isTypeAliasDeclaration(node)) {
      addRegion(node.getStart(sourceFile), node.getEnd(), "typescript");
      // Recurse to find React types (e.g., ComponentProps<typeof Button>)
      // React types have higher priority and will override TypeScript where found
      ts.forEachChild(node, visit);
      return;
    }

    // Enum declarations: enum Status { Active, Inactive }
    // Track enum names for member access detection
    if (ts.isEnumDeclaration(node)) {
      if (node.name) {
        enumNames.add(node.name.text);
      }
      addRegion(node.getStart(sourceFile), node.getEnd(), "typescript");
      return;
    }

    // Module declarations: declare module 'foo' { ... } or namespace Foo { ... }
    if (ts.isModuleDeclaration(node)) {
      // Module/namespace declarations are TypeScript-only
      addRegion(node.getStart(sourceFile), node.getEnd(), "typescript");
      return;
    }

    // ExpressionWithTypeArguments: used in extends/implements clauses AND instantiation expressions
    // Heritage clause: interface Props extends HTMLAttributes<HTMLDivElement>
    // Instantiation expression (TS 4.7+): const StringSet = Set<string>;
    if (ts.isExpressionWithTypeArguments(node)) {
      const expr = node.expression;
      if (ts.isIdentifier(expr) && REACT_TYPES.has(expr.text)) {
        // Mark the expression (type name) as React
        addRegion(expr.getStart(sourceFile), expr.getEnd(), "react");
      }
      // Mark type arguments as TypeScript (handles both heritage clauses and instantiation expressions)
      if (node.typeArguments && node.typeArguments.length > 0) {
        const firstTypeArg = node.typeArguments[0];
        const openBracket = findOpeningBracket(sourceText, firstTypeArg.getStart(sourceFile) - 1);
        if (openBracket !== -1) {
          const closeBracket = findMatchingCloseBracket(sourceText, openBracket);
          if (closeBracket !== -1) {
            addRegion(openBracket, closeBracket + 1, "typescript");
          }
        }
      }
      // Let recursion handle the contents
      ts.forEachChild(node, visit);
      return;
    }

    // Class declarations: class Foo<T> extends Bar<U> { ... }
    // Also handles: declare class Foo { ... } and abstract class Foo { ... }
    if (ts.isClassDeclaration(node)) {
      const hasDeclare = node.modifiers?.some(
        m => m.kind === ts.SyntaxKind.DeclareKeyword
      );
      if (hasDeclare) {
        // Ambient declaration - entire thing is TypeScript
        addRegion(node.getStart(sourceFile), node.getEnd(), "typescript");
        return;
      }
      addRegion(node.getStart(sourceFile), node.getEnd(), "javascript");

      // Handle 'abstract' keyword - TypeScript only
      if (node.modifiers) {
        for (const modifier of node.modifiers) {
          if (modifier.kind === ts.SyntaxKind.AbstractKeyword) {
            addRegion(modifier.getStart(sourceFile), modifier.getEnd(), "typescript");
          }
        }
      }
      // Type parameters: <T, U>
      if (node.typeParameters && node.typeParameters.length > 0) {
        const range = findTypeParameterListRange(node.typeParameters, sourceText, sourceFile);
        if (range) {
          addRegion(range[0], range[1], "typescript");
        }
      }
      // Heritage clauses with type args: extends Bar<T>, implements Baz<T>
      if (node.heritageClauses) {
        for (const clause of node.heritageClauses) {
          for (const type of clause.types) {
            if (type.typeArguments && type.typeArguments.length > 0) {
              const firstArg = type.typeArguments[0];
              const openBracket = findOpeningBracket(sourceText, firstArg.getStart(sourceFile) - 1);
              if (openBracket !== -1) {
                const closeBracket = findMatchingCloseBracket(sourceText, openBracket);
                if (closeBracket !== -1) {
                  addRegion(openBracket, closeBracket + 1, "typescript");
                }
              }
            }
          }
        }
      }
      ts.forEachChild(node, visit);
      return;
    }

    // TypeScript 'as' expression: expr as Type
    // Only mark the 'as Type' part as TypeScript, let expression be classified normally
    if (ts.isAsExpression(node)) {
      // Mark expression part as JavaScript
      addRegion(node.expression.getStart(sourceFile), node.expression.getEnd(), "javascript");
      // Mark 'as Type' part as TypeScript
      addRegion(node.expression.getEnd(), node.getEnd(), "typescript");
      // Let the expression be classified by recursion (may have nested types etc)
      visit(node.expression);
      return;
    }

    // TypeScript angle-bracket type assertion: <Type>expr (old-style syntax)
    // Mark the '<Type>' part as TypeScript, let expression be classified normally
    if (ts.isTypeAssertionExpression(node)) {
      const start = node.getStart(sourceFile);
      const exprStart = node.expression.getStart(sourceFile);
      // Mark '<Type>' as TypeScript (from start to where expression begins)
      addRegion(start, exprStart, "typescript");
      // Mark expression part as JavaScript
      addRegion(exprStart, node.expression.getEnd(), "javascript");
      // Let the expression be classified by recursion
      visit(node.expression);
      return;
    }

    // TypeScript 'satisfies' expression: expr satisfies Type
    // Only mark the 'satisfies Type' part as TypeScript
    if (ts.isSatisfiesExpression(node)) {
      // Mark expression part as JavaScript
      addRegion(node.expression.getStart(sourceFile), node.expression.getEnd(), "javascript");
      // Mark 'satisfies Type' part as TypeScript
      addRegion(node.expression.getEnd(), node.getEnd(), "typescript");
      // Let the expression be classified by recursion
      visit(node.expression);
      return;
    }

    // TypeScript non-null assertion: expr!
    // Only mark the '!' as TypeScript, let expression be classified normally
    if (ts.isNonNullExpression(node)) {
      // Mark expression part as JavaScript
      addRegion(node.expression.getStart(sourceFile), node.expression.getEnd(), "javascript");
      // Mark just the '!' as TypeScript (it's at the end)
      addRegion(node.getEnd() - 1, node.getEnd(), "typescript");
      // Let the expression be classified by recursion
      visit(node.expression);
      return;
    }

    // === TYPE ANNOTATION HANDLING ===
    // Capture the colon along with the type for complete `: Type` highlighting

    // Variable declarations: const x: string = ...
    if (ts.isVariableDeclaration(node) && node.type) {
      addRegion(node.getStart(sourceFile), node.getEnd(), "javascript");
      const colonToken = findColonToken(node, sourceFile);
      if (colonToken) {
        addRegion(colonToken.getStart(sourceFile), node.type.getEnd(), "typescript");
      }
      ts.forEachChild(node, visit);
      return;
    }

    // Parameters: (x: string) or (x?: string) or (public x: string)
    if (ts.isParameter(node)) {
      addRegion(node.getStart(sourceFile), node.getEnd(), "javascript");

      // Handle access modifiers (public, private, protected, readonly) - TypeScript only
      if (node.modifiers) {
        for (const modifier of node.modifiers) {
          if (modifier.kind === ts.SyntaxKind.PublicKeyword ||
              modifier.kind === ts.SyntaxKind.PrivateKeyword ||
              modifier.kind === ts.SyntaxKind.ProtectedKeyword ||
              modifier.kind === ts.SyntaxKind.ReadonlyKeyword) {
            addRegion(modifier.getStart(sourceFile), modifier.getEnd(), "typescript");
          }
        }
      }

      // Handle type annotation
      if (node.type) {
        const colonToken = findColonToken(node, sourceFile);
        if (colonToken) {
          // Include question token if present: x?: string
          const start = node.questionToken
            ? node.questionToken.getStart(sourceFile)
            : colonToken.getStart(sourceFile);
          addRegion(start, node.type.getEnd(), "typescript");
        }
      }
      ts.forEachChild(node, visit);
      return;
    }

    // Property signatures in interfaces: { prop: string }
    // Note: No JavaScript base - interfaces are entirely TypeScript
    if (ts.isPropertySignature(node) && node.type) {
      const colonToken = findColonToken(node, sourceFile);
      if (colonToken) {
        const start = node.questionToken
          ? node.questionToken.getStart(sourceFile)
          : colonToken.getStart(sourceFile);
        addRegion(start, node.type.getEnd(), "typescript");
      }
      ts.forEachChild(node, visit);
      return;
    }

    // Property declarations in classes: class { prop: string }
    // Also handles auto-accessors: class { accessor name = ""; }
    if (ts.isPropertyDeclaration(node)) {
      addRegion(node.getStart(sourceFile), node.getEnd(), "javascript");

      // Handle access modifiers (public, private, protected, readonly, abstract, accessor) - TypeScript only
      if (node.modifiers) {
        for (const modifier of node.modifiers) {
          if (modifier.kind === ts.SyntaxKind.PublicKeyword ||
              modifier.kind === ts.SyntaxKind.PrivateKeyword ||
              modifier.kind === ts.SyntaxKind.ProtectedKeyword ||
              modifier.kind === ts.SyntaxKind.ReadonlyKeyword ||
              modifier.kind === ts.SyntaxKind.AbstractKeyword ||
              modifier.kind === ts.SyntaxKind.AccessorKeyword) {
            addRegion(modifier.getStart(sourceFile), modifier.getEnd(), "typescript");
          }
        }
      }

      // Handle type annotation
      if (node.type) {
        const colonToken = findColonToken(node, sourceFile);
        if (colonToken) {
          const start = node.questionToken
            ? node.questionToken.getStart(sourceFile)
            : colonToken.getStart(sourceFile);
          addRegion(start, node.type.getEnd(), "typescript");
        }
      }
      ts.forEachChild(node, visit);
      return;
    }

    // Function declarations: function foo<T>(): string
    // Also handles: declare function foo(): void;
    if (ts.isFunctionDeclaration(node)) {
      const hasDeclare = node.modifiers?.some(
        m => m.kind === ts.SyntaxKind.DeclareKeyword
      );
      if (hasDeclare) {
        // Ambient declaration - entire thing is TypeScript
        addRegion(node.getStart(sourceFile), node.getEnd(), "typescript");
        return;
      }
      // Mark entire function as JavaScript (base layer)
      addRegion(node.getStart(sourceFile), node.getEnd(), "javascript");
      // Return type: (): string (TypeScript wins via priority)
      if (node.type) {
        const colonToken = findColonToken(node, sourceFile);
        if (colonToken) {
          addRegion(colonToken.getStart(sourceFile), node.type.getEnd(), "typescript");
        }
      }
      // Type parameters: <T, U>
      if (node.typeParameters && node.typeParameters.length > 0) {
        const range = findTypeParameterListRange(node.typeParameters, sourceText, sourceFile);
        if (range) {
          addRegion(range[0], range[1], "typescript");
        }
      }
      ts.forEachChild(node, visit);
      return;
    }

    // Method declarations: class { method<T>(): string }
    if (ts.isMethodDeclaration(node)) {
      addRegion(node.getStart(sourceFile), node.getEnd(), "javascript");

      // Handle access modifiers (public, private, protected, abstract, override) - TypeScript only
      if (node.modifiers) {
        for (const modifier of node.modifiers) {
          if (modifier.kind === ts.SyntaxKind.PublicKeyword ||
              modifier.kind === ts.SyntaxKind.PrivateKeyword ||
              modifier.kind === ts.SyntaxKind.ProtectedKeyword ||
              modifier.kind === ts.SyntaxKind.AbstractKeyword ||
              modifier.kind === ts.SyntaxKind.OverrideKeyword) {
            addRegion(modifier.getStart(sourceFile), modifier.getEnd(), "typescript");
          }
        }
      }

      if (node.type) {
        const colonToken = findColonToken(node, sourceFile);
        if (colonToken) {
          addRegion(colonToken.getStart(sourceFile), node.type.getEnd(), "typescript");
        }
      }
      if (node.typeParameters && node.typeParameters.length > 0) {
        const range = findTypeParameterListRange(node.typeParameters, sourceText, sourceFile);
        if (range) {
          addRegion(range[0], range[1], "typescript");
        }
      }
      ts.forEachChild(node, visit);
      return;
    }

    // Arrow functions: <T>(x: T): T => x
    if (ts.isArrowFunction(node)) {
      addRegion(node.getStart(sourceFile), node.getEnd(), "javascript");
      if (node.type) {
        const colonToken = findColonToken(node, sourceFile);
        if (colonToken) {
          addRegion(colonToken.getStart(sourceFile), node.type.getEnd(), "typescript");
        }
      }
      if (node.typeParameters && node.typeParameters.length > 0) {
        const range = findTypeParameterListRange(node.typeParameters, sourceText, sourceFile);
        if (range) {
          addRegion(range[0], range[1], "typescript");
        }
      }
      ts.forEachChild(node, visit);
      return;
    }

    // Function expressions: function<T>(): string { }
    if (ts.isFunctionExpression(node)) {
      addRegion(node.getStart(sourceFile), node.getEnd(), "javascript");
      if (node.type) {
        const colonToken = findColonToken(node, sourceFile);
        if (colonToken) {
          addRegion(colonToken.getStart(sourceFile), node.type.getEnd(), "typescript");
        }
      }
      if (node.typeParameters && node.typeParameters.length > 0) {
        const range = findTypeParameterListRange(node.typeParameters, sourceText, sourceFile);
        if (range) {
          addRegion(range[0], range[1], "typescript");
        }
      }
      ts.forEachChild(node, visit);
      return;
    }

    // Import declarations: check for 'import type' (TypeScript-only syntax)
    if (ts.isImportDeclaration(node)) {
      if (node.importClause?.isTypeOnly) {
        // 'import type { ... }' - base is TypeScript
        addRegion(node.getStart(sourceFile), node.getEnd(), "typescript");
        // But check if any imported names are React types (higher priority)
        const namedBindings = node.importClause.namedBindings;
        if (namedBindings && ts.isNamedImports(namedBindings)) {
          for (const specifier of namedBindings.elements) {
            const importedName = specifier.name.text;
            if (REACT_TYPES.has(importedName)) {
              addRegion(specifier.name.getStart(sourceFile), specifier.name.getEnd(), "react");
            }
          }
        }
        return;
      }
      // Regular import is JavaScript
      addRegion(node.getStart(sourceFile), node.getEnd(), "javascript");
      // Check for individual type-only import specifiers: import { type Foo, Bar } from '...'
      const namedBindings = node.importClause?.namedBindings;
      if (namedBindings && ts.isNamedImports(namedBindings)) {
        for (const specifier of namedBindings.elements) {
          if (specifier.isTypeOnly) {
            // Mark the 'type' keyword as TypeScript
            const specStart = specifier.getStart(sourceFile);
            const nameStart = specifier.name.getStart(sourceFile);
            addRegion(specStart, nameStart, "typescript");
            // Check if the imported name is a React type
            const importedName = specifier.name.text;
            if (REACT_TYPES.has(importedName)) {
              addRegion(nameStart, specifier.name.getEnd(), "react");
            } else {
              addRegion(nameStart, specifier.name.getEnd(), "typescript");
            }
          }
        }
      }
      ts.forEachChild(node, visit);
      return;
    }

    // Export declarations: check for 'export type' (TypeScript-only syntax)
    if (ts.isExportDeclaration(node)) {
      if (node.isTypeOnly) {
        // 'export type { ... }' - base is TypeScript
        addRegion(node.getStart(sourceFile), node.getEnd(), "typescript");
        // But check if any exported names are React types (higher priority)
        const exportClause = node.exportClause;
        if (exportClause && ts.isNamedExports(exportClause)) {
          for (const specifier of exportClause.elements) {
            const exportedName = specifier.name.text;
            if (REACT_TYPES.has(exportedName)) {
              addRegion(specifier.name.getStart(sourceFile), specifier.name.getEnd(), "react");
            }
          }
        }
        return;
      }
      // Regular export is JavaScript
      addRegion(node.getStart(sourceFile), node.getEnd(), "javascript");
      // Check for individual type-only export specifiers: export { type Foo, Bar }
      const exportClause = node.exportClause;
      if (exportClause && ts.isNamedExports(exportClause)) {
        for (const specifier of exportClause.elements) {
          if (specifier.isTypeOnly) {
            // Mark the 'type' keyword as TypeScript
            const specStart = specifier.getStart(sourceFile);
            const nameStart = specifier.name.getStart(sourceFile);
            addRegion(specStart, nameStart, "typescript");
            // Check if the exported name is a React type
            const exportedName = specifier.name.text;
            if (REACT_TYPES.has(exportedName)) {
              addRegion(nameStart, specifier.name.getEnd(), "react");
            } else {
              addRegion(nameStart, specifier.name.getEnd(), "typescript");
            }
          }
        }
      }
      ts.forEachChild(node, visit);
      return;
    }

    // Get accessor with return type: get foo(): string
    if (ts.isGetAccessorDeclaration(node)) {
      addRegion(node.getStart(sourceFile), node.getEnd(), "javascript");
      if (node.type) {
        const colonToken = findColonToken(node, sourceFile);
        if (colonToken) {
          addRegion(colonToken.getStart(sourceFile), node.type.getEnd(), "typescript");
        }
      }
      ts.forEachChild(node, visit);
      return;
    }

    // Set accessor with parameter type: set foo(value: string)
    // Parameters are handled by the Parameter case above via recursion

    // Property access on enums: Status.Active - enums are TypeScript-only
    if (ts.isPropertyAccessExpression(node)) {
      const expr = node.expression;
      if (ts.isIdentifier(expr) && enumNames.has(expr.text)) {
        // Mark the entire enum member access as TypeScript
        addRegion(node.getStart(sourceFile), node.getEnd(), "typescript");
        return;
      }
      // Regular property access - continue to standard classification
    }

    // React.createElement(Component, ...) - mark component name as React
    if (ts.isCallExpression(node)) {
      const callee = node.expression.getText(sourceFile);

      // Handle type arguments on any call expression: foo<string>()
      // Mark the <...> portion as TypeScript
      if (node.typeArguments && node.typeArguments.length > 0) {
        const firstTypeArg = node.typeArguments[0];
        const openBracket = findOpeningBracket(sourceText, firstTypeArg.getStart(sourceFile) - 1);
        if (openBracket !== -1) {
          const closeBracket = findMatchingCloseBracket(sourceText, openBracket);
          if (closeBracket !== -1) {
            addRegion(openBracket, closeBracket + 1, "typescript");
          }
        }
      }

      // Hook calls: only the hook name is React, arguments are JS/TS
      if (REACT_HOOKS.has(callee)) {
        // Mark just the hook name as React
        addRegion(
          node.expression.getStart(sourceFile),
          node.expression.getEnd(),
          "react"
        );
        // Mark the parentheses and overall structure as JavaScript
        addRegion(node.getStart(sourceFile), node.getEnd(), "javascript");
        // Recurse to classify arguments (callbacks, deps arrays, etc.)
        ts.forEachChild(node, visit);
        return;
      }

      // React.useState, React.useEffect, React.use, etc. - qualified hook calls
      if (/^React\.use([A-Z]|$)/.test(callee)) {
        // Mark just 'React.useXxx' as React
        addRegion(
          node.expression.getStart(sourceFile),
          node.expression.getEnd(),
          "react"
        );
        // Mark the parentheses and overall structure as JavaScript
        addRegion(node.getStart(sourceFile), node.getEnd(), "javascript");
        // Recurse to classify arguments
        ts.forEachChild(node, visit);
        return;
      }

      // Bare React utility functions: memo(), forwardRef(), lazy(), createContext(), etc.
      // These are React when imported directly: import { memo } from 'react'
      if (REACT_UTILS.has(callee)) {
        // Mark just the function name as React
        addRegion(
          node.expression.getStart(sourceFile),
          node.expression.getEnd(),
          "react"
        );
        // Mark the parentheses and overall structure as JavaScript
        addRegion(node.getStart(sourceFile), node.getEnd(), "javascript");
        // Recurse to classify arguments
        ts.forEachChild(node, visit);
        return;
      }

      // React.createElement or React.* calls
      if (callee === "React.createElement" || callee === "createElement") {
        // Mark the callee as React
        addRegion(
          node.expression.getStart(sourceFile),
          node.expression.getEnd(),
          "react"
        );

        // First argument might be a component (PascalCase) or element ("div")
        const firstArg = node.arguments[0];
        if (firstArg) {
          if (ts.isIdentifier(firstArg) && isPascalCase(firstArg.text)) {
            // Component reference like AdminBadge
            addRegion(
              firstArg.getStart(sourceFile),
              firstArg.getEnd(),
              "react"
            );
          } else if (
            ts.isPropertyAccessExpression(firstArg) &&
            firstArg.expression.getText(sourceFile) === "React"
          ) {
            // React.Fragment
            addRegion(
              firstArg.getStart(sourceFile),
              firstArg.getEnd(),
              "react"
            );
          }
        }

        // Check for 'key' in props object (second argument)
        const propsArg = node.arguments[1];
        if (propsArg && ts.isObjectLiteralExpression(propsArg)) {
          for (const prop of propsArg.properties) {
            if (ts.isPropertyAssignment(prop) && ts.isIdentifier(prop.name)) {
              if (prop.name.text === "key") {
                addRegion(
                  prop.name.getStart(sourceFile),
                  prop.name.getEnd(),
                  "react"
                );
              }
            }
          }
        }

        // Let other parts be classified by recursion
        ts.forEachChild(node, visit);
        return;
      }

      // Other React.* calls (React.memo, React.forwardRef, React.createContext, etc.)
      // Only mark the callee as React, let arguments be classified normally
      if (callee.startsWith("React.")) {
        addRegion(
          node.expression.getStart(sourceFile),
          node.expression.getEnd(),
          "react"
        );
        // Mark overall structure as JavaScript
        addRegion(node.getStart(sourceFile), node.getEnd(), "javascript");
        // Recurse to classify arguments
        ts.forEachChild(node, visit);
        return;
      }

      // Regular call expression - classify as JS and recurse
      addRegion(node.getStart(sourceFile), node.getEnd(), "javascript");
      ts.forEachChild(node, visit);
      return;
    }

    // New expressions with type arguments: new Map<K, V>(), new Set<T>()
    if (ts.isNewExpression(node)) {
      addRegion(node.getStart(sourceFile), node.getEnd(), "javascript");

      // Handle type arguments: new Map<string, number>()
      if (node.typeArguments && node.typeArguments.length > 0) {
        const firstTypeArg = node.typeArguments[0];
        const openBracket = findOpeningBracket(sourceText, firstTypeArg.getStart(sourceFile) - 1);
        if (openBracket !== -1) {
          const closeBracket = findMatchingCloseBracket(sourceText, openBracket);
          if (closeBracket !== -1) {
            addRegion(openBracket, closeBracket + 1, "typescript");
          }
        }
      }

      ts.forEachChild(node, visit);
      return;
    }

    // === STANDARD CLASSIFICATIONS ===

    const layer = classifyNode(node, sourceFile);
    if (layer) {
      addRegion(node.getStart(sourceFile), node.getEnd(), layer);
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);

  // === COMMENT HANDLING ===
  // Comments are stored as trivia, not AST nodes. Extract them separately.
  collectComments(sourceFile, sourceText, addRegion);

  return resolveOverlaps(rawRegions, sourceText.length);
}

/**
 * Collect all comments in the source file and mark them as JavaScript.
 * Comments are trivia attached to tokens, not AST nodes themselves.
 */
function collectComments(
  sourceFile: ts.SourceFile,
  sourceText: string,
  addRegion: (start: number, end: number, layer: SyntaxLayer) => void
): void {
  // Walk through all nodes and collect their leading/trailing comments
  function visitForComments(node: ts.Node) {
    const nodeStart = node.getFullStart();
    const nodeTextStart = node.getStart(sourceFile);

    // Leading comments are between getFullStart() and getStart()
    if (nodeStart < nodeTextStart) {
      const leadingComments = ts.getLeadingCommentRanges(sourceText, nodeStart);
      if (leadingComments) {
        for (const comment of leadingComments) {
          addRegion(comment.pos, comment.end, "javascript");
        }
      }
    }

    // Trailing comments
    const trailingComments = ts.getTrailingCommentRanges(sourceText, node.getEnd());
    if (trailingComments) {
      for (const comment of trailingComments) {
        addRegion(comment.pos, comment.end, "javascript");
      }
    }

    ts.forEachChild(node, visitForComments);
  }

  visitForComments(sourceFile);
}

function isPascalCase(name: string): boolean {
  return /^[A-Z][a-zA-Z0-9]*$/.test(name);
}

/**
 * Resolve overlapping regions by priority.
 */
function resolveOverlaps(
  rawRegions: RawRegion[],
  textLength: number
): ClassifiedRegion[] {
  if (rawRegions.length === 0 || textLength === 0) {
    return [];
  }

  const positionMap: (SyntaxLayer | null)[] = new Array(textLength).fill(null);
  const priorityMap: number[] = new Array(textLength).fill(0);

  for (const region of rawRegions) {
    for (let i = region.start; i < region.end && i < textLength; i++) {
      if (region.priority > priorityMap[i]) {
        priorityMap[i] = region.priority;
        positionMap[i] = region.layer;
      }
    }
  }

  const result: ClassifiedRegion[] = [];
  let currentLayer: SyntaxLayer | null = null;
  let currentStart = 0;

  for (let i = 0; i < textLength; i++) {
    const layer = positionMap[i];

    if (layer !== currentLayer) {
      if (currentLayer !== null) {
        result.push({
          start: currentStart,
          end: i,
          layer: currentLayer,
        });
      }
      currentLayer = layer;
      currentStart = i;
    }
  }

  if (currentLayer !== null) {
    result.push({
      start: currentStart,
      end: textLength,
      layer: currentLayer,
    });
  }

  return result;
}

function classifyNode(
  node: ts.Node,
  sourceFile: ts.SourceFile
): SyntaxLayer | null {
  // TypeScript-specific nodes
  if (isTypeScriptNode(node)) {
    if (ts.isTypeReferenceNode(node)) {
      const typeName = node.typeName.getText(sourceFile);
      // React.*, JSX.*, or known React types
      if (typeName.startsWith("React.") || typeName.startsWith("JSX.") || REACT_TYPES.has(typeName)) {
        return "react";
      }
    }
    return "typescript";
  }

  // JSX structural nodes (but not JsxExpression - handled specially above)
  if (isJsxStructuralNode(node)) {
    return "jsx";
  }

  // Identifier 'React'
  if (ts.isIdentifier(node) && node.text === "React") {
    return "react";
  }

  // JavaScript nodes
  if (isJavaScriptNode(node)) {
    return "javascript";
  }

  return null;
}

function isTypeScriptNode(node: ts.Node): boolean {
  return (
    ts.isTypeAliasDeclaration(node) ||
    ts.isInterfaceDeclaration(node) ||
    ts.isTypeReferenceNode(node) ||
    ts.isTypeLiteralNode(node) ||
    // Note: AsExpression, SatisfiesExpression, NonNullExpression handled specially above
    ts.isEnumDeclaration(node) ||
    ts.isTypeParameterDeclaration(node) ||
    ts.isTypePredicateNode(node) ||
    ts.isTypeQueryNode(node) ||
    ts.isTypeOperatorNode(node) ||
    ts.isIndexedAccessTypeNode(node) ||
    ts.isMappedTypeNode(node) ||
    ts.isConditionalTypeNode(node) ||
    ts.isInferTypeNode(node) ||
    ts.isUnionTypeNode(node) ||
    ts.isIntersectionTypeNode(node) ||
    ts.isArrayTypeNode(node) ||
    ts.isTupleTypeNode(node) ||
    ts.isLiteralTypeNode(node) ||
    ts.isFunctionTypeNode(node) ||
    ts.isConstructorTypeNode(node) ||
    ts.isParenthesizedTypeNode(node) ||
    ts.isThisTypeNode(node) // 'this' as a type: clone(): this
  );
}

// JSX nodes that represent actual tag syntax (NOT container nodes)
// Note: JsxSelfClosingElement, JsxOpeningElement, JsxClosingElement are handled specially above
function isJsxStructuralNode(node: ts.Node): boolean {
  return (
    ts.isJsxOpeningFragment(node) || // <>
    ts.isJsxClosingFragment(node) || // </>
    ts.isJsxText(node) // text content between tags
    // NOT JsxElement or JsxFragment - those are containers
    // NOT JsxAttribute or JsxExpression - handled specially above
    // NOT JsxSelfClosingElement, JsxOpeningElement, JsxClosingElement - handled specially above
  );
}

function isJavaScriptNode(node: ts.Node): boolean {
  return (
    ts.isVariableDeclaration(node) ||
    ts.isVariableStatement(node) ||
    ts.isFunctionDeclaration(node) ||
    ts.isArrowFunction(node) ||
    ts.isFunctionExpression(node) ||
    ts.isPropertyAccessExpression(node) ||
    ts.isElementAccessExpression(node) ||
    ts.isObjectLiteralExpression(node) ||
    ts.isArrayLiteralExpression(node) ||
    ts.isConditionalExpression(node) ||
    ts.isBinaryExpression(node) ||
    ts.isPrefixUnaryExpression(node) ||
    ts.isPostfixUnaryExpression(node) ||
    ts.isTemplateExpression(node) ||
    ts.isIfStatement(node) ||
    ts.isForStatement(node) ||
    ts.isForInStatement(node) ||
    ts.isForOfStatement(node) ||
    ts.isWhileStatement(node) ||
    ts.isDoStatement(node) ||
    ts.isSwitchStatement(node) ||
    ts.isTryStatement(node) ||
    ts.isThrowStatement(node) ||
    ts.isReturnStatement(node) ||
    ts.isClassDeclaration(node) ||
    ts.isImportDeclaration(node) ||
    ts.isExportDeclaration(node) ||
    ts.isExportAssignment(node) ||
    ts.isAwaitExpression(node) ||
    ts.isSpreadElement(node) ||
    ts.isParameter(node) ||
    ts.isIdentifier(node) ||
    ts.isStringLiteral(node) ||
    ts.isNumericLiteral(node) ||
    ts.isParenthesizedExpression(node)
  );
}
