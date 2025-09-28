/** @type {import('next').NextConfig} */
const nextConfig = {
  // Server external packages for bundle optimization - More comprehensive list
  serverExternalPackages: [
    '@langchain/community',
    '@langchain/core', 
    '@langchain/google-genai',
    '@langchain/pinecone',
    '@langchain/textsplitters',
    '@pinecone-database/pinecone',
    'langchain',
    'faiss-node',
    'mongodb',
    '@google/generative-ai',
    'bcryptjs',
    'jsonwebtoken',
    'formidable',
    'multer',
    'async-retry',
    'uuid'
  ],

  // Output file tracing excludes for Vercel optimization - Much more aggressive
  outputFileTracingExcludes: {
    '*': [
      'node_modules/@swc/core-linux-x64-gnu',
      'node_modules/@swc/core-linux-x64-musl',
      'node_modules/@esbuild/linux-x64',
      'node_modules/@esbuild/**/*',
      'node_modules/@swc/**/*',
      'node_modules/faiss-node/**/*',
      'node_modules/@langchain/**/node_modules/**/*',
      'node_modules/langchain/node_modules/**/*',
      'node_modules/mongodb/lib/**/*',
      'node_modules/@google/generative-ai/dist/**/*.d.ts',
      'node_modules/@pinecone-database/**/*.d.ts',
      'node_modules/**/*.md',
      'node_modules/**/*.txt',
      'node_modules/**/README*',
      'node_modules/**/LICENSE*',
      'node_modules/**/CHANGELOG*',
      'node_modules/**/*.map',
      'node_modules/**/test/**/*',
      'node_modules/**/tests/**/*',
      'node_modules/**/docs/**/*',
      'node_modules/**/examples/**/*',
      'node_modules/**/sample/**/*',
      'node_modules/**/samples/**/*',
      'node_modules/**/__tests__/**/*',
      'node_modules/**/*.test.js',
      'node_modules/**/*.spec.js'
    ],
  },
  
  // Webpack configuration
  webpack: (config, { isServer, webpack }) => {
    // Server-side optimizations
    if (isServer) {
      // More aggressive externalization
      config.externals = [
        ...config.externals,
        {
          'faiss-node': 'commonjs faiss-node',
          'mongodb': 'commonjs mongodb',
          '@langchain/community': 'commonjs @langchain/community',
          '@langchain/core': 'commonjs @langchain/core',
          '@langchain/google-genai': 'commonjs @langchain/google-genai',
          '@langchain/pinecone': 'commonjs @langchain/pinecone',
          '@langchain/textsplitters': 'commonjs @langchain/textsplitters',
          '@pinecone-database/pinecone': 'commonjs @pinecone-database/pinecone',
          'langchain': 'commonjs langchain',
          '@google/generative-ai': 'commonjs @google/generative-ai',
        }
      ];

      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        crypto: false,
        path: false,
        os: false,
        stream: false,
        buffer: false,
        util: false,
      };
    }
    
    // Optimize bundle splitting more aggressively
    config.optimization = {
      ...config.optimization,
      splitChunks: {
        chunks: 'all',
        minSize: 20000,
        maxSize: 200000, // Keep chunks small
        cacheGroups: {
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            chunks: 'all',
            priority: 10,
            maxSize: 200000,
          },
          langchain: {
            test: /[\\/]node_modules[\\/](@langchain|langchain)[\\/]/,
            name: 'langchain',
            chunks: 'all',
            priority: 20,
            maxSize: 200000,
          },
        },
      },
    };
    
    // Global polyfills to prevent build errors
    config.plugins.push(
      new webpack.DefinePlugin({
        'typeof self': JSON.stringify('undefined'),
        'typeof window': isServer ? JSON.stringify('undefined') : JSON.stringify('object'),
      })
    );
    
    return config;
  },
  
  // Build optimizations
  output: 'standalone',
  productionBrowserSourceMaps: false,
  compress: true,
  poweredByHeader: false,

  // Experimental optimizations
  experimental: {
    optimizePackageImports: ['@langchain/core', '@langchain/community', 'langchain']
  }
};

export default nextConfig;
