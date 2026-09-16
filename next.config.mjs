/** @type {import('next').NextConfig} */
const nextConfig = {
  devIndicators: false,

  // Needed for Prisma on Vercel serverless
  serverExternalPackages: ['@prisma/client', 'prisma'],

  async headers() {
    return [
      {
        // Allow CORS for all API routes (for Android APK sync)
        source: "/api/:path*",
        headers: [
          { key: "Access-Control-Allow-Credentials", value: "true" },
          { key: "Access-Control-Allow-Origin", value: "*" },
          { key: "Access-Control-Allow-Methods", value: "GET,OPTIONS,PATCH,DELETE,POST,PUT" },
          { key: "Access-Control-Allow-Headers", value: "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization" },
        ]
      }
    ]
  }
}

export default nextConfig;
