const compression = require('compression');

/**
 * Compression middleware configuration for Express
 * Enables gzip compression for JSON, HTML, and other text-based responses
 */
const compressionMiddleware = compression({
  // Compression level (1-9, where 9 is best compression but slowest)
  level: 6,

  // Set minimum bytes to compress (default is 1024)
  threshold: 1024,

  // Custom filter function to determine what to compress
  filter: (req, res) => {
    // Don't compress responses if this request has a 'x-no-compression' header
    if (req.headers['x-no-compression']) {
      return false;
    }

    const contentType = res.getHeader('Content-Type') || '';

    // Always compress these content types (including JSON and HTML)
    const compressibleTypes = [
      'application/json',
      'text/html',
      'text/css',
      'text/javascript',
      'application/javascript',
      'text/plain',
      'text/xml',
      'application/xml',
      'application/xml+rss',
      'text/csv',
      'application/csv',
    ];

    // Check if the content type should be compressed
    const shouldCompress = compressibleTypes.some(type => contentType.toLowerCase().includes(type));

    if (shouldCompress) {
      return true;
    }

    // Use default compression filter for other types
    return compression.filter(req, res);
  },

  // Memory level (1-9, affects memory usage vs speed)
  memLevel: 8,

  // Window size (affects compression ratio and memory usage)
  windowBits: 15,
});

/**
 * Middleware to log compression statistics
 */
const compressionLogger = (req, res, next) => {
  const originalEnd = res.end;
  const startTime = Date.now();
  let originalSize = 0;

  // Override res.end to capture response size
  res.end = function (chunk, encoding) {
    if (chunk) {
      originalSize += Buffer.isBuffer(chunk) ? chunk.length : Buffer.byteLength(chunk, encoding);
    }

    const endTime = Date.now();
    const duration = endTime - startTime;

    // Check if response was compressed
    const isCompressed = res.getHeader('Content-Encoding') === 'gzip';
    const contentType = res.getHeader('Content-Type') || 'unknown';

    // Log compression info for development
    if (process.env.NODE_ENV === 'development' && originalSize > 1024) {
      console.log(`🗜️  Compression Info:
        📄 ${req.method} ${req.url}
        📊 Content-Type: ${contentType}
        🗜️  Compressed: ${isCompressed ? '✅ Yes' : '❌ No'}
        📏 Original Size: ${(originalSize / 1024).toFixed(2)}KB
        ⏱️  Duration: ${duration}ms
        💾 Status: ${res.statusCode}`);
    }

    originalEnd.call(this, chunk, encoding);
  };

  next();
};

module.exports = {
  compressionMiddleware,
  compressionLogger,
};
