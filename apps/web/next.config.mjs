/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@workspace/ui"],

  // 生产环境跳过类型检查（Vercel 会自动检查）
  typescript: {
    ignoreBuildErrors: true,
  },

  // 优化生产构建
  productionBrowserSourceMaps: false,

  // 优化图片加载
  images: {
    formats: ["image/avif", "image/webp"],
  },

  // 启用 React 严格模式（开发环境）
  reactStrictMode: true,
}

export default nextConfig
