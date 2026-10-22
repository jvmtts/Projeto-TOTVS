export function validateDeploymentApi(value: string | undefined): string {
  const message = "Configure VITE_API_URL na Vercel com o endereço HTTPS público da API Java terminado em /api. O backend precisa estar hospedado antes de publicar o frontend.";
  let url: URL;
  try { url = new URL(value?.trim() || ""); } catch { throw new Error(message); }
  const hostname = url.hostname.toLowerCase();
  const privateHost = hostname === "localhost" || hostname.endsWith(".localhost") || hostname.endsWith(".local") || hostname === "[::1]" || /^\[f[cd]/.test(hostname) || /^\[fe[89ab]/.test(hostname) || /^(0|10|127)\./.test(hostname) || /^192\.168\./.test(hostname) || /^169\.254\./.test(hostname) || /^172\.(1[6-9]|2\d|3[01])\./.test(hostname);
  if (url.protocol !== "https:" || privateHost || url.username || url.password || url.search || url.hash || !url.pathname.replace(/\/$/, "").endsWith("/api")) throw new Error(message);
  return url.toString().replace(/\/$/, "");
}
