/**
 * Tema do sistema (B36-01): claro é o padrão; escuro é a opção de cada usuário.
 *
 * A escolha mora em `profiles.tema` (vale em qualquer aparelho) e é copiada para o
 * cookie `tema`, que o layout raiz lê para o servidor já mandar o `<html>` no tema
 * certo, sem piscar o outro antes.
 */
export type Tema = "claro" | "escuro"

export const COOKIE_TEMA = "tema"
export const TEMA_PADRAO: Tema = "claro"

/** Opções do cookie: vale um ano, para o site todo. */
export const OPCOES_COOKIE_TEMA = { path: "/", maxAge: 31536000, sameSite: "lax" as const }

/** Qualquer valor desconhecido (ou nenhum) vale o padrão. */
export function temaValido(valor: string | null | undefined): Tema {
  return valor === "escuro" ? "escuro" : TEMA_PADRAO
}

/** Aplica o tema no navegador na hora: classe no `<html>` e cookie. */
export function aplicarTemaNoNavegador(tema: Tema) {
  document.documentElement.classList.toggle("dark", tema === "escuro")
  document.cookie = `${COOKIE_TEMA}=${tema}; path=/; max-age=${OPCOES_COOKIE_TEMA.maxAge}; samesite=lax`
}
