/**
 * Production Webpack Optimization Configuration
 * This file contains advanced webpack optimizations for production builds
 */

const path = require('path');

// Webpack optimization configuration
const webpackOptimizations = {
  // Code splitting configuration
  splitChunks: {
    chunks: 'all',
    cacheGroups: {
      // Vendor libraries (node_modules)
      vendors: {
        test: /[\\/]node_modules[\\/]/,
        name: 'vendors',
        priority: 20,
        chunks: 'all',
        enforce: true,
      },

      // React and React-DOM
      react: {
        test: /[\\/]node_modules[\\/](react|react-dom)[\\/]/,
        name: 'react',
        priority: 30,
        chunks: 'all',
        enforce: true,
      },

      // Large UI libraries
      ui: {
        test: /[\\/]node_modules[\\/](@headlessui|@heroicons|framer-motion|recharts)[\\/]/,
        name: 'ui-libs',
        priority: 25,
        chunks: 'all',
        enforce: true,
      },

      // Utility libraries
      utils: {
        test: /[\\/]node_modules[\\/](axios|date-fns|lodash|moment)[\\/]/,
        name: 'utils',
        priority: 15,
        chunks: 'all',
        enforce: true,
      },

      // Common application code
      common: {
        name: 'common',
        minChunks: 2,
        priority: 10,
        chunks: 'all',
        enforce: true,
      },
    },
  },

  // Runtime chunk configuration
  runtimeChunk: {
    name: 'runtime',
  },

  // Minimize configuration
  minimize: true,
  minimizer: [
    // Note: TerserPlugin and CssMinimizerPlugin are handled by react-scripts
  ],

  // Module concatenation
  concatenateModules: true,

  // Side effects optimization
  sideEffects: false,

  // Remove empty chunks
  removeEmptyChunks: true,

  // Merge duplicate chunks
  mergeDuplicateChunks: true,

  // Flag chunks as containing side effects
  flagIncludedChunks: true,
};

// Bundle analysis helpers
const bundleAnalysisConfig = {
  // Performance hints
  performance: {
    hints: 'warning',
    maxEntrypointSize: 512000, // 500KB
    maxAssetSize: 250000, // 250KB
  },

  // Stats configuration for detailed analysis
  stats: {
    assets: true,
    chunks: true,
    modules: false,
    reasons: false,
    errorDetails: true,
    warnings: true,
    colors: true,
    performance: true,
    timings: true,
    builtAt: true,
  },
};

// Environment-specific optimizations
const getEnvironmentOptimizations = env => {
  const optimizations = {
    ...webpackOptimizations,
  };

  if (env === 'production') {
    // Production-specific optimizations
    optimizations.usedExports = true;
    optimizations.providedExports = true;
    optimizations.innerGraph = true;
    optimizations.mangleExports = true;

    // Tree shaking
    optimizations.sideEffects = false;

    // Module ids
    optimizations.moduleIds = 'deterministic';
    optimizations.chunkIds = 'deterministic';
  }

  return optimizations;
};

// Recommended bundle size thresholds
const bundleSizeThresholds = {
  // Main bundle (application code)
  main: {
    warning: 250000, // 250KB
    error: 500000, // 500KB
  },

  // Vendor bundle (third-party libraries)
  vendors: {
    warning: 500000, // 500KB
    error: 1000000, // 1MB
  },

  // CSS bundle
  css: {
    warning: 50000, // 50KB
    error: 100000, // 100KB
  },

  // Total bundle size
  total: {
    warning: 1000000, // 1MB
    error: 2000000, // 2MB
  },
};

// Performance monitoring
const performanceConfig = {
  // Core Web Vitals thresholds
  webVitals: {
    // Largest Contentful Paint
    lcp: {
      good: 2500, // 2.5s
      poor: 4000, // 4s
    },

    // First Input Delay
    fid: {
      good: 100, // 100ms
      poor: 300, // 300ms
    },

    // Cumulative Layout Shift
    cls: {
      good: 0.1,
      poor: 0.25,
    },

    // First Contentful Paint
    fcp: {
      good: 1800, // 1.8s
      poor: 3000, // 3s
    },
  },
};

module.exports = {
  webpackOptimizations,
  bundleAnalysisConfig,
  getEnvironmentOptimizations,
  bundleSizeThresholds,
  performanceConfig,
};
