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

/** B61-01: o texto de boas-vindas serve de bio no topo da loja. Mesma regra do banco. */
export const LIMITE_BOAS_VINDAS = 300
export const AVISO_INSTAGRAM = "Use só letras, números, ponto e sublinhado, com até 30 caracteres."

/**
 * B61-01: o perfil do Instagram como é guardado (minúsculas, sem @). Aceita "@loja",
 * "loja" e o link do perfil. Devolve `null` para campo vazio e `false` para o que não é
 * um perfil. Mesma regra do banco.
 */
export function normalizarInstagram(valor: unknown): string | null | false {
  if (typeof valor !== "string") return false
  const perfil = valor
    .trim()
    .replace(/^(?:https?:\/\/)?(?:www\.)?instagram\.com\//i, "")
    .replace(/[?#].*$/, "")
    .replace(/\/+$/, "")
    .replace(/^@/, "")
    .toLowerCase()
  if (!perfil) return null
  return /^[a-z0-9._]{1,30}$/.test(perfil) ? perfil : false
}

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
