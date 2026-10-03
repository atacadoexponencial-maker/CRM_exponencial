/**
 * Preferências visuais de layout gravadas em cookie para o servidor já
 * renderizar a página no estado escolhido (sem "piscar" ao carregar).
 */
export const COOKIE_MENU_RECOLHIDO = "menu_recolhido"
export const COOKIE_CAIXA_RECOLHIDA = "caixa_recolhida"

/** Grava a preferência no navegador por um ano. */
export function gravarPreferencia(nome: string, ativo: boolean) {
  document.cookie = `${nome}=${ativo ? "1" : "0"}; path=/; max-age=31536000; samesite=lax`
}
