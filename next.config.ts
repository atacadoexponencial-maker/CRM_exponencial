import type { NextConfig } from "next";

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
    ];
  },
};

export default nextConfig;
