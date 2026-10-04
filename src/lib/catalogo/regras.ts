// Limites do catálogo (B16), iguais no navegador e no servidor.

export const MAX_FOTOS = 8
export const TAMANHO_MAX_FOTO = 5 * 1024 * 1024
/** Formato da foto de produto → extensão do arquivo. */
export const FORMATOS_FOTO: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" }
export const BUCKET_CATALOGO = "catalog-images"
export const MAX_OPCOES_POR_TIPO = 30
export const ESTOQUE_MAXIMO = 1_000_000
