import type { ChangedFile } from '../domain/types.js';

const OPTIONAL_FIELD_RE = /^\s*['"]?([A-Za-z_$][\w$]*)['"]?\?\s*:/;
const REQUIRED_FIELD_RE = /^\s*['"]?([A-Za-z_$][\w$]*)['"]?\s*:/;

/**
 * Looks for a field that changed from optional (`field?:`) to required
 * (`field:`) within the same diff hunk of a TypeScript/JavaScript type,
 * interface, or schema-like declaration. This is intentionally narrow: it
 * catches the common "optional became required" contract break without
 * attempting full type-level analysis.
 */
export function detectOptionalToRequiredFields(file: ChangedFile): string[] {
  const fields = new Set<string>();

  for (const hunk of file.hunks) {
    const removedOptional = new Set<string>();
    for (const line of hunk.lines) {
      if (line.type !== 'del') continue;
      const match = OPTIONAL_FIELD_RE.exec(line.content);
      if (match?.[1]) removedOptional.add(match[1]);
    }
    if (removedOptional.size === 0) continue;

    for (const line of hunk.lines) {
      if (line.type !== 'add') continue;
      if (OPTIONAL_FIELD_RE.test(line.content)) continue;
      const match = REQUIRED_FIELD_RE.exec(line.content);
      const field = match?.[1];
      if (field && removedOptional.has(field)) {
        fields.add(field);
      }
    }
  }

  return Array.from(fields);
}
