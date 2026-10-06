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

## Cenários

### Happy Path
1. `baixarFoto(link)` (`src/lib/catalogo/baixar-foto.ts`) continua com a mesma assinatura
   e o mesmo resultado para links públicos (JPG/PNG/WebP até 5 MB, até 3 redirecionamentos).
2. A regra vira **lista de permissão**: só passa IP cuja faixa é `unicast` segundo
   `ipaddr.js` (`ipaddr.process(ip).range()`), que desembrulha IPv4 dentro de IPv6
   (`::ffff:a9fe:a9fe` → `169.254.169.254`) e classifica as faixas reservadas
   (privadas, loopback, link-local, CGNAT, multicast, `64:ff9b::/96`, 6to4, Teredo,
   benchmarking, documentação etc.). Hoje a regra compara texto e o `::ffff:a9fe:a9fe`
   passa (o `new URL` reescreve o IPv4 mapeado em hexadecimal).
3. O download passa a usar `fetch` do pacote `undici` com um `Agent` cujo `connect.lookup`
   resolve o nome e recusa se **qualquer** endereço não for `unicast` — a conferência
   acontece na hora de conectar, com o IP que vai ser usado. Fecha o DNS rebinding (o nome
   resolvido de um jeito na conferência e de outro no download).

### Edge Cases
- IP literal no link (`http://[::ffff:7f00:1]/`, `http://127.1/`, `http://2130706433/`):
  o `new URL` normaliza; a checagem do literal é feita antes de conectar (o `lookup` não é
  chamado para IP literal).
- Redirecionamento para endereço interno: cada salto passa pela mesma checagem.
- Nome que resolve para vários IPs, um deles interno: recusado.

### Cenário de Erro
- Endereço recusado: `{ ok: false, motivo: "não abriu (endereço não permitido)" }` — o
  motivo que a prévia da importação já mostra.

## Arquivos

- **Modificar:** `src/lib/catalogo/baixar-foto.ts` — `ipInterno` vira `ipPermitido` com `ipaddr.js`; download com `undici` + `lookup` que confere na conexão.
- **Modificar:** `package.json` / `package-lock.json` — `ipaddr.js@^2.5.0` e `undici@^7` (mesma linha do undici embutido no Node 24).
- **Criar:** `src/test/fotos-por-link-seguranca.test.ts` — formas disfarçadas de endereço interno recusadas; endereço público aceito; nome público que resolve para IP interno recusado na conexão.

## Dependências Externas

- `ipaddr.js` — https://github.com/whitequark/ipaddr.js (`process`, `range`)
- `undici` — https://undici.nodejs.org (`Agent`, opção `connect.lookup`, `fetch` com `dispatcher`)

## Checklist

- [x] Dependências instaladas
- [x] Regra de permissão por faixa `unicast`, inclusive IPv4 embutido em IPv6
- [x] Conferência na conexão (`lookup`) e em cada redirecionamento
- [x] Testes novos e de importação de catálogo passando; build e lint ok
