import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs/config";

export const CABECALHOS_DE_SEGURANCA = [
  // Ninguém exibe o site dentro de moldura de outro site (golpe de clique disfarçado).
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
  // O navegador não adivinha o tipo de arquivo.
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Sempre conexão segura (2 anos).
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
  // Para outro site, o "de onde veio" leva só o domínio, nunca o caminho.
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
];

const nextConfig: NextConfig = {
  // B53-07: o ffmpeg empacotado converte o vídeo HEVC recebido pela API Oficial.
  // O binário fica fora do bundle e vai junto só na função do webhook da Meta.
  serverExternalPackages: ["ffmpeg-static"],
  outputFileTracingIncludes: {
    "/api/webhooks/whatsapp": ["./node_modules/ffmpeg-static/ffmpeg*"],
  },
  experimental: {
    serverActions: {
      // Anexos do chat viajam dentro da Server Action. O padrão do Next é 1 MB,
      // que barrava quase toda foto de celular sem dizer nada. O teto real é o
      // do Vercel (4,5 MB por requisição); acima disso é preciso enviar direto
      // para o Storage, o que ainda não existe.
      bodySizeLimit: "4mb",
    },
  },
  // B21-08: proteções básicas do navegador em toda resposta. A política completa de
  // conteúdo (CSP) fica de fora — risco de quebrar o login da Meta; daqui só entra o
  // `frame-ancestors`, que não restringe scripts.
  async headers() {
    return [{ source: "/:path*", headers: CABECALHOS_DE_SEGURANCA }];
  },
  // B12-04: o funil de Retenção virou Recompra; favoritos e links antigos seguem funcionando.
  async redirects() {
    return [
      { source: "/pipeline/retencao", destination: "/pipeline/recompra", permanent: true },
      // B28-06: as sequências saíram; o que elas faziam a automação faz, com o bloco "esperar".
      { source: "/sequencias", destination: "/configuracoes/automacoes", permanent: true },
      { source: "/sequencias/:path*", destination: "/configuracoes/automacoes", permanent: true },
    ];
  },
};

// B55: Sentry. No `next build` sobe os source maps (precisa de SENTRY_AUTH_TOKEN no
// ambiente de build; sem ele, só avisa e o app funciona igual, com pilha minificada).
export default withSentryConfig(nextConfig, {
  org: "atacado-exponencial",
  project: "crmatacado-exp",
  authToken: process.env.SENTRY_AUTH_TOKEN,

  // Sobe mais arquivos do cliente para a pilha resolver nos chunks do próprio Next.
  widenClientFileUpload: true,

  // Os eventos do navegador passam pelo nosso domínio, fora do alcance de bloqueador
  // de anúncio. Fica em /api/ porque o porteiro (middleware) já deixa /api/ passar.
  tunnelRoute: "/api/monitoramento",

  // Só fala no CI.
  silent: !process.env.CI,
});
