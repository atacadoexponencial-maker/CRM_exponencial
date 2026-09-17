// Vocabulário da tela de saúde (B4-01), agora vindo do backend.
//
// A B4-01 declarou estes tipos aqui, com dados fixos. A B4-02 os moveu para
// `src/lib/whatsapp/gateway/saude.ts`, ao lado da tradução do contrato: o tipo
// e quem o preenche precisam morar juntos, senão um muda e o outro não.
//
// Este arquivo continua existindo para os componentes não importarem de
// `src/lib` direto — a troca foi de origem, não de vocabulário.

export type {
  MotivoDoFreio,
  NivelDeRisco,
  SaudeDoNumero,
} from "@/lib/whatsapp/gateway/saude"
