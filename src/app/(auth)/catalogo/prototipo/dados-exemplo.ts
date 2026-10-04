// Protótipos da B16-01 e B16-02: dados fixos, nada vem do banco. Sai na B16-05 (produtos),
// na B16-07 (configurações) e na B16-08 (aparência).

import type { CategoriaCatalogo } from "../components/lista-produtos"
import type { ProdutoEditavel } from "../components/editor-produto"
import type { ConfigCatalogo, NumeroConectado } from "../components/form-configuracoes"
import type { TemaLoja } from "@/app/loja/components/tema"

/** Foto de exemplo desenhada na hora (sem depender de imagem externa). */
function fotoExemplo(cor: string, texto: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400"><rect width="400" height="400" fill="${cor}"/><text x="200" y="215" font-family="sans-serif" font-size="44" fill="white" fill-opacity="0.85" text-anchor="middle">${texto}</text></svg>`
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}

export const CATEGORIAS_EXEMPLO: CategoriaCatalogo[] = [
  { id: "cat-vestidos", nome: "Vestidos" },
  { id: "cat-blusas", nome: "Blusas" },
  { id: "cat-calcas", nome: "Calças" },
]

const P = "tipo-tamanho"
const C = "tipo-cor"

export const PRODUTOS_EXEMPLO: ProdutoEditavel[] = [
  {
    id: "p1", nome: "Vestido Midi Linho", descricao: "Linho com elastano, forro de algodão.\nModelagem soltinha.",
    preco: 89.9, precoDe: 119.9, codigo: "VML-01", categoriaId: "cat-vestidos", visivel: true, destaque: true,
    fotos: [{ id: "f1", url: fotoExemplo("#7c5c4a", "Vestido") }, { id: "f2", url: fotoExemplo("#5c4a7c", "Costas") }],
    tipos: [{ id: P, nome: "Tamanho", opcoes: ["P", "M", "G"] }, { id: C, nome: "Cor", opcoes: ["Areia", "Preto"] }],
    estoque: { "P / Areia": 4, "P / Preto": 2, "M / Areia": 6, "M / Preto": 0, "G / Areia": 3, "G / Preto": 5 },
  },
  {
    id: "p2", nome: "Vestido Tubinho Canelado", descricao: "Malha canelada, comprimento acima do joelho.",
    preco: 59.9, precoDe: null, codigo: "VTC-02", categoriaId: "cat-vestidos", visivel: true, destaque: false,
    fotos: [{ id: "f3", url: fotoExemplo("#2f4858", "Tubinho") }],
    tipos: [{ id: P, nome: "Tamanho", opcoes: ["P", "M", "G"] }],
    estoque: { P: 0, M: 0, G: 0 },
  },
  {
    id: "p3", nome: "Blusa Cropped Tricot", descricao: "Tricot leve, manga curta.",
    preco: 39.9, precoDe: null, codigo: "", categoriaId: "cat-blusas", visivel: true, destaque: true,
    fotos: [{ id: "f4", url: fotoExemplo("#b5838d", "Cropped") }],
    tipos: [{ id: C, nome: "Cor", opcoes: ["Off-white", "Rosa", "Verde"] }],
    estoque: { "Off-white": 12, Rosa: 8, Verde: 4 },
  },
  {
    id: "p4", nome: "Camisa Viscose Estampada", descricao: "",
    preco: 69.9, precoDe: null, codigo: "CVE-04", categoriaId: "cat-blusas", visivel: false, destaque: false,
    fotos: [],
    tipos: [{ id: P, nome: "Tamanho", opcoes: ["Único"] }],
    estoque: { "Único": 10 },
  },
  {
    id: "p5", nome: "Calça Pantalona Alfaiataria", descricao: "Cintura alta com elástico atrás.",
    preco: 99.9, precoDe: 129.9, codigo: "CPA-05", categoriaId: "cat-calcas", visivel: true, destaque: false,
    fotos: [{ id: "f5", url: fotoExemplo("#6d6875", "Pantalona") }],
    tipos: [{ id: P, nome: "Tamanho", opcoes: ["36", "38", "40", "42"] }],
    estoque: { "36": 3, "38": 7, "40": 5, "42": 2 },
  },
  {
    id: "p6", nome: "Kit 3 Camisetas Básicas", descricao: "Algodão penteado.",
    preco: 79.9, precoDe: null, codigo: "", categoriaId: null, visivel: true, destaque: false,
    fotos: [{ id: "f6", url: fotoExemplo("#355070", "Kit") }],
    tipos: [],
    estoque: { "": 20 },
  },
]

export const PRODUTO_NOVO: ProdutoEditavel = {
  id: null, nome: "", descricao: "", preco: null, precoDe: null, codigo: "", categoriaId: null,
  visivel: true, destaque: false, fotos: [], tipos: [], estoque: { "": 0 },
}

export const NUMEROS_EXEMPLO: NumeroConectado[] = [
  { id: "n1", rotulo: "+55 21 99391-1946 · Comercial" },
  { id: "n2", rotulo: "+55 11 98888-0000 · Atacado SP" },
]

export const CONFIG_EXEMPLO: ConfigCatalogo = {
  endereco: "",
  conexaoId: null,
  minimo: { tipo: "pecas", valor: 12 },
  mensagemFechamento: "Formas de pagamento: Pix e boleto. Enviamos para todo o Brasil.",
  publicado: false,
}

/** Endereços que o protótipo finge estarem em uso por outras lojas. */
export const ENDERECOS_EM_USO = ["loja", "atacado", "moda"]

// B16-02: tema de exemplo da tela de Aparência.
const LOGO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="240" height="72"><text x="0" y="52" font-family="Georgia, serif" font-size="46" font-style="italic" fill="#7c3a2d">Bela Ateliê</text></svg>`

export const LOGO_EXEMPLO = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(LOGO_SVG)}`

export const TEMA_EXEMPLO: TemaLoja = {
  nomeLoja: "Bela Ateliê",
  boasVindas: "Moda feminina no atacado desde 2015 · Enviamos para todo o Brasil",
  logoUrl: LOGO_EXEMPLO,
  bannerUrl: null,
  corPrincipal: "#7c3a2d",
  corFundo: "#faf6f1",
  fonteId: "playfair",
  layout: "grade",
}
