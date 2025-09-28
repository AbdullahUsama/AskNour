/** @type {import('next').NextConfig} */
const nextConfig = {
  // Server external packages for bundle optimization
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
    '@google/generative-ai'
  ],

  // Output file tracing excludes for Vercel optimization
  outputFileTracingExcludes: {
    '*': [
      'node_modules/@swc/core-linux-x64-gnu',
      'node_modules/@swc/core-linux-x64-musl',
      'node_modules/@esbuild/linux-x64',
      'node_modules/faiss-node/**/*',
    ],
  },
  
  // Webpack configuration
  webpack: (config, { isServer, webpack }) => {
    // Server-side optimizations
    if (isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        crypto: false,
      };
    }
    
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
};

export default nextConfig;
