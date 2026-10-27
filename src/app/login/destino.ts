/** Origem de mentira: só serve para o leitor de endereços dizer se o destino sai do app. */
const ORIGEM_DO_APP = "https://app.invalido"

/**
 * Para onde ir depois do login. QA baixos (06/10): volta para a página que a pessoa
 * tentou abrir. Só caminho interno do app: nada de "//outro-site" nem "http://".
 *
 * B44-04: comparar o começo do texto não basta. O navegador lê `/\outro-site` e
 * `/<tab>/outro-site` como endereço de outro site, então barra invertida e caractere
 * de controle são recusados, e o destino é interpretado pelo leitor de endereços
 * contra uma origem fixa: só fica se continuar nela.
 */
export function destinoSeguro(voltar: string | null | undefined): string | null {
  if (!voltar || !voltar.startsWith("/") || voltar.startsWith("//")) return null
  if (/[\\\u0000-\u001f\u007f]/.test(voltar)) return null

  let endereco: URL
  try {
    endereco = new URL(voltar, ORIGEM_DO_APP)
  } catch {
    return null
  }
  if (endereco.origin !== ORIGEM_DO_APP) return null

  const destino = endereco.pathname + endereco.search + endereco.hash
  if (destino.startsWith("/login") || destino.startsWith("/cadastro")) return null
  return destino
}
