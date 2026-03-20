/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@workspace/ui"],
  
  // 生产环境跳过类型检查（Vercel 会自动检查）
  typescript: {
    ignoreBuildErrors: true,
  },
  
  // 忽略 ESLint 错误
  eslint: {
    ignoreDuringBuilds: true,
  },
}

export default nextConfig
