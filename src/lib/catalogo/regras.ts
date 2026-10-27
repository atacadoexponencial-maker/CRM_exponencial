// Limites do catálogo (B16), iguais no navegador e no servidor.

export const MAX_FOTOS = 8
export const TAMANHO_MAX_FOTO = 5 * 1024 * 1024
/** Formato da foto de produto → extensão do arquivo. */
export const FORMATOS_FOTO: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" }
export const BUCKET_CATALOGO = "catalog-images"
export const MAX_OPCOES_POR_TIPO = 30
export const ESTOQUE_MAXIMO = 1_000_000

/** Endereços que não podem ser de loja (rotas e nomes do próprio sistema). */
export const ENDERECOS_RESERVADOS = ["prototipo", "admin", "api", "loja", "catalogo", "crm", "www", "app", "login", "suporte"]

/** Mesma regra do banco: 3 a 40 caracteres, letras minúsculas, números e hífen, sem hífen nas pontas. */
export function enderecoDeLojaValido(endereco: string): boolean {
  return /^[a-z0-9](?:[a-z0-9-]{1,38}[a-z0-9])$/.test(endereco) && !ENDERECOS_RESERVADOS.includes(endereco)
}

/** Fontes que a vitrine aceita (os arquivos ficam em src/app/loja/components/fontes.ts). */
export const IDS_FONTE = ["inter", "poppins", "montserrat", "nunito", "space-grotesk", "playfair", "lora", "dm-serif"] as const
export const LAYOUTS_VITRINE = ["grade", "lista", "destaque"] as const
export const TAMANHO_MAX_LOGO = 2 * 1024 * 1024
export const TAMANHO_MAX_BANNER = 5 * 1024 * 1024
/** B44-07: logo aceita os mesmos formatos da foto; SVG saiu (o bucket é público e SVG roda código). */
export const FORMATOS_LOGO: Record<string, string> = { ...FORMATOS_FOTO }

/**
 * B44-07: o caminho é de um arquivo da pasta da empresa (`<empresa>/produtos/` ou
 * `<empresa>/marca/`), com nome simples, sem `..` nem subpasta. Vale para aceitar
 * caminho novo e, principalmente, antes de apagar caminho lido do banco: o Admin e o
 * Gerente gravam o banco direto, e a limpeza roda com a chave de serviço.
 */
export function caminhoDaEmpresa(caminho: unknown, workspaceId: string, pasta: "produtos" | "marca"): caminho is string {
  if (typeof caminho !== "string" || !caminho.startsWith(`${workspaceId}/${pasta}/`)) return false
  return /^[A-Za-z0-9-]+\.[a-z0-9]+$/.test(caminho.slice(`${workspaceId}/${pasta}/`.length))
}
