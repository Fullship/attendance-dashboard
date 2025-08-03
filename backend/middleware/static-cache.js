const path = require('path');
const express = require('express');

/**
 * Static file middleware with aggressive caching for versioned assets
 */
const createStaticCacheMiddleware = (publicPath, options = {}) => {
  const {
    maxAge = '1y', // 1 year for versioned assets
    shortMaxAge = '7d', // 7 days for non-versioned assets
    enableETag = true,
    enableLastModified = true,
  } = options;

  return (req, res, next) => {
    const filePath = req.path;

    // Check if file has version hash in filename (e.g., main.abc123def.js)
    const hasVersionHash =
      /\.[0-9a-f]{8,}\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$/i.test(filePath);

    if (hasVersionHash) {
      // Versioned assets - cache aggressively
      res.set({
        'Cache-Control': `public, immutable, max-age=${convertToSeconds(maxAge)}`,
        Expires: new Date(Date.now() + convertToMilliseconds(maxAge)).toUTCString(),
        'X-Cache-Status': 'VERSIONED-ASSET',
      });
    } else if (/\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$/i.test(filePath)) {
      // Non-versioned static assets - shorter cache
      res.set({
        'Cache-Control': `public, max-age=${convertToSeconds(shortMaxAge)}, must-revalidate`,
        Expires: new Date(Date.now() + convertToMilliseconds(shortMaxAge)).toUTCString(),
        'X-Cache-Status': 'STATIC-ASSET',
      });
    } else if (/\.(html|htm)$/i.test(filePath)) {
      // HTML files - no cache
      res.set({
        'Cache-Control': 'no-cache, no-store, must-revalidate, private',
        Pragma: 'no-cache',
        Expires: '0',
        'X-Cache-Status': 'HTML-NO-CACHE',
      });
    }

    // Security headers for all static files
    res.set({
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
    });

    // ETag and Last-Modified handling
    if (!enableETag) {
      res.removeHeader('ETag');
    }
    if (!enableLastModified) {
      res.removeHeader('Last-Modified');
    }

    next();
  };
};

/**
 * Convert time string to seconds
 */
function convertToSeconds(timeStr) {
  const units = {
    s: 1,
    m: 60,
    h: 3600,
    d: 86400,
    w: 604800,
    y: 31536000,
  };

  const match = timeStr.match(/^(\d+)([smhdwy])$/);
  if (!match) return 3600; // Default 1 hour

  const [, value, unit] = match;
  return parseInt(value) * (units[unit] || 1);
}

/**
 * Convert time string to milliseconds
 */
function convertToMilliseconds(timeStr) {
  return convertToSeconds(timeStr) * 1000;
}

/**
 * Middleware to handle service worker caching
 */
const serviceWorkerNoCache = (req, res, next) => {
  if (req.path === '/service-worker.js' || req.path === '/sw.js') {
    res.set({
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      Pragma: 'no-cache',
      Expires: '0',
      'X-Cache-Status': 'SERVICE-WORKER-NO-CACHE',
    });
  }
  next();
};

/**
 * Generate unique build hash for cache busting
 */
const generateBuildHash = () => {
  const timestamp = Date.now().toString();
  const random = Math.random().toString(36).substring(2, 15);
  return `${timestamp}.${random}`;
};

/**
 * Middleware to inject build hash into HTML
 */
const injectBuildHash = buildHash => {
  return (req, res, next) => {
    // Only for HTML requests
    if (req.accepts('html') && !req.path.includes('.')) {
      const originalSend = res.send;

      res.send = function (html) {
        if (typeof html === 'string' && html.includes('<html')) {
          // Inject build hash as meta tag
          html = html.replace(
            '<head>',
            `<head>\n    <meta name="build-hash" content="${buildHash}">\n    <meta name="build-time" content="${new Date().toISOString()}">`
          );
        }
        originalSend.call(this, html);
      };
    }
    next();
  };
};

module.exports = {
  createStaticCacheMiddleware,
  serviceWorkerNoCache,
  generateBuildHash,
  injectBuildHash,
};
