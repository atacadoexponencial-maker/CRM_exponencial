# B20-04: Fotos por link só da internet pública

**Tipo:** Implementação
**Página:** Catálogo — Importar planilha (`/catalogo/importar`)
**Repositório:** `crm-exponencial`
**Spec:** `pre-desenvolvimento/spec-seguranca-rodada-2.md` — módulo 4

## Descrição

A importação de fotos por link passa a recusar qualquer endereço que não seja da internet
pública — inclusive escrito de forma disfarçada (IPv6 que embute IPv4 interno, faixas
reservadas) — e a baixar exatamente do endereço que foi conferido, sem chance de o
destino mudar entre a conferência e o download.

## Pronto quando

Importar planilha com fotos de links públicos continua funcionando; e testes automatizados
provam que links para a rede interna, escritos de qualquer forma, são recusados e a foto
fica como "não foi possível baixar".
