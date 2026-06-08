const nextConfig = {
  output: "standalone",
  outputFileTracingRoot: new URL("../..", import.meta.url).pathname,
  transpilePackages: ["@sodec/shared"]
};

export default nextConfig;
