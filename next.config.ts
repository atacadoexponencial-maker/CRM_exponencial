import type { NextConfig } from "next";

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
};

export default nextConfig;
