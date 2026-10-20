/**
 * Para onde ir depois do login. QA baixos (06/10): volta para a página que a pessoa
 * tentou abrir. Só caminho interno do app: nada de "//outro-site" nem "http://".
 */
export function destinoSeguro(voltar: string | null | undefined): string | null {
  if (!voltar || !voltar.startsWith("/") || voltar.startsWith("//") || voltar.startsWith("/login") || voltar.startsWith("/cadastro")) return null
  return voltar
}
