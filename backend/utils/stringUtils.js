/**
 * String utilities for handling UTF-8/UTF-16 encoding issues
 */

/**
 * Safely encode text to prevent UTF-16 surrogate pair issues
 * JavaScript equivalent of Python's .encode("utf-8", "replace").decode("utf-8")
 * 
 * @param {string} text - The text to safely encode
 * @returns {string} - Safely encoded text
 */
function safeEncodeText(text) {
  if (typeof text !== 'string') {
    return text;
  }

  try {
    // Convert to buffer and back to handle broken surrogate pairs
    const buffer = Buffer.from(text, 'utf8');
    return buffer.toString('utf8');
  } catch (error) {
    console.warn('String encoding error, applying fallback:', error.message);
    
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
 * 
 * @param {any} obj - The object to clean
 * @returns {any} - The cleaned object
 */
function safeJsonObject(obj) {
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
    const cleanObj = {};
    for (const [key, value] of Object.entries(obj)) {
      const cleanKey = safeEncodeText(key);
      cleanObj[cleanKey] = safeJsonObject(value);
    }
    return cleanObj;
  }

  return obj;
}

/**
 * Safe JSON.stringify that handles UTF-16 encoding issues
 * 
 * @param {any} obj - Object to stringify
 * @param {Function} replacer - Optional replacer function
 * @param {number|string} space - Optional space parameter
 * @returns {string} - Safe JSON string
 */
function safeJSONStringify(obj, replacer = null, space = null) {
  try {
    const cleanObj = safeJsonObject(obj);
    return JSON.stringify(cleanObj, replacer, space);
  } catch (error) {
    console.error('JSON stringify error:', error.message);
    // Return a fallback object with error info
    return JSON.stringify({
      error: 'JSON serialization failed',
      message: safeEncodeText(error.message),
      originalType: typeof obj
    });
  }
}

module.exports = {
  safeEncodeText,
  safeJsonObject,
  safeJSONStringify
};