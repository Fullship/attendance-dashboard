/**
 * Middleware to ensure safe JSON responses by handling UTF-16 encoding issues
 */

const { safeJSONStringify, safeJsonObject } = require('../utils/stringUtils');

/**
 * Middleware that overrides res.json to safely handle UTF-16 characters
 */
function safeJsonMiddleware() {
  return (req, res, next) => {
    // Store the original json method
    const originalJson = res.json;
    
    // Override the json method
    res.json = function(obj) {
      try {
        // Clean the object for safe JSON serialization
        const safeObj = safeJsonObject(obj);
        
        // Call the original json method with the cleaned object
        return originalJson.call(this, safeObj);
      } catch (error) {
        console.error('Safe JSON middleware error:', error);
        
        // Fallback to error response
        const errorResponse = {
          error: 'Response serialization failed',
          message: 'Unable to serialize response data safely',
          timestamp: new Date().toISOString()
        };
        
        return originalJson.call(this, errorResponse);
      }
    };
    
    next();
  };
}

/**
 * Alternative approach: Override JSON.stringify globally for this process
 * Use with caution as it affects all JSON.stringify calls
 */
function overrideGlobalJSONStringify() {
  const originalStringify = JSON.stringify;
  
  JSON.stringify = function(value, replacer, space) {
    try {
      // Clean the value first
      const safeValue = safeJsonObject(value);
      return originalStringify(safeValue, replacer, space);
    } catch (error) {
      console.error('Global JSON.stringify override error:', error);
      
      // Fallback to original method with error handling
      try {
        return originalStringify(value, replacer, space);
      } catch (innerError) {
        console.error('Fallback JSON.stringify also failed:', innerError);
        return originalStringify({
          error: 'JSON serialization failed',
          message: error.message,
          originalType: typeof value
        }, replacer, space);
      }
    }
  };
  
  console.log('JSON.stringify has been overridden with UTF-16 safety measures');
}

module.exports = {
  safeJsonMiddleware,
  overrideGlobalJSONStringify
};