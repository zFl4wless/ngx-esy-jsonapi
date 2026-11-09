interface Token {
  text: string;
  kind: string;
}

const patterns = {
  json: /(?<key>"(?:\\.|[^"\\])*"(?=\s*:))|(?<string>"(?:\\.|[^"\\])*")|(?<literal>\b(?:true|false|null)\b|-?\b\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)/g,
  typescript: /(?<comment>\/\/[^\n]*)|(?<string>'(?:\\.|[^'\\])*'|"(?:\\.|[^"\\])*")|(?<keyword>\b(?:const|let|return|new|import|from|export|class)\b)|(?<literal>\b(?:true|false|null|undefined|\d+)\b)|(?<function>\b[A-Za-z_$][\w$]*(?=\s*\())|(?<type>\b[A-Z][\w$]*)/g,
};

// Keep source text intact and let Angular escape it when rendering the spans.
// The TypeScript pattern covers the syntax used by the read-only examples.
export function highlight(source: string, language: keyof typeof patterns): Token[] {
  const tokens: Token[] = [];
  let offset = 0;
  for (const match of source.matchAll(patterns[language])) {
    tokens.push({ text: source.slice(offset, match.index), kind: '' });
    const kind = Object.keys(match.groups!).find(name => match.groups![name] !== undefined)!;
    tokens.push({ text: match[0], kind });
    offset = match.index + match[0].length;
  }
  tokens.push({ text: source.slice(offset), kind: '' });
  return tokens;
}
