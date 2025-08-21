/**
 * String utilities for handling UTF-8/UTF-16 encoding issues in the frontend
 */

/**
 * Safely encode text to prevent UTF-16 surrogate pair issues
 * JavaScript equivalent of Python's .encode("utf-8", "replace").decode("utf-8")
 * 
 * @param text - The text to safely encode
 * @returns Safely encoded text
 */
export function safeEncodeText(text: unknown): unknown {
  if (typeof text !== 'string') {
    return text;
  }

  try {
    // Use TextEncoder/TextDecoder for proper UTF-8 handling
    const encoder = new TextEncoder();
    const decoder = new TextDecoder('utf-8', { fatal: false });
    
    const encoded = encoder.encode(text);
    return decoder.decode(encoded);
  } catch (error) {
    console.warn('String encoding error, applying fallback:', error);
    
    // Fallback: Replace invalid characters with replacement character
    return text.replace(/[\uD800-\uDFFF]/g, (match, offset, string) => {
      const code = match.charCodeAt(0);
      
      // Check if it's a high surrogate
      if (code >= 0xD800 && code <= 0xDBFF) {
        // Check if there's a matching low surrogate
        const nextChar = string.charAt(offset + 1);
        if (nextChar) {
          const nextCode = nextChar.charCodeAt(0);
          if (nextCode >= 0xDC00 && nextCode <= 0xDFFF) {
            // Valid surrogate pair, keep it
            return match;
          }
        }
        // Invalid high surrogate, replace it
        return '\uFFFD'; // Unicode replacement character
      }
      
      // Check if it's a low surrogate
      if (code >= 0xDC00 && code <= 0xDFFF) {
        // Check if there's a matching high surrogate before it
        const prevChar = string.charAt(offset - 1);
        if (prevChar) {
          const prevCode = prevChar.charCodeAt(0);
          if (prevCode >= 0xD800 && prevCode <= 0xDBFF) {
            // Valid surrogate pair, keep it
            return match;
          }
        }
        // Invalid low surrogate, replace it
        return '\uFFFD'; // Unicode replacement character
      }
      
      // Other invalid characters
      return '\uFFFD';
    });
  }
}

/**
 * Recursively clean an object's string properties for safe JSON serialization
 */
export function safeJsonObject(obj: unknown): unknown {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (typeof obj === 'string') {
    return safeEncodeText(obj);
  }

  if (typeof obj === 'number' || typeof obj === 'boolean') {
    return obj;
  }

  if (obj instanceof Date) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(safeJsonObject);
  }

  if (typeof obj === 'object') {
    const cleanObj: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      const cleanKey = safeEncodeText(key) as string;
      cleanObj[cleanKey] = safeJsonObject(value);
    }
    return cleanObj;
  }

  return obj;
}

/**
 * Safe JSON.stringify that handles UTF-16 encoding issues
 */
export function safeJSONStringify(obj: unknown, replacer?: (this: any, key: string, value: any) => any | null, space?: string | number): string {
  try {
    const cleanObj = safeJsonObject(obj);
    return JSON.stringify(cleanObj, replacer, space);
  } catch (error) {
    console.error('JSON stringify error:', error);
    // Return a fallback object with error info
    return JSON.stringify({
      error: 'JSON serialization failed',
      message: safeEncodeText((error as Error).message),
      originalType: typeof obj
    });
  }
}

/**
 * Safe JSON.parse with error handling
 */
export function safeJSONParse<T = unknown>(jsonString: string, defaultValue?: T): T | undefined {
  try {
    const parsed = JSON.parse(jsonString);
    return safeJsonObject(parsed) as T;
  } catch (error) {
    console.error('JSON parse error:', error);
    return defaultValue;
  }
}