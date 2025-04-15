/** @type {import('next').NextConfig} */
const nextConfig = {
  /* config options here */
  env: {
    // Explicitly expose all required environment variables
    GEMINI_API_KEY: process.env.GEMINI_API_KEY,
    RADAR_API_KEY: process.env.RADAR_API_KEY,
    SERPER_API_KEY: process.env.SERPER_API_KEY,
    NEWS_API_KEY: process.env.NEWS_API_KEY,
    JINA_API_KEY: process.env.JINA_API_KEY
  },
  // Prevent server-only env variables from being exposed to the client
  serverRuntimeConfig: {
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY
  },
  // Ensure publicRuntimeConfig includes any variables needed on the client 
  publicRuntimeConfig: {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL
  }
};

module.exports = nextConfig; 