const path = require('path');
const { override, addWebpackPlugin } = require('customize-cra');
const CompressionPlugin = require('compression-webpack-plugin');
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;
const {
  getEnvironmentOptimizations,
  bundleAnalysisConfig,
  bundleSizeThresholds,
} = require('./webpack.config.optimization');

// Production optimizations
const addProductionOptimizations = () => (config, env) => {
  if (env === 'production') {
    // Apply optimization configuration
    const optimizations = getEnvironmentOptimizations(env);
    config.optimization = {
      ...config.optimization,
      ...optimizations,
    };

    // Add performance configuration
    config.performance = bundleAnalysisConfig.performance;

    // Enable gzip compression
    config.plugins.push(
      new CompressionPlugin({
        filename: '[path][base].gz',
        algorithm: 'gzip',
        test: /\.(js|css|html|svg)$/,
        threshold: 8192,
        minRatio: 0.8,
      })
    );

    // Add brotli compression for better compression ratios
    config.plugins.push(
      new CompressionPlugin({
        filename: '[path][base].br',
        algorithm: 'brotliCompress',
        test: /\.(js|css|html|svg)$/,
        compressionOptions: {
          params: {
            [require('zlib').constants.BROTLI_PARAM_QUALITY]: 11,
          },
        },
        threshold: 8192,
        minRatio: 0.8,
      })
    );

    // Add bundle analyzer if ANALYZE flag is set
    if (process.env.ANALYZE === 'true') {
      config.plugins.push(
        new BundleAnalyzerPlugin({
          analyzerMode: 'server',
          openAnalyzer: true,
          reportFilename: 'bundle-report.html',
          defaultSizes: 'gzip',
        })
      );
    }

    // Disable source maps for production if not explicitly enabled
    if (process.env.GENERATE_SOURCEMAP === 'false') {
      config.devtool = false;
    }

    // Output configuration for optimal caching and versioning
    config.output = {
      ...config.output,
      // Main JS files with 8-character hash for cache busting
      filename: 'static/js/[name].[contenthash:8].js',
      chunkFilename: 'static/js/[name].[contenthash:8].chunk.js',
      // Asset filenames with hash for images, fonts, etc.
      assetModuleFilename: 'static/media/[name].[contenthash:8][ext]',
      // Clean output directory
      clean: true,
    };

    // CSS extraction with content hash
    const MiniCssExtractPlugin = require('mini-css-extract-plugin');
    const miniCssExtractPlugin = config.plugins.find(
      plugin => plugin.constructor.name === 'MiniCssExtractPlugin'
    );
    if (miniCssExtractPlugin) {
      miniCssExtractPlugin.options.filename = 'static/css/[name].[contenthash:8].css';
      miniCssExtractPlugin.options.chunkFilename = 'static/css/[name].[contenthash:8].chunk.css';
    }

    // Webpack optimization for better caching
    config.optimization = {
      ...config.optimization,
      moduleIds: 'deterministic',
      chunkIds: 'deterministic',
      // Split chunks for better caching
      splitChunks: {
        chunks: 'all',
        name: false,
        cacheGroups: {
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            chunks: 'all',
            priority: 10,
            reuseExistingChunk: true,
          },
          common: {
            name: 'common',
            minChunks: 2,
            priority: 5,
            reuseExistingChunk: true,
          },
        },
      },
      // Runtime chunk for better long-term caching
      runtimeChunk: {
        name: entrypoint => `runtime-${entrypoint.name}`,
      },
    };

    // Module resolution optimizations
    config.resolve = {
      ...config.resolve,
      modules: [path.resolve(__dirname, 'src'), 'node_modules'],
      alias: {
        ...config.resolve.alias,
        '@': path.resolve(__dirname, 'src'),
        components: path.resolve(__dirname, 'src/components'),
        pages: path.resolve(__dirname, 'src/pages'),
        utils: path.resolve(__dirname, 'src/utils'),
        contexts: path.resolve(__dirname, 'src/contexts'),
        types: path.resolve(__dirname, 'src/types'),
      },
    };

    console.log('🚀 Production optimizations applied');
    console.log(`📊 Bundle size thresholds:`, bundleSizeThresholds);
  }

  return config;
};

// Development optimizations
const addDevelopmentOptimizations = () => (config, env) => {
  if (env === 'development') {
    // Faster development builds
    config.optimization = {
      ...config.optimization,
      removeAvailableModules: false,
      removeEmptyChunks: false,
      splitChunks: false,
    };

    // Better error reporting
    config.devtool = 'eval-source-map';

    // Add dev server proxy configuration
    config.devServer = {
      ...config.devServer,
      setupMiddlewares: (middlewares, devServer) => {
        console.log('🔧 Setting up API proxy middleware in config-overrides.js');
        
        const { createProxyMiddleware } = require('http-proxy-middleware');
        const apiProxy = createProxyMiddleware('/api', {
          target: 'http://localhost:3002',
          changeOrigin: true,
          onProxyReq: (proxyReq, req) => {
            console.log(`🔄 Config-Proxy: ${req.method} ${req.url} -> localhost:3002${req.url}`);
          }
        });
        
        devServer.app.use('/api', apiProxy);
        console.log('✅ API proxy configured in config-overrides.js');
        
        return middlewares;
      }
    };

    console.log('⚡ Development optimizations applied');
  }

  return config;
};

module.exports = override(
  addProductionOptimizations(), 
  addDevelopmentOptimizations()
);
