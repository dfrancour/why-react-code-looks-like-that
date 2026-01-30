import { describe, it, expect } from "vitest";
import { classifyDocument } from "./classifier";
import type { ClassifiedRegion, SyntaxLayer } from "./types";

// Helper to get the layer at a specific position
function getLayerAt(
  regions: ClassifiedRegion[],
  position: number
): SyntaxLayer | null {
  const region = regions.find((r) => r.start <= position && r.end > position);
  return region?.layer ?? null;
}

// Helper to check that a substring is classified as expected
function assertSegmentClassifiedAs(
  regions: ClassifiedRegion[],
  source: string,
  substring: string,
  expectedLayer: SyntaxLayer
) {
  const index = source.indexOf(substring);
  expect(index).toBeGreaterThan(-1);
  const layer = getLayerAt(regions, index);
  expect(layer).toBe(expectedLayer);
}

describe("classifyDocument", () => {
  describe("JavaScript classification", () => {
    it("classifies variable declarations as JavaScript", () => {
      const source = `const x = 1;`;
      const regions = classifyDocument(source);
      assertSegmentClassifiedAs(regions, source, "const", "javascript");
      assertSegmentClassifiedAs(regions, source, "x", "javascript");
      assertSegmentClassifiedAs(regions, source, "1", "javascript");
    });

    it("classifies let and var declarations as JavaScript", () => {
      const source = `let a = 1; var b = 2;`;
      const regions = classifyDocument(source);
      assertSegmentClassifiedAs(regions, source, "let", "javascript");
      assertSegmentClassifiedAs(regions, source, "var", "javascript");
    });

    it("classifies function declarations as JavaScript", () => {
      const source = `function greet(name) { return "Hello " + name; }`;
      const regions = classifyDocument(source);
      assertSegmentClassifiedAs(regions, source, "function", "javascript");
      assertSegmentClassifiedAs(regions, source, "greet", "javascript");
      assertSegmentClassifiedAs(regions, source, "return", "javascript");
    });

    it("classifies arrow functions as JavaScript", () => {
      const source = `const add = (a, b) => a + b;`;
      const regions = classifyDocument(source);
      assertSegmentClassifiedAs(regions, source, "=>", "javascript");
      assertSegmentClassifiedAs(regions, source, "a + b", "javascript");
    });

    it("classifies object literals as JavaScript", () => {
      const source = `const obj = { foo: 1, bar: 2 };`;
      const regions = classifyDocument(source);
      assertSegmentClassifiedAs(regions, source, "foo", "javascript");
      assertSegmentClassifiedAs(regions, source, "bar", "javascript");
    });

    it("classifies array literals as JavaScript", () => {
      const source = `const arr = [1, 2, 3];`;
      const regions = classifyDocument(source);
      assertSegmentClassifiedAs(regions, source, "[1, 2, 3]", "javascript");
    });

    it("classifies control flow statements as JavaScript", () => {
      const source = `if (true) { } else { } for (;;) { } while (true) { }`;
      const regions = classifyDocument(source);
      assertSegmentClassifiedAs(regions, source, "if", "javascript");
      assertSegmentClassifiedAs(regions, source, "else", "javascript");
      assertSegmentClassifiedAs(regions, source, "for", "javascript");
      assertSegmentClassifiedAs(regions, source, "while", "javascript");
    });

    it("classifies try/catch/throw as JavaScript", () => {
      const source = `try { throw new Error(); } catch (e) { }`;
      const regions = classifyDocument(source);
      assertSegmentClassifiedAs(regions, source, "try", "javascript");
      assertSegmentClassifiedAs(regions, source, "throw", "javascript");
      assertSegmentClassifiedAs(regions, source, "catch", "javascript");
    });

    it("classifies imports and exports as JavaScript", () => {
      const source = `import foo from 'bar'; export const x = 1;`;
      const regions = classifyDocument(source);
      assertSegmentClassifiedAs(regions, source, "import", "javascript");
      assertSegmentClassifiedAs(regions, source, "export", "javascript");
    });

    it("classifies template literals as JavaScript", () => {
      const source = "const msg = `Hello ${name}`;";
      const regions = classifyDocument(source);
      assertSegmentClassifiedAs(regions, source, "msg", "javascript");
    });

    it("classifies comments as JavaScript", () => {
      const source = `// single line comment\nconst x = 1; /* block comment */`;
      const regions = classifyDocument(source);
      assertSegmentClassifiedAs(regions, source, "// single line comment", "javascript");
      assertSegmentClassifiedAs(regions, source, "/* block comment */", "javascript");
    });

    it("classifies class declarations as JavaScript", () => {
      const source = `class Foo { constructor() {} method() {} }`;
      const regions = classifyDocument(source);
      assertSegmentClassifiedAs(regions, source, "class", "javascript");
      assertSegmentClassifiedAs(regions, source, "constructor", "javascript");
      assertSegmentClassifiedAs(regions, source, "method", "javascript");
    });

    it("classifies async/await as JavaScript", () => {
      const source = `async function foo() { await bar(); }`;
      const regions = classifyDocument(source);
      assertSegmentClassifiedAs(regions, source, "async", "javascript");
      assertSegmentClassifiedAs(regions, source, "await", "javascript");
    });

    it("classifies spread operator as JavaScript", () => {
      const source = `const arr = [...other];`;
      const regions = classifyDocument(source);
      assertSegmentClassifiedAs(regions, source, "...", "javascript");
    });
  });

  describe("TypeScript classification", () => {
    it("classifies type annotations with colon as TypeScript", () => {
      const source = `const x: string = "hello";`;
      const regions = classifyDocument(source);
      assertSegmentClassifiedAs(regions, source, ": string", "typescript");
      assertSegmentClassifiedAs(regions, source, "const", "javascript");
    });

    it("classifies number type annotation as TypeScript", () => {
      const source = `const n: number = 42;`;
      const regions = classifyDocument(source);
      assertSegmentClassifiedAs(regions, source, ": number", "typescript");
    });

    it("classifies boolean type annotation as TypeScript", () => {
      const source = `const b: boolean = true;`;
      const regions = classifyDocument(source);
      assertSegmentClassifiedAs(regions, source, ": boolean", "typescript");
    });

    it("classifies interface declarations as TypeScript", () => {
      const source = `interface User { name: string; age: number; }`;
      const regions = classifyDocument(source);
      assertSegmentClassifiedAs(regions, source, "interface", "typescript");
      assertSegmentClassifiedAs(regions, source, "User", "typescript");
      assertSegmentClassifiedAs(regions, source, "name", "typescript");
    });

    it("classifies type alias declarations as TypeScript", () => {
      const source = `type ID = string | number;`;
      const regions = classifyDocument(source);
      assertSegmentClassifiedAs(regions, source, "type", "typescript");
      assertSegmentClassifiedAs(regions, source, "ID", "typescript");
      assertSegmentClassifiedAs(regions, source, "string | number", "typescript");
    });

    it("classifies union types as TypeScript", () => {
      const source = `let x: string | number;`;
      const regions = classifyDocument(source);
      assertSegmentClassifiedAs(regions, source, "string | number", "typescript");
    });

    it("classifies intersection types as TypeScript", () => {
      const source = `type Both = A & B;`;
      const regions = classifyDocument(source);
      assertSegmentClassifiedAs(regions, source, "A & B", "typescript");
    });

    it("classifies array type syntax as TypeScript", () => {
      const source = `const arr: string[] = [];`;
      const regions = classifyDocument(source);
      assertSegmentClassifiedAs(regions, source, "string[]", "typescript");
    });

    it("classifies tuple types as TypeScript", () => {
      const source = `const tuple: [string, number] = ["a", 1];`;
      const regions = classifyDocument(source);
      assertSegmentClassifiedAs(regions, source, "[string, number]", "typescript");
    });

    it("classifies generic type parameters as TypeScript", () => {
      const source = `function identity<T>(x: T): T { return x; }`;
      const regions = classifyDocument(source);
      assertSegmentClassifiedAs(regions, source, "<T>", "typescript");
      assertSegmentClassifiedAs(regions, source, ": T", "typescript");
    });

    it("classifies 'as' expressions as TypeScript", () => {
      const source = `const x = value as string;`;
      const regions = classifyDocument(source);
      assertSegmentClassifiedAs(regions, source, "as string", "typescript");
      assertSegmentClassifiedAs(regions, source, "value", "javascript");
    });

    it("classifies function return types as TypeScript", () => {
      const source = `function greet(): string { return "hi"; }`;
      const regions = classifyDocument(source);
      assertSegmentClassifiedAs(regions, source, ": string", "typescript");
      assertSegmentClassifiedAs(regions, source, "function", "javascript");
    });

    it("classifies arrow function return types as TypeScript", () => {
      const source = `const fn = (): number => 42;`;
      const regions = classifyDocument(source);
      assertSegmentClassifiedAs(regions, source, ": number", "typescript");
    });

    it("classifies parameter types as TypeScript", () => {
      const source = `function add(a: number, b: number) {}`;
      const regions = classifyDocument(source);
      // Find the colon positions
      const firstColon = source.indexOf(": number");
      expect(getLayerAt(regions, firstColon)).toBe("typescript");
    });

    it("classifies optional parameter marker as TypeScript", () => {
      const source = `function greet(name?: string) {}`;
      const regions = classifyDocument(source);
      assertSegmentClassifiedAs(regions, source, "?: string", "typescript");
    });

    it("classifies enum declarations as TypeScript", () => {
      const source = `enum Color { Red, Green, Blue }`;
      const regions = classifyDocument(source);
      assertSegmentClassifiedAs(regions, source, "enum", "typescript");
    });

    it("classifies class with type parameters as mixed", () => {
      const source = `class Box<T> { value: T; }`;
      const regions = classifyDocument(source);
      assertSegmentClassifiedAs(regions, source, "<T>", "typescript");
      assertSegmentClassifiedAs(regions, source, ": T", "typescript");
      assertSegmentClassifiedAs(regions, source, "class", "javascript");
    });

    it("classifies class heritage with generics as TypeScript", () => {
      const source = `class Derived extends Base<string> {}`;
      const regions = classifyDocument(source);
      assertSegmentClassifiedAs(regions, source, "<string>", "typescript");
    });

    it("classifies method return types as TypeScript", () => {
      const source = `class Foo { bar(): void {} }`;
      const regions = classifyDocument(source);
      assertSegmentClassifiedAs(regions, source, ": void", "typescript");
    });

    it("classifies call expression type arguments as TypeScript", () => {
      const source = `const result = fn<string>();`;
      const regions = classifyDocument(source);
      assertSegmentClassifiedAs(regions, source, "<string>", "typescript");
    });

    it("classifies nested type arguments in call expressions as TypeScript", () => {
      const source = `const result = fn<Map<string, number>>();`;
      const regions = classifyDocument(source);
      assertSegmentClassifiedAs(regions, source, "<Map<string, number>>", "typescript");
    });

    it("classifies new expression type arguments as TypeScript", () => {
      const source = `const map = new Map<string, number>();`;
      const regions = classifyDocument(source);
      assertSegmentClassifiedAs(regions, source, "<string, number>", "typescript");
    });

    it("classifies nested type arguments in new expressions as TypeScript", () => {
      const source = `const map = new Map<string, Set<number>>();`;
      const regions = classifyDocument(source);
      assertSegmentClassifiedAs(regions, source, "<string, Set<number>>", "typescript");
    });

    it("classifies nested type parameters in function declarations as TypeScript", () => {
      const source = `function foo<T extends Map<K, V>, K, V>() {}`;
      const regions = classifyDocument(source);
      assertSegmentClassifiedAs(regions, source, "<T extends Map<K, V>, K, V>", "typescript");
    });

    it("classifies nested type parameters in class heritage as TypeScript", () => {
      const source = `class Foo extends Bar<Map<string, number>> {}`;
      const regions = classifyDocument(source);
      assertSegmentClassifiedAs(regions, source, "<Map<string, number>>", "typescript");
    });

    it("classifies mapped types as TypeScript", () => {
      const source = `type Keys = { [K in keyof T]: T[K] };`;
      const regions = classifyDocument(source);
      assertSegmentClassifiedAs(regions, source, "{ [K in keyof T]: T[K] }", "typescript");
    });

    it("classifies conditional types as TypeScript", () => {
      const source = `type X = T extends U ? A : B;`;
      const regions = classifyDocument(source);
      assertSegmentClassifiedAs(regions, source, "T extends U ? A : B", "typescript");
    });

    it("classifies satisfies expression as TypeScript", () => {
      const source = `const config = { port: 3000 } satisfies Options;`;
      const regions = classifyDocument(source);
      assertSegmentClassifiedAs(regions, source, "satisfies Options", "typescript");
      assertSegmentClassifiedAs(regions, source, "{ port: 3000 }", "javascript");
    });

    it("classifies import type as TypeScript", () => {
      const source = `import type { FC } from 'react';`;
      const regions = classifyDocument(source);
      assertSegmentClassifiedAs(regions, source, "import type", "typescript");
    });

    it("classifies export type as TypeScript", () => {
      const source = `export type { MyType };`;
      const regions = classifyDocument(source);
      assertSegmentClassifiedAs(regions, source, "export type", "typescript");
    });

    it("classifies export type from as TypeScript", () => {
      const source = `export type { MyType } from './types';`;
      const regions = classifyDocument(source);
      assertSegmentClassifiedAs(regions, source, "export type", "typescript");
    });

    it("classifies declare const as TypeScript", () => {
      const source = `declare const __DEV__: boolean;`;
      const regions = classifyDocument(source);
      assertSegmentClassifiedAs(regions, source, "declare", "typescript");
      assertSegmentClassifiedAs(regions, source, "__DEV__", "typescript");
    });

    it("classifies declare function as TypeScript", () => {
      const source = `declare function gtag(...args: any[]): void;`;
      const regions = classifyDocument(source);
      assertSegmentClassifiedAs(regions, source, "declare function", "typescript");
    });

    it("classifies declare class as TypeScript", () => {
      const source = `declare class MyClass { method(): void; }`;
      const regions = classifyDocument(source);
      assertSegmentClassifiedAs(regions, source, "declare class", "typescript");
    });

    it("classifies declare module as TypeScript", () => {
      const source = `declare module 'foo' { export const x: number; }`;
      const regions = classifyDocument(source);
      assertSegmentClassifiedAs(regions, source, "declare module", "typescript");
    });

    it("classifies namespace as TypeScript", () => {
      const source = `namespace MyNamespace { export const x = 1; }`;
      const regions = classifyDocument(source);
      assertSegmentClassifiedAs(regions, source, "namespace", "typescript");
    });

    it("classifies abstract class keyword as TypeScript", () => {
      const source = `abstract class Base { abstract method(): void; }`;
      const regions = classifyDocument(source);
      assertSegmentClassifiedAs(regions, source, "abstract", "typescript");
      assertSegmentClassifiedAs(regions, source, "class", "javascript");
    });

    it("classifies access modifiers on class members as TypeScript", () => {
      const source = `class Foo { private name: string; protected age: number; public id: number; }`;
      const regions = classifyDocument(source);
      assertSegmentClassifiedAs(regions, source, "private", "typescript");
      assertSegmentClassifiedAs(regions, source, "protected", "typescript");
      assertSegmentClassifiedAs(regions, source, "public", "typescript");
    });

    it("classifies readonly modifier as TypeScript", () => {
      const source = `class Foo { readonly id: number = 1; }`;
      const regions = classifyDocument(source);
      assertSegmentClassifiedAs(regions, source, "readonly", "typescript");
    });

    it("classifies parameter property modifiers as TypeScript", () => {
      const source = `class Foo { constructor(public readonly name: string) {} }`;
      const regions = classifyDocument(source);
      assertSegmentClassifiedAs(regions, source, "public", "typescript");
      assertSegmentClassifiedAs(regions, source, "readonly", "typescript");
      assertSegmentClassifiedAs(regions, source, ": string", "typescript");
      assertSegmentClassifiedAs(regions, source, "constructor", "javascript");
    });

    it("classifies abstract method modifier as TypeScript", () => {
      const source = `abstract class Foo { abstract bar(): void; }`;
      const regions = classifyDocument(source);
      // Find the abstract before 'bar'
      const abstractBarIndex = source.indexOf("abstract bar");
      expect(getLayerAt(regions, abstractBarIndex)).toBe("typescript");
    });

    it("classifies decorators as TypeScript", () => {
      const source = `@Component({ selector: 'app' }) class MyClass {}`;
      const regions = classifyDocument(source);
      assertSegmentClassifiedAs(regions, source, "@Component", "typescript");
    });

    it("classifies method decorators as TypeScript", () => {
      const source = `class Foo { @Log() method() {} }`;
      const regions = classifyDocument(source);
      assertSegmentClassifiedAs(regions, source, "@Log()", "typescript");
    });

    it("classifies non-null assertion bang only as TypeScript", () => {
      const source = `const x = value!;`;
      const regions = classifyDocument(source);
      // The '!' should be TypeScript
      const bangIndex = source.indexOf("!");
      expect(getLayerAt(regions, bangIndex)).toBe("typescript");
      // The 'value' should be JavaScript
      assertSegmentClassifiedAs(regions, source, "value", "javascript");
    });

    it("classifies chained non-null assertions correctly", () => {
      const source = `const x = obj!.prop!.value;`;
      const regions = classifyDocument(source);
      // Find the first !
      const firstBang = source.indexOf("!");
      expect(getLayerAt(regions, firstBang)).toBe("typescript");
      // Find the second !
      const secondBang = source.indexOf("!", firstBang + 1);
      expect(getLayerAt(regions, secondBang)).toBe("typescript");
    });
  });

  describe("JSX classification", () => {
    it("classifies opening JSX tags as JSX", () => {
      const source = `const el = <div>hello</div>;`;
      const regions = classifyDocument(source);
      assertSegmentClassifiedAs(regions, source, "<div", "jsx");
    });

    it("classifies closing JSX tags as JSX", () => {
      const source = `const el = <div>hello</div>;`;
      const regions = classifyDocument(source);
      assertSegmentClassifiedAs(regions, source, "</div>", "jsx");
    });

    it("classifies self-closing JSX elements as JSX", () => {
      const source = `const el = <input />;`;
      const regions = classifyDocument(source);
      assertSegmentClassifiedAs(regions, source, "<input", "jsx");
      assertSegmentClassifiedAs(regions, source, "/>", "jsx");
    });

    it("classifies JSX component with type arguments", () => {
      const source = `const el = <Component<Props> />;`;
      const regions = classifyDocument(source);
      assertSegmentClassifiedAs(regions, source, "<Component", "jsx");
      assertSegmentClassifiedAs(regions, source, "<Props>", "typescript");
      assertSegmentClassifiedAs(regions, source, "/>", "jsx");
    });

    it("classifies JSX component with nested type arguments", () => {
      const source = `const el = <Component<Map<string, number>> />;`;
      const regions = classifyDocument(source);
      assertSegmentClassifiedAs(regions, source, "<Component", "jsx");
      assertSegmentClassifiedAs(regions, source, "<Map<string, number>>", "typescript");
      assertSegmentClassifiedAs(regions, source, "/>", "jsx");
    });

    it("classifies opening JSX element with nested type arguments", () => {
      const source = `const el = <List<Set<number>>>items</List>;`;
      const regions = classifyDocument(source);
      assertSegmentClassifiedAs(regions, source, "<List", "jsx");
      assertSegmentClassifiedAs(regions, source, "<Set<number>>", "typescript");
    });

    it("classifies JSX text content as JSX", () => {
      const source = `const el = <p>Hello world</p>;`;
      const regions = classifyDocument(source);
      assertSegmentClassifiedAs(regions, source, "Hello world", "jsx");
    });

    it("classifies JSX attribute names as JSX", () => {
      const source = `const el = <div className="foo" />;`;
      const regions = classifyDocument(source);
      assertSegmentClassifiedAs(regions, source, "className", "jsx");
    });

    it("classifies JSX attribute string values as JSX", () => {
      const source = `const el = <div id="main" />;`;
      const regions = classifyDocument(source);
      assertSegmentClassifiedAs(regions, source, '"main"', "jsx");
    });

    it("classifies JSX expression braces as JSX", () => {
      const source = `const el = <div>{value}</div>;`;
      const regions = classifyDocument(source);
      // The opening brace
      const braceIndex = source.indexOf("{value}");
      expect(getLayerAt(regions, braceIndex)).toBe("jsx");
      // The closing brace
      expect(getLayerAt(regions, braceIndex + 6)).toBe("jsx");
    });

    it("classifies content inside JSX expressions as JavaScript", () => {
      const source = `const el = <div>{value}</div>;`;
      const regions = classifyDocument(source);
      // The content inside braces
      const valueIndex = source.indexOf("value}");
      expect(getLayerAt(regions, valueIndex)).toBe("javascript");
    });

    it("classifies JSX fragments as JSX", () => {
      const source = `const el = <>text</>;`;
      const regions = classifyDocument(source);
      assertSegmentClassifiedAs(regions, source, "<>", "jsx");
      assertSegmentClassifiedAs(regions, source, "</>", "jsx");
    });

    it("classifies custom component tags as JSX", () => {
      const source = `const el = <MyComponent />;`;
      const regions = classifyDocument(source);
      assertSegmentClassifiedAs(regions, source, "<MyComponent", "jsx");
    });

    it("classifies nested JSX elements correctly", () => {
      const source = `const el = <div><span>text</span></div>;`;
      const regions = classifyDocument(source);
      assertSegmentClassifiedAs(regions, source, "<div>", "jsx");
      assertSegmentClassifiedAs(regions, source, "<span>", "jsx");
      assertSegmentClassifiedAs(regions, source, "</span>", "jsx");
      assertSegmentClassifiedAs(regions, source, "</div>", "jsx");
    });

    it("classifies JSX with multiple attributes", () => {
      const source = `const el = <button type="submit" disabled onClick={fn} />;`;
      const regions = classifyDocument(source);
      assertSegmentClassifiedAs(regions, source, "type", "jsx");
      assertSegmentClassifiedAs(regions, source, "disabled", "jsx");
      assertSegmentClassifiedAs(regions, source, "onClick", "jsx");
    });

    it("classifies the equals sign in attributes as JSX", () => {
      const source = `const el = <div id="x" />;`;
      const regions = classifyDocument(source);
      const eqIndex = source.indexOf('="');
      expect(getLayerAt(regions, eqIndex)).toBe("jsx");
    });

    it("classifies JSX type arguments as TypeScript", () => {
      const source = `const el = <MyComponent<Props> />;`;
      const regions = classifyDocument(source);
      assertSegmentClassifiedAs(regions, source, "<MyComponent", "jsx");
      assertSegmentClassifiedAs(regions, source, "<Props>", "typescript");
      assertSegmentClassifiedAs(regions, source, "/>", "jsx");
    });

    it("classifies JSX type arguments on opening element as TypeScript", () => {
      const source = `const el = <MyComponent<Props>>content</MyComponent>;`;
      const regions = classifyDocument(source);
      assertSegmentClassifiedAs(regions, source, "<Props>", "typescript");
    });

    it("classifies JSX spread attribute braces as JSX", () => {
      const source = `const el = <Component {...props} />;`;
      const regions = classifyDocument(source);
      // Opening brace and spread operator
      const spreadIndex = source.indexOf("{...");
      expect(getLayerAt(regions, spreadIndex)).toBe("jsx");
      expect(getLayerAt(regions, spreadIndex + 1)).toBe("jsx"); // first dot
      expect(getLayerAt(regions, spreadIndex + 2)).toBe("jsx"); // second dot
      expect(getLayerAt(regions, spreadIndex + 3)).toBe("jsx"); // third dot
      // The expression inside
      assertSegmentClassifiedAs(regions, source, "props", "javascript");
      // Closing brace
      const closeBrace = source.indexOf("} />");
      expect(getLayerAt(regions, closeBrace)).toBe("jsx");
    });

    it("classifies multiple JSX spread attributes correctly", () => {
      const source = `const el = <Component {...a} {...b} />;`;
      const regions = classifyDocument(source);
      assertSegmentClassifiedAs(regions, source, "a", "javascript");
      assertSegmentClassifiedAs(regions, source, "b", "javascript");
    });
  });

  describe("React classification", () => {
    it("classifies useState hook as React", () => {
      const source = `const [count, setCount] = useState(0);`;
      const regions = classifyDocument(source);
      assertSegmentClassifiedAs(regions, source, "useState", "react");
    });

    it("classifies useEffect hook as React", () => {
      const source = `useEffect(() => {}, []);`;
      const regions = classifyDocument(source);
      assertSegmentClassifiedAs(regions, source, "useEffect", "react");
    });

    it("classifies useContext hook as React", () => {
      const source = `const ctx = useContext(MyContext);`;
      const regions = classifyDocument(source);
      assertSegmentClassifiedAs(regions, source, "useContext", "react");
    });

    it("classifies useReducer hook as React", () => {
      const source = `const [state, dispatch] = useReducer(reducer, init);`;
      const regions = classifyDocument(source);
      assertSegmentClassifiedAs(regions, source, "useReducer", "react");
    });

    it("classifies useCallback hook as React", () => {
      const source = `const fn = useCallback(() => {}, []);`;
      const regions = classifyDocument(source);
      assertSegmentClassifiedAs(regions, source, "useCallback", "react");
    });

    it("classifies useMemo hook as React", () => {
      const source = `const value = useMemo(() => compute(), [dep]);`;
      const regions = classifyDocument(source);
      assertSegmentClassifiedAs(regions, source, "useMemo", "react");
    });

    it("classifies useRef hook as React", () => {
      const source = `const ref = useRef(null);`;
      const regions = classifyDocument(source);
      assertSegmentClassifiedAs(regions, source, "useRef", "react");
    });

    it("classifies useId hook as React", () => {
      const source = `const id = useId();`;
      const regions = classifyDocument(source);
      assertSegmentClassifiedAs(regions, source, "useId", "react");
    });

    it("classifies use() hook (React 19) as React", () => {
      const source = `const value = use(promise);`;
      const regions = classifyDocument(source);
      assertSegmentClassifiedAs(regions, source, "use", "react");
    });

    it("classifies React.use() qualified call as React", () => {
      const source = `const value = React.use(context);`;
      const regions = classifyDocument(source);
      assertSegmentClassifiedAs(regions, source, "React.use", "react");
    });

    it("classifies React.useState qualified call as React", () => {
      const source = `const [x, setX] = React.useState(0);`;
      const regions = classifyDocument(source);
      assertSegmentClassifiedAs(regions, source, "React.useState", "react");
    });

    it("classifies 'use client' directive as React", () => {
      const source = `"use client";\nconst x = 1;`;
      const regions = classifyDocument(source);
      assertSegmentClassifiedAs(regions, source, '"use client"', "react");
    });

    it("classifies 'use server' directive as React", () => {
      const source = `"use server";\nexport async function action() {}`;
      const regions = classifyDocument(source);
      assertSegmentClassifiedAs(regions, source, '"use server"', "react");
    });

    it("classifies 'use strict' directive as JavaScript (not React)", () => {
      const source = `"use strict";\nconst x = 1;`;
      const regions = classifyDocument(source);
      assertSegmentClassifiedAs(regions, source, '"use strict"', "javascript");
    });

    it("classifies custom hooks as JavaScript (cannot reliably identify without imports)", () => {
      const source = `const data = useCustomHook();`;
      const regions = classifyDocument(source);
      assertSegmentClassifiedAs(regions, source, "useCustomHook", "javascript");
    });

    it("classifies useMyData as JavaScript (useXxx naming alone is unreliable)", () => {
      const source = `const { data } = useMyData(id);`;
      const regions = classifyDocument(source);
      assertSegmentClassifiedAs(regions, source, "useMyData", "javascript");
    });

    it("does not classify useless (lowercase after use) as React", () => {
      const source = `const x = useless();`;
      const regions = classifyDocument(source);
      assertSegmentClassifiedAs(regions, source, "useless", "javascript");
    });

    it("classifies key prop as React", () => {
      const source = `const el = <li key={id}>item</li>;`;
      const regions = classifyDocument(source);
      assertSegmentClassifiedAs(regions, source, "key", "react");
    });

    it("classifies ref prop as React", () => {
      const source = `const el = <input ref={inputRef} />;`;
      const regions = classifyDocument(source);
      assertSegmentClassifiedAs(regions, source, "ref", "react");
    });

    it("classifies React.createElement as React", () => {
      const source = `const el = React.createElement("div", null);`;
      const regions = classifyDocument(source);
      assertSegmentClassifiedAs(regions, source, "React.createElement", "react");
    });

    it("classifies React.Fragment as React", () => {
      const source = `const el = <React.Fragment>text</React.Fragment>;`;
      const regions = classifyDocument(source);
      assertSegmentClassifiedAs(regions, source, "React.Fragment", "react");
    });

    it("classifies React.Fragment opening bracket as JSX", () => {
      const source = `const el = <React.Fragment>text</React.Fragment>;`;
      const regions = classifyDocument(source);
      const openBracketIndex = source.indexOf("<React");
      expect(getLayerAt(regions, openBracketIndex)).toBe("jsx");
    });

    it("classifies React.Fragment closing tag bracket as JSX", () => {
      const source = `const el = <React.Fragment>text</React.Fragment>;`;
      const regions = classifyDocument(source);
      // The '</' in </React.Fragment>
      const closingTagIndex = source.indexOf("</React");
      expect(getLayerAt(regions, closingTagIndex)).toBe("jsx");
      expect(getLayerAt(regions, closingTagIndex + 1)).toBe("jsx");
      // The '>' at the end of </React.Fragment>
      const closingBracketIndex = source.indexOf("</React.Fragment>") + "</React.Fragment>".length - 1;
      expect(getLayerAt(regions, closingBracketIndex)).toBe("jsx");
    });

    it("classifies self-closing React.Fragment as React", () => {
      const source = `const el = <React.Fragment />;`;
      const regions = classifyDocument(source);
      assertSegmentClassifiedAs(regions, source, "React.Fragment", "react");
    });

    it("classifies self-closing React.Fragment brackets as JSX", () => {
      const source = `const el = <React.Fragment />;`;
      const regions = classifyDocument(source);
      const openBracketIndex = source.indexOf("<React");
      expect(getLayerAt(regions, openBracketIndex)).toBe("jsx");
      assertSegmentClassifiedAs(regions, source, "/>", "jsx");
    });

    it("classifies React.Fragment with key prop correctly", () => {
      const source = `<React.Fragment key={\`\${groupType}-\${version.name}\`}>content</React.Fragment>`;
      const regions = classifyDocument(source);
      assertSegmentClassifiedAs(regions, source, "React.Fragment", "react");
      assertSegmentClassifiedAs(regions, source, "key", "react");
    });

    it("classifies React.Suspense as React", () => {
      const source = `const el = <React.Suspense fallback={<div />}>content</React.Suspense>;`;
      const regions = classifyDocument(source);
      // Opening tag
      const openingIndex = source.indexOf("React.Suspense");
      expect(getLayerAt(regions, openingIndex)).toBe("react");
      // Closing tag
      const closingIndex = source.indexOf("</React.Suspense") + 2; // skip '</'
      expect(getLayerAt(regions, closingIndex)).toBe("react");
    });

    it("classifies React.StrictMode as React", () => {
      const source = `const el = <React.StrictMode><App /></React.StrictMode>;`;
      const regions = classifyDocument(source);
      assertSegmentClassifiedAs(regions, source, "React.StrictMode", "react");
    });

    it("classifies React.Profiler as React", () => {
      const source = `const el = <React.Profiler id="nav" onRender={cb}><Nav /></React.Profiler>;`;
      const regions = classifyDocument(source);
      assertSegmentClassifiedAs(regions, source, "React.Profiler", "react");
    });

    it("classifies the React identifier as React", () => {
      const source = `import React from 'react';`;
      const regions = classifyDocument(source);
      assertSegmentClassifiedAs(regions, source, "React", "react");
    });

    it("classifies FC type as React", () => {
      const source = `const App: FC = () => <div />;`;
      const regions = classifyDocument(source);
      assertSegmentClassifiedAs(regions, source, "FC", "react");
    });

    it("classifies ReactNode type as React", () => {
      const source = `const node: ReactNode = <div />;`;
      const regions = classifyDocument(source);
      assertSegmentClassifiedAs(regions, source, "ReactNode", "react");
    });

    it("classifies ReactElement type as React", () => {
      const source = `const el: ReactElement = <div />;`;
      const regions = classifyDocument(source);
      assertSegmentClassifiedAs(regions, source, "ReactElement", "react");
    });

    it("classifies ChangeEvent type as React", () => {
      const source = `const handler = (e: ChangeEvent) => {};`;
      const regions = classifyDocument(source);
      assertSegmentClassifiedAs(regions, source, "ChangeEvent", "react");
    });

    it("classifies MouseEvent type as React", () => {
      const source = `const handler = (e: MouseEvent) => {};`;
      const regions = classifyDocument(source);
      assertSegmentClassifiedAs(regions, source, "MouseEvent", "react");
    });

    it("classifies React types with generics as React", () => {
      const source = `const fn: FC<Props> = () => null;`;
      const regions = classifyDocument(source);
      // FC should be React
      assertSegmentClassifiedAs(regions, source, "FC", "react");
    });

    it("classifies key in React.createElement props as React", () => {
      const source = `React.createElement("li", { key: "1" }, "item");`;
      const regions = classifyDocument(source);
      // The key property name in the object
      const keyIndex = source.indexOf("key:");
      expect(getLayerAt(regions, keyIndex)).toBe("react");
    });

    it("classifies component name in createElement as React for PascalCase", () => {
      const source = `React.createElement(MyComponent, null);`;
      const regions = classifyDocument(source);
      assertSegmentClassifiedAs(regions, source, "MyComponent", "react");
    });

    it("classifies React.useState as React", () => {
      const source = `const [count, setCount] = React.useState(0);`;
      const regions = classifyDocument(source);
      assertSegmentClassifiedAs(regions, source, "React.useState", "react");
      assertSegmentClassifiedAs(regions, source, "0", "javascript");
    });

    it("classifies React.useEffect as React", () => {
      const source = `React.useEffect(() => {}, []);`;
      const regions = classifyDocument(source);
      assertSegmentClassifiedAs(regions, source, "React.useEffect", "react");
    });

    it("classifies React.useMemo as React with arguments as JavaScript", () => {
      const source = `const value = React.useMemo(() => compute(x), [x]);`;
      const regions = classifyDocument(source);
      assertSegmentClassifiedAs(regions, source, "React.useMemo", "react");
      assertSegmentClassifiedAs(regions, source, "compute", "javascript");
    });

    it("classifies React.memo callee as React, component as JavaScript", () => {
      const source = `const Memoized = React.memo(MyComponent);`;
      const regions = classifyDocument(source);
      assertSegmentClassifiedAs(regions, source, "React.memo", "react");
      assertSegmentClassifiedAs(regions, source, "MyComponent", "javascript");
    });

    it("classifies React.forwardRef callee as React, callback as JavaScript", () => {
      const source = `const Ref = React.forwardRef((props, ref) => <div />);`;
      const regions = classifyDocument(source);
      assertSegmentClassifiedAs(regions, source, "React.forwardRef", "react");
      assertSegmentClassifiedAs(regions, source, "(props, ref)", "javascript");
    });

    it("classifies React.lazy callee as React, import as JavaScript", () => {
      const source = `const Lazy = React.lazy(() => import('./Component'));`;
      const regions = classifyDocument(source);
      assertSegmentClassifiedAs(regions, source, "React.lazy", "react");
      assertSegmentClassifiedAs(regions, source, "import", "javascript");
    });

    it("classifies React.createContext callee as React, default value as JavaScript", () => {
      const source = `const Ctx = React.createContext(null);`;
      const regions = classifyDocument(source);
      assertSegmentClassifiedAs(regions, source, "React.createContext", "react");
      assertSegmentClassifiedAs(regions, source, "null", "javascript");
    });

    it("classifies React.createContext with type args correctly", () => {
      const source = `const Ctx = React.createContext<string>('default');`;
      const regions = classifyDocument(source);
      assertSegmentClassifiedAs(regions, source, "React.createContext", "react");
      assertSegmentClassifiedAs(regions, source, "<string>", "typescript");
      assertSegmentClassifiedAs(regions, source, "'default'", "javascript");
    });
  });

  describe("priority and overlap resolution", () => {
    it("TypeScript wins over JavaScript for type annotations", () => {
      const source = `const x: string = "hi";`;
      const regions = classifyDocument(source);
      // The colon and type should be TS, not JS
      const colonIndex = source.indexOf(": string");
      expect(getLayerAt(regions, colonIndex)).toBe("typescript");
    });

    it("React wins over JSX for key attribute", () => {
      const source = `<li key="1">item</li>`;
      const regions = classifyDocument(source);
      assertSegmentClassifiedAs(regions, source, "key", "react");
    });

    it("React wins over JSX for ref attribute", () => {
      const source = `<input ref={myRef} />`;
      const regions = classifyDocument(source);
      assertSegmentClassifiedAs(regions, source, "ref", "react");
    });

    it("React wins over TypeScript for React types", () => {
      const source = `const node: ReactNode = null;`;
      const regions = classifyDocument(source);
      assertSegmentClassifiedAs(regions, source, "ReactNode", "react");
    });

    it("JSX wins over JavaScript for tag structure", () => {
      const source = `const el = <div />;`;
      const regions = classifyDocument(source);
      assertSegmentClassifiedAs(regions, source, "<div", "jsx");
    });

    it("hook arguments are classified as JavaScript", () => {
      const source = `useState(0)`;
      const regions = classifyDocument(source);
      assertSegmentClassifiedAs(regions, source, "useState", "react");
      assertSegmentClassifiedAs(regions, source, "0", "javascript");
    });

    it("hook callback is classified as JavaScript", () => {
      const source = `useEffect(() => { console.log("hi"); }, []);`;
      const regions = classifyDocument(source);
      assertSegmentClassifiedAs(regions, source, "useEffect", "react");
      assertSegmentClassifiedAs(regions, source, "console", "javascript");
    });
  });

  describe("complex mixed scenarios", () => {
    it("classifies a typed React component correctly", () => {
      const source = `const App: FC<{ name: string }> = ({ name }) => <div>{name}</div>;`;
      const regions = classifyDocument(source);
      assertSegmentClassifiedAs(regions, source, "const", "javascript");
      assertSegmentClassifiedAs(regions, source, "FC", "react");
      assertSegmentClassifiedAs(regions, source, "<div>", "jsx");
      assertSegmentClassifiedAs(regions, source, "</div>", "jsx");
    });

    it("classifies useState with type parameter correctly", () => {
      const source = `const [count, setCount] = useState<number>(0);`;
      const regions = classifyDocument(source);
      assertSegmentClassifiedAs(regions, source, "useState", "react");
      assertSegmentClassifiedAs(regions, source, "<number>", "typescript");
      assertSegmentClassifiedAs(regions, source, "0", "javascript");
    });

    it("classifies interface with React types correctly", () => {
      const source = `interface Props { onClick: MouseEvent; children: ReactNode; }`;
      const regions = classifyDocument(source);
      assertSegmentClassifiedAs(regions, source, "interface", "typescript");
      // React type names inside interfaces are classified as React (higher priority)
      // This shows developers "this type comes from React"
      assertSegmentClassifiedAs(regions, source, "MouseEvent", "react");
      assertSegmentClassifiedAs(regions, source, "ReactNode", "react");
    });

    it("classifies JSX with TypeScript in expression correctly", () => {
      const source = `<div>{(value as string).toUpperCase()}</div>`;
      const regions = classifyDocument(source);
      assertSegmentClassifiedAs(regions, source, "<div>", "jsx");
      assertSegmentClassifiedAs(regions, source, "as string", "typescript");
      assertSegmentClassifiedAs(regions, source, "toUpperCase", "javascript");
    });

    it("classifies generic function returning JSX correctly", () => {
      const source = `function List<T>({ items }: { items: T[] }): ReactElement { return <ul />; }`;
      const regions = classifyDocument(source);
      assertSegmentClassifiedAs(regions, source, "function", "javascript");
      assertSegmentClassifiedAs(regions, source, "<T>", "typescript");
      assertSegmentClassifiedAs(regions, source, "T[]", "typescript");
      assertSegmentClassifiedAs(regions, source, "ReactElement", "react");
      assertSegmentClassifiedAs(regions, source, "<ul", "jsx");
    });

    it("handles component with hooks and JSX", () => {
      const source = `
function Counter() {
  const [count, setCount] = useState(0);
  return <button onClick={() => setCount(c => c + 1)}>{count}</button>;
}`;
      const regions = classifyDocument(source);
      assertSegmentClassifiedAs(regions, source, "function", "javascript");
      assertSegmentClassifiedAs(regions, source, "useState", "react");
      assertSegmentClassifiedAs(regions, source, "<button", "jsx");
      assertSegmentClassifiedAs(regions, source, "onClick", "jsx");
      assertSegmentClassifiedAs(regions, source, "count}", "javascript");
    });
  });

  describe("edge cases", () => {
    it("handles empty string", () => {
      const regions = classifyDocument("");
      expect(regions).toHaveLength(0);
    });

    it("handles whitespace only", () => {
      const regions = classifyDocument("   \n\t  ");
      expect(regions).toHaveLength(0);
    });

    it("handles pure JavaScript without React/JSX/TS", () => {
      const source = `const x = 1 + 2;`;
      const regions = classifyDocument(source);
      expect(regions.every((r) => r.layer === "javascript")).toBe(true);
    });

    it("handles nested JSX expressions", () => {
      const source = `<div>{arr.map(x => <span>{x}</span>)}</div>`;
      const regions = classifyDocument(source);
      assertSegmentClassifiedAs(regions, source, "<div>", "jsx");
      assertSegmentClassifiedAs(regions, source, "<span>", "jsx");
      assertSegmentClassifiedAs(regions, source, "arr", "javascript");
      assertSegmentClassifiedAs(regions, source, "map", "javascript");
    });

    it("handles JSX spread attributes", () => {
      const source = `<Component {...props} />`;
      const regions = classifyDocument(source);
      assertSegmentClassifiedAs(regions, source, "<Component", "jsx");
      assertSegmentClassifiedAs(regions, source, "props", "javascript");
    });

    it("handles multiple hooks in sequence", () => {
      const source = `
const [a] = useState(1);
const [b] = useState(2);
const val = useMemo(() => a + b, [a, b]);`;
      const regions = classifyDocument(source);
      // Count React regions
      const reactRegions = regions.filter((r) => r.layer === "react");
      expect(reactRegions.length).toBeGreaterThan(0);
      // All hook names should be React
      expect(source.indexOf("useState")).toBeGreaterThan(-1);
      expect(source.indexOf("useMemo")).toBeGreaterThan(-1);
    });

    it("handles type assertions in JSX", () => {
      const source = `<div>{(foo as Bar).baz}</div>`;
      const regions = classifyDocument(source);
      assertSegmentClassifiedAs(regions, source, "as Bar", "typescript");
    });

    it("handles non-null assertion", () => {
      const source = `const x = value!;`;
      const regions = classifyDocument(source);
      // The ! should be TypeScript
      const bangIndex = source.indexOf("!");
      expect(getLayerAt(regions, bangIndex)).toBe("typescript");
    });

    it("handles getter with return type", () => {
      const source = `class Foo { get bar(): string { return ""; } }`;
      const regions = classifyDocument(source);
      assertSegmentClassifiedAs(regions, source, ": string", "typescript");
      assertSegmentClassifiedAs(regions, source, "get", "javascript");
    });

    it("handles setter with parameter type", () => {
      const source = `class Foo { set bar(value: string) {} }`;
      const regions = classifyDocument(source);
      assertSegmentClassifiedAs(regions, source, ": string", "typescript");
      assertSegmentClassifiedAs(regions, source, "set", "javascript");
    });

    it("handles property declarations with types", () => {
      const source = `class Foo { name: string = ""; age?: number; }`;
      const regions = classifyDocument(source);
      assertSegmentClassifiedAs(regions, source, ": string", "typescript");
      assertSegmentClassifiedAs(regions, source, "?: number", "typescript");
    });

    it("handles method with generics", () => {
      const source = `class Foo { bar<T>(x: T): T { return x; } }`;
      const regions = classifyDocument(source);
      assertSegmentClassifiedAs(regions, source, "<T>", "typescript");
    });

    it("handles function expression with types", () => {
      const source = `const fn = function<T>(x: T): T { return x; };`;
      const regions = classifyDocument(source);
      assertSegmentClassifiedAs(regions, source, "<T>", "typescript");
      // The return type annotation includes the colon
      assertSegmentClassifiedAs(regions, source, ": T", "typescript");
    });

    it("handles React.* calls beyond createElement", () => {
      const source = `const ctx = React.createContext(null);`;
      const regions = classifyDocument(source);
      assertSegmentClassifiedAs(regions, source, "React.createContext", "react");
    });

    it("handles useTransition hook", () => {
      const source = `const [isPending, startTransition] = useTransition();`;
      const regions = classifyDocument(source);
      assertSegmentClassifiedAs(regions, source, "useTransition", "react");
    });

    it("handles useDeferredValue hook", () => {
      const source = `const deferredValue = useDeferredValue(value);`;
      const regions = classifyDocument(source);
      assertSegmentClassifiedAs(regions, source, "useDeferredValue", "react");
    });

    it("handles useSyncExternalStore hook", () => {
      const source = `const snapshot = useSyncExternalStore(subscribe, getSnapshot);`;
      const regions = classifyDocument(source);
      assertSegmentClassifiedAs(regions, source, "useSyncExternalStore", "react");
    });

    it("returns non-overlapping regions", () => {
      const source = `const x: string = useState<number>(0);`;
      const regions = classifyDocument(source);

      // Check no overlaps
      for (let i = 0; i < regions.length - 1; i++) {
        expect(regions[i].end).toBeLessThanOrEqual(regions[i + 1].start);
      }
    });

    it("covers entire document without gaps for simple input", () => {
      const source = `const x = 1;`;
      const regions = classifyDocument(source);

      // All characters should be covered
      const covered = new Set<number>();
      for (const region of regions) {
        for (let i = region.start; i < region.end; i++) {
          covered.add(i);
        }
      }

      // Check that all non-whitespace is covered
      for (let i = 0; i < source.length; i++) {
        if (!/\s/.test(source[i])) {
          expect(covered.has(i)).toBe(true);
        }
      }
    });
  });

  describe("realistic component examples", () => {
    it("classifies a full functional component", () => {
      const source = `
import React, { useState, FC } from 'react';

interface Props {
  initialCount: number;
}

const Counter: FC<Props> = ({ initialCount }) => {
  const [count, setCount] = useState(initialCount);

  return (
    <div className="counter">
      <span>{count}</span>
      <button onClick={() => setCount(c => c + 1)}>+</button>
    </div>
  );
};

export default Counter;
`;
      const regions = classifyDocument(source);

      // Verify key classifications
      assertSegmentClassifiedAs(regions, source, "import", "javascript");
      assertSegmentClassifiedAs(regions, source, "interface", "typescript");
      assertSegmentClassifiedAs(regions, source, "initialCount: number", "typescript");
      // FC in import statement is JavaScript (it's just an identifier in import)
      // FC as a type annotation reference is classified as React
      const fcTypeIndex = source.indexOf("Counter: FC");
      const fcOrigin = getLayerAt(regions, fcTypeIndex + "Counter: ".length);
      expect(fcOrigin).toBe("react");
      // Find useState call (not the import)
      const useStateCallIndex = source.indexOf("useState(initialCount)");
      const useStateOrigin = getLayerAt(regions, useStateCallIndex);
      expect(useStateOrigin).toBe("react");
      assertSegmentClassifiedAs(regions, source, "className", "jsx");
      assertSegmentClassifiedAs(regions, source, "<div", "jsx");
      assertSegmentClassifiedAs(regions, source, "export", "javascript");
    });

    it("classifies a component with useEffect", () => {
      const source = `
function DataFetcher({ url }: { url: string }) {
  const [data, setData] = useState<string | null>(null);

  useEffect(() => {
    fetch(url).then(r => r.text()).then(setData);
  }, [url]);

  return <pre>{data}</pre>;
}
`;
      const regions = classifyDocument(source);

      assertSegmentClassifiedAs(regions, source, "function", "javascript");
      assertSegmentClassifiedAs(regions, source, "url: string", "typescript");
      assertSegmentClassifiedAs(regions, source, "useState", "react");
      assertSegmentClassifiedAs(regions, source, "string | null", "typescript");
      assertSegmentClassifiedAs(regions, source, "useEffect", "react");
      assertSegmentClassifiedAs(regions, source, "fetch", "javascript");
      assertSegmentClassifiedAs(regions, source, "<pre>", "jsx");
    });

    it("classifies a component with context", () => {
      const source = `
const ThemeContext = React.createContext<'light' | 'dark'>('light');

function ThemedButton() {
  const theme = useContext(ThemeContext);
  return <button className={theme}>Click</button>;
}
`;
      const regions = classifyDocument(source);

      assertSegmentClassifiedAs(regions, source, "React.createContext", "react");
      // Type arguments are TypeScript, even on React.* calls
      assertSegmentClassifiedAs(regions, source, "'light' | 'dark'", "typescript");
      // Arguments to React.* calls are JavaScript
      assertSegmentClassifiedAs(regions, source, "('light')", "javascript");
      assertSegmentClassifiedAs(regions, source, "useContext", "react");
      assertSegmentClassifiedAs(regions, source, "<button", "jsx");
    });

    it("classifies a list component with key prop", () => {
      const source = `
function ItemList({ items }: { items: string[] }) {
  return (
    <ul>
      {items.map((item, index) => (
        <li key={index}>{item}</li>
      ))}
    </ul>
  );
}
`;
      const regions = classifyDocument(source);

      assertSegmentClassifiedAs(regions, source, "items: string[]", "typescript");
      assertSegmentClassifiedAs(regions, source, "<ul>", "jsx");
      assertSegmentClassifiedAs(regions, source, "items.map", "javascript");
      assertSegmentClassifiedAs(regions, source, "key", "react");
      assertSegmentClassifiedAs(regions, source, "<li", "jsx");
    });
  });

  describe("Critical edge cases", () => {
    describe("Angle-bracket type assertions", () => {
      // Note: In TSX mode, <Type>value is parsed as JSX, not as a type assertion.
      // This is a TypeScript/TSX limitation - you must use `as Type` syntax in TSX files.
      // The TypeAssertionExpression handling exists for .ts files parsed as TSX,
      // but in practice TSX parsing treats <...> as JSX syntax.
      it("recognizes TSX limitation: angle-bracket syntax is parsed as JSX in TSX mode", () => {
        const source = `const x = <string>someValue;`;
        const regions = classifyDocument(source);
        // In TSX mode, this is parsed as a JSX self-closing element <string />
        // with "someValue" as trailing content, not as a type assertion
        assertSegmentClassifiedAs(regions, source, "<string>", "jsx");
      });
    });

    describe("JSX spread attributes with whitespace", () => {
      it("handles spread without whitespace: {...props}", () => {
        const source = `<div {...props} />`;
        const regions = classifyDocument(source);
        assertSegmentClassifiedAs(regions, source, "{...", "jsx");
        assertSegmentClassifiedAs(regions, source, "props", "javascript");
      });

      it("handles spread with whitespace: { ...props }", () => {
        const source = `<div { ...props } />`;
        const regions = classifyDocument(source);
        // The '{ ...' part should be JSX
        const openBraceIndex = source.indexOf("{");
        const layer = getLayerAt(regions, openBraceIndex);
        expect(layer).toBe("jsx");
        // Props should be JavaScript
        assertSegmentClassifiedAs(regions, source, "props", "javascript");
      });
    });

    describe("Individual type modifiers in imports", () => {
      it("classifies 'type' specifier in mixed import as TypeScript", () => {
        const source = `import { type Foo, Bar } from 'module';`;
        const regions = classifyDocument(source);
        assertSegmentClassifiedAs(regions, source, "type ", "typescript");
        assertSegmentClassifiedAs(regions, source, "import", "javascript");
      });

      it("classifies multiple type specifiers in import", () => {
        const source = `import { type Foo, type Bar, Baz } from 'module';`;
        const regions = classifyDocument(source);
        assertSegmentClassifiedAs(regions, source, "type Foo", "typescript");
        assertSegmentClassifiedAs(regions, source, "type Bar", "typescript");
      });

      it("classifies React type in type-only import specifier as React", () => {
        const source = `import { type ReactNode } from "react";`;
        const regions = classifyDocument(source);
        assertSegmentClassifiedAs(regions, source, "type ", "typescript");
        assertSegmentClassifiedAs(regions, source, "ReactNode", "react");
      });

      it("classifies React type in full type-only import as React", () => {
        const source = `import type { ReactNode, FC } from "react";`;
        const regions = classifyDocument(source);
        assertSegmentClassifiedAs(regions, source, "import type", "typescript");
        assertSegmentClassifiedAs(regions, source, "ReactNode", "react");
        assertSegmentClassifiedAs(regions, source, "FC", "react");
      });

      it("classifies mixed React and non-React types in import", () => {
        const source = `import { type ReactNode, type SomeOther } from "react";`;
        const regions = classifyDocument(source);
        assertSegmentClassifiedAs(regions, source, "ReactNode", "react");
        assertSegmentClassifiedAs(regions, source, "SomeOther", "typescript");
      });
    });

    describe("Individual type modifiers in exports", () => {
      it("classifies 'type' specifier in mixed export as TypeScript", () => {
        const source = `export { type Foo, Bar };`;
        const regions = classifyDocument(source);
        assertSegmentClassifiedAs(regions, source, "type ", "typescript");
        assertSegmentClassifiedAs(regions, source, "export", "javascript");
      });

      it("classifies React type in type-only export specifier as React", () => {
        const source = `export { type ReactNode };`;
        const regions = classifyDocument(source);
        assertSegmentClassifiedAs(regions, source, "type ", "typescript");
        assertSegmentClassifiedAs(regions, source, "ReactNode", "react");
      });

      it("classifies React type in full type-only export as React", () => {
        const source = `export type { ReactNode, FC };`;
        const regions = classifyDocument(source);
        assertSegmentClassifiedAs(regions, source, "export type", "typescript");
        assertSegmentClassifiedAs(regions, source, "ReactNode", "react");
        assertSegmentClassifiedAs(regions, source, "FC", "react");
      });
    });

    describe("Bare React utility functions", () => {
      it("classifies memo() as React", () => {
        const source = `const MyComp = memo(() => <div />);`;
        const regions = classifyDocument(source);
        assertSegmentClassifiedAs(regions, source, "memo", "react");
      });

      it("classifies forwardRef() as React", () => {
        const source = `const MyInput = forwardRef((props, ref) => <input ref={ref} />);`;
        const regions = classifyDocument(source);
        assertSegmentClassifiedAs(regions, source, "forwardRef", "react");
      });

      it("classifies lazy() as React", () => {
        const source = `const LazyComp = lazy(() => import('./MyComp'));`;
        const regions = classifyDocument(source);
        assertSegmentClassifiedAs(regions, source, "lazy", "react");
      });

      it("classifies createContext() as React", () => {
        const source = `const MyContext = createContext(null);`;
        const regions = classifyDocument(source);
        assertSegmentClassifiedAs(regions, source, "createContext", "react");
      });

      it("classifies createRef() as React", () => {
        const source = `const myRef = createRef();`;
        const regions = classifyDocument(source);
        assertSegmentClassifiedAs(regions, source, "createRef", "react");
      });

      it("classifies cloneElement() as React", () => {
        const source = `const cloned = cloneElement(element, { newProp: true });`;
        const regions = classifyDocument(source);
        assertSegmentClassifiedAs(regions, source, "cloneElement", "react");
      });

      it("classifies isValidElement() as React", () => {
        const source = `if (isValidElement(node)) { }`;
        const regions = classifyDocument(source);
        assertSegmentClassifiedAs(regions, source, "isValidElement", "react");
      });
    });

    describe("Extended React types", () => {
      it("classifies ComponentProps as React type", () => {
        const source = `type Props = ComponentProps<typeof Button>;`;
        const regions = classifyDocument(source);
        assertSegmentClassifiedAs(regions, source, "ComponentProps", "react");
      });

      it("classifies HTMLAttributes as React type", () => {
        const source = `interface Props extends HTMLAttributes<HTMLDivElement> {}`;
        const regions = classifyDocument(source);
        assertSegmentClassifiedAs(regions, source, "HTMLAttributes", "react");
      });

      it("classifies CSSProperties as React type", () => {
        const source = `const style: CSSProperties = { color: 'red' };`;
        const regions = classifyDocument(source);
        assertSegmentClassifiedAs(regions, source, "CSSProperties", "react");
      });

      it("classifies FocusEvent as React type", () => {
        const source = `function handleFocus(e: FocusEvent<HTMLInputElement>) {}`;
        const regions = classifyDocument(source);
        assertSegmentClassifiedAs(regions, source, "FocusEvent", "react");
      });

      it("classifies ForwardedRef as React type", () => {
        const source = `function MyComp(props: Props, ref: ForwardedRef<HTMLDivElement>) {}`;
        const regions = classifyDocument(source);
        assertSegmentClassifiedAs(regions, source, "ForwardedRef", "react");
      });
    });

    describe("override keyword", () => {
      it("classifies override modifier on methods as TypeScript", () => {
        const source = `class Child extends Parent { override handleClick() { } }`;
        const regions = classifyDocument(source);
        assertSegmentClassifiedAs(regions, source, "override", "typescript");
        assertSegmentClassifiedAs(regions, source, "handleClick", "javascript");
      });

      it("classifies override with access modifier as TypeScript", () => {
        const source = `class Child extends Parent { public override render() { } }`;
        const regions = classifyDocument(source);
        assertSegmentClassifiedAs(regions, source, "public", "typescript");
        assertSegmentClassifiedAs(regions, source, "override", "typescript");
      });
    });

    describe("readonly in type positions", () => {
      it("classifies readonly array type as TypeScript", () => {
        const source = `function process(arr: readonly string[]) { }`;
        const regions = classifyDocument(source);
        assertSegmentClassifiedAs(regions, source, "readonly string[]", "typescript");
      });

      it("classifies ReadonlyArray generic as TypeScript", () => {
        const source = `function process(arr: ReadonlyArray<string>) { }`;
        const regions = classifyDocument(source);
        assertSegmentClassifiedAs(regions, source, "ReadonlyArray<string>", "typescript");
      });
    });

    describe("enum member access", () => {
      it("classifies enum member access as TypeScript", () => {
        const source = `enum Status { Active, Inactive } const s = Status.Active;`;
        const regions = classifyDocument(source);
        assertSegmentClassifiedAs(regions, source, "enum Status", "typescript");
        assertSegmentClassifiedAs(regions, source, "Status.Active", "typescript");
      });

      it("classifies multiple enum member accesses as TypeScript", () => {
        const source = `enum Color { Red, Green, Blue } const c1 = Color.Red; const c2 = Color.Blue;`;
        const regions = classifyDocument(source);
        assertSegmentClassifiedAs(regions, source, "Color.Red", "typescript");
        assertSegmentClassifiedAs(regions, source, "Color.Blue", "typescript");
      });

      it("does not affect non-enum property access", () => {
        const source = `const obj = { foo: 1 }; const x = obj.foo;`;
        const regions = classifyDocument(source);
        assertSegmentClassifiedAs(regions, source, "obj.foo", "javascript");
      });
    });

    describe("this type", () => {
      it("classifies this as return type as TypeScript", () => {
        const source = `class Foo { clone(): this { return this; } }`;
        const regions = classifyDocument(source);
        assertSegmentClassifiedAs(regions, source, ": this", "typescript");
      });

      it("classifies this in type position as TypeScript", () => {
        const source = `class Builder { private self: this; }`;
        const regions = classifyDocument(source);
        assertSegmentClassifiedAs(regions, source, ": this", "typescript");
      });
    });

    describe("using declarations (TS 5.2+)", () => {
      it("classifies using keyword as TypeScript", () => {
        const source = `using file = getFile();`;
        const regions = classifyDocument(source);
        assertSegmentClassifiedAs(regions, source, "using ", "typescript");
      });

      it("classifies await using keyword as TypeScript", () => {
        const source = `await using db = await connect();`;
        const regions = classifyDocument(source);
        assertSegmentClassifiedAs(regions, source, "await using ", "typescript");
      });
    });

    describe("accessor keyword (TS 4.9+)", () => {
      it("classifies accessor keyword as TypeScript", () => {
        const source = `class Foo { accessor name = ""; }`;
        const regions = classifyDocument(source);
        assertSegmentClassifiedAs(regions, source, "accessor", "typescript");
      });

      it("classifies accessor with type annotation", () => {
        const source = `class Foo { accessor count: number = 0; }`;
        const regions = classifyDocument(source);
        assertSegmentClassifiedAs(regions, source, "accessor", "typescript");
        assertSegmentClassifiedAs(regions, source, ": number", "typescript");
      });
    });

    describe("instantiation expressions (TS 4.7+)", () => {
      it("classifies instantiation expression type arguments as TypeScript", () => {
        const source = `const StringSet = Set<string>;`;
        const regions = classifyDocument(source);
        assertSegmentClassifiedAs(regions, source, "<string>", "typescript");
      });

      it("classifies nested instantiation expression type arguments as TypeScript", () => {
        const source = `const StringMap = Map<string, Set<number>>;`;
        const regions = classifyDocument(source);
        assertSegmentClassifiedAs(regions, source, "<string, Set<number>>", "typescript");
      });
    });

    describe("const type parameter modifier (TS 5.0+)", () => {
      it("classifies const type parameter as TypeScript", () => {
        const source = `function foo<const T>(x: T): T { return x; }`;
        const regions = classifyDocument(source);
        assertSegmentClassifiedAs(regions, source, "<const T>", "typescript");
      });

      it("classifies const with extends constraint as TypeScript", () => {
        const source = `function bar<const T extends readonly string[]>(x: T) { return x; }`;
        const regions = classifyDocument(source);
        assertSegmentClassifiedAs(regions, source, "<const T extends readonly string[]>", "typescript");
      });
    });

    describe("additional React types", () => {
      it("classifies ElementRef as React type", () => {
        const source = `type Ref = ElementRef<typeof Button>;`;
        const regions = classifyDocument(source);
        assertSegmentClassifiedAs(regions, source, "ElementRef", "react");
      });

      it("classifies ComponentRef as React type", () => {
        const source = `type Ref = ComponentRef<typeof MyComponent>;`;
        const regions = classifyDocument(source);
        assertSegmentClassifiedAs(regions, source, "ComponentRef", "react");
      });

      it("classifies Key as React type", () => {
        const source = `interface Props { id: Key; }`;
        const regions = classifyDocument(source);
        assertSegmentClassifiedAs(regions, source, "Key", "react");
      });

      it("classifies JSX.Element as React type", () => {
        const source = `function render(): JSX.Element { return <div />; }`;
        const regions = classifyDocument(source);
        assertSegmentClassifiedAs(regions, source, "JSX.Element", "react");
      });

      it("classifies JSX.IntrinsicElements as React type", () => {
        const source = `type DivProps = JSX.IntrinsicElements['div'];`;
        const regions = classifyDocument(source);
        assertSegmentClassifiedAs(regions, source, "JSX.IntrinsicElements", "react");
      });
    });
  });
});
