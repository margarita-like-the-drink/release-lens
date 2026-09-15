const EXTENSION_LANGUAGE: Record<string, string> = {
  ts: 'typescript',
  tsx: 'typescript',
  js: 'javascript',
  jsx: 'javascript',
  mjs: 'javascript',
  cjs: 'javascript',
  py: 'python',
  java: 'java',
  cs: 'csharp',
  go: 'go',
  rb: 'ruby',
  sql: 'sql',
  yml: 'yaml',
  yaml: 'yaml',
  json: 'json',
  css: 'css',
  scss: 'css',
  less: 'css',
  md: 'markdown',
  mdx: 'markdown',
};

export function detectLanguage(path: string): string | null {
  const match = /\.([A-Za-z0-9]+)$/.exec(path);
  if (!match) return null;
  const ext = match[1]?.toLowerCase() ?? '';
  return EXTENSION_LANGUAGE[ext] ?? null;
}

export function extensionOf(path: string): string | null {
  const match = /\.([A-Za-z0-9]+)$/.exec(path);
  return match ? (match[1]?.toLowerCase() ?? null) : null;
}
