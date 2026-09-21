import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import ts from "typescript";

const root = path.resolve("src");
const failOnFindings = process.argv.includes("--fail-on-findings");
const attributeNames = new Set([
  "alt",
  "aria-description",
  "aria-label",
  "caption",
  "description",
  "emptyMessage",
  "helperText",
  "label",
  "placeholder",
  "subtitle",
  "title",
  "tooltip",
]);
const objectPropertyNames = new Set([
  "caption",
  "description",
  "emptyMessage",
  "helperText",
  "label",
  "placeholder",
  "subtitle",
  "title",
  "tooltip",
]);
const toastMethods = new Set([
  "error",
  "info",
  "loading",
  "success",
  "warning",
]);
const intentionalTechnicalLabels = new Set([
  "AI",
  "Archive",
  "Audio",
  "Code",
  "CSV",
  "Ctrl+Shift+P",
  "Email:",
  "Enter",
  "File",
  "GIFT",
  "h",
  "hutech, hcmut...",
  "Image",
  "LO",
  "Markdown",
  "Moodle XML",
  "ms",
  "PDF",
  "Q",
  "s",
  "Sheet",
  "Shift",
  "Slides",
  "Text",
  "tok",
  "UUID:",
  "v",
  "Video",
  "Word",
  "XLSX",
  "(L.O.",
]);
const intentionalBrandLabels = new Set([
  "aBridge",
  "aBridgeAI",
  "aBridgeAI Learning Systems.",
  "The Cognitive Conduit",
]);

function collectTsxFiles(directory) {
  const files = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== "__tests__") files.push(...collectTsxFiles(fullPath));
      continue;
    }
    if (
      entry.name.endsWith(".tsx") &&
      !entry.name.endsWith(".test.tsx") &&
      !entry.name.endsWith(".spec.tsx")
    ) {
      files.push(fullPath);
    }
  }
  return files;
}

function normaliseText(value) {
  return value.replace(/\s+/g, " ").trim();
}

function looksUserFacing(value) {
  const text = normaliseText(value);
  if (!text || !/\p{L}/u.test(text)) return false;
  if (intentionalTechnicalLabels.has(text) || intentionalBrandLabels.has(text))
    return false;
  if (text === "&copy;" || /^[\w.+-]+@[\w.-]+(?:\s|$)/.test(text)) return false;
  if (/^(https?:|mailto:|tel:|\/|\.\/|\.\.\/)/i.test(text)) return false;
  if (/^[a-z][a-z0-9]*(?:[._:/-][a-z0-9]+)+$/i.test(text)) return false;
  return true;
}

function propertyName(node) {
  if (!node) return undefined;
  if (ts.isIdentifier(node) || ts.isStringLiteral(node)) return node.text;
  return undefined;
}

function literalText(node) {
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
    return node.text;
  }
  return undefined;
}

function expressionStrings(node) {
  const direct = literalText(node);
  if (direct !== undefined) return [direct];
  if (ts.isParenthesizedExpression(node))
    return expressionStrings(node.expression);
  if (ts.isConditionalExpression(node)) {
    return [
      ...expressionStrings(node.whenTrue),
      ...expressionStrings(node.whenFalse),
    ];
  }
  return [];
}

const findings = [];

function addFinding(sourceFile, node, kind, value) {
  const text = normaliseText(value);
  if (!looksUserFacing(text)) return;
  const { line, character } = sourceFile.getLineAndCharacterOfPosition(
    node.getStart(sourceFile),
  );
  findings.push({
    file: path
      .relative(process.cwd(), sourceFile.fileName)
      .replaceAll("\\", "/"),
    line: line + 1,
    column: character + 1,
    kind,
    text,
  });
}

function scanFile(file) {
  const source = fs.readFileSync(file, "utf8");
  const sourceFile = ts.createSourceFile(
    file,
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );

  function visit(node) {
    if (ts.isJsxText(node)) {
      addFinding(sourceFile, node, "JSX text", node.getText(sourceFile));
    } else if (
      ts.isJsxExpression(node) &&
      node.expression &&
      !ts.isJsxAttribute(node.parent)
    ) {
      for (const value of expressionStrings(node.expression)) {
        addFinding(sourceFile, node.expression, "JSX expression", value);
      }
    } else if (ts.isJsxAttribute(node)) {
      const name = node.name.getText(sourceFile);
      if (attributeNames.has(name) && node.initializer) {
        if (ts.isStringLiteral(node.initializer)) {
          addFinding(
            sourceFile,
            node.initializer,
            `JSX ${name}`,
            node.initializer.text,
          );
        } else if (
          ts.isJsxExpression(node.initializer) &&
          node.initializer.expression
        ) {
          for (const value of expressionStrings(node.initializer.expression)) {
            addFinding(
              sourceFile,
              node.initializer.expression,
              `JSX ${name}`,
              value,
            );
          }
        }
      }
    } else if (ts.isPropertyAssignment(node)) {
      const name = propertyName(node.name);
      const value = literalText(node.initializer);
      if (name && objectPropertyNames.has(name) && value !== undefined) {
        addFinding(sourceFile, node.initializer, `object ${name}`, value);
      }
    } else if (
      ts.isCallExpression(node) &&
      ts.isPropertyAccessExpression(node.expression)
    ) {
      const owner = node.expression.expression.getText(sourceFile);
      const method = node.expression.name.text;
      if (owner === "toast" && toastMethods.has(method) && node.arguments[0]) {
        const value = literalText(node.arguments[0]);
        if (value !== undefined)
          addFinding(sourceFile, node.arguments[0], `toast.${method}`, value);
      }
    }
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
}

for (const file of collectTsxFiles(root)) scanFile(file);

findings.sort(
  (a, b) =>
    a.file.localeCompare(b.file) || a.line - b.line || a.column - b.column,
);

for (const finding of findings) {
  console.log(
    `${finding.file}:${finding.line}:${finding.column}  [${finding.kind}] ${finding.text}`,
  );
}

console.log(
  `\n${findings.length} probable untranslated UI string(s) in ${new Set(findings.map((item) => item.file)).size} TSX file(s).`,
);
console.log(
  "Review the list: this scanner intentionally reports probable matches and may include product names or technical labels.",
);

if (failOnFindings && findings.length > 0) process.exitCode = 1;
