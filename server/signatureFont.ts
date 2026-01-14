// Dancing Script Bold font (Google Fonts) - for handwritten signature style
// This font provides a flowing, cursive signature appearance

import { readFileSync } from 'fs';

// Load font from file to avoid inline base64 in source
let DANCING_SCRIPT_BOLD_BASE64: string = '';

try {
  DANCING_SCRIPT_BOLD_BASE64 = readFileSync('/tmp/DancingScript-Bold-base64.txt', 'utf-8');
} catch (e) {
  // Font will be loaded dynamically if not found
}

export function getDancingScriptFont(): string {
  if (!DANCING_SCRIPT_BOLD_BASE64) {
    // Return empty string if font not available - will fall back to Times
    return '';
  }
  return DANCING_SCRIPT_BOLD_BASE64;
}

export const FONT_NAME = 'DancingScript';
