# B9-01: Protótipo — Cartão do número: pausa, reconexão e aviso de pausa longa

**Tipo:** Protótipo
**Página:** CRM — Configurações → WhatsApp (cartão do número do canal direto)
**Repositório:** `crm-exponencial`
**Spec:** `pre-desenvolvimento/spec-desconectar-reconectar.md`

## Descrição

Desenhar, com dados fixos no arquivo e sem chamar o gateway, os novos estados do
cartão de um número do canal direto: desconectado a pedido (com "Desconectado há
N dias"), aviso de pausa longa a partir de 10 dias, "Reconectando…", conexão
caída com o gateway tentando voltar, falha da reconexão com a saída para um QR
Code novo do mesmo número, e os textos revisados de Desconectar, Encerrar no
aparelho e Remover.

## Pronto quando

A Marcelle abre a tela e vê, lado a lado, cada um desses estados do cartão, com os
textos finais em português, e aprova a forma antes de qualquer lógica real.

## Cenários

### Happy Path

1. A Marcelle, como admin, abre `/configuracoes/whatsapp/prototipo-pausa` (rota
   temporária, fora do menu).
2. Vê uma grade de cartões de número do canal direto, um por estado, cada um com
   um rótulo curto dizendo qual estado representa:
   - **Desconectado a pedido, há 3 dias** — selo "Desconectado" e a linha
     "Desconectado há 3 dias"; botões Reconectar e Remover.
   - **Pausa longa, há 11 dias** — o mesmo, mais o aviso: *"Este número está
     desconectado há 11 dias. Se o celular dele ficar mais de 14 dias sem usar o
     WhatsApp, o WhatsApp pode desfazer a conexão, e aí será preciso ler um QR Code
     novo. Reconecte para evitar."*
   - **Reconectando** — selo "Conectando" e o botão "Reconectando…" desativado,
     com o ícone girando.
   - **Voltou** — selo "Conectado" e o aviso verde *"Número reconectado. Ele já pode
     receber e enviar mensagens."*
   - **Caiu, tentando voltar** — selo "Desconectado" e o aviso *"A conexão com o
     aparelho caiu. O canal está tentando voltar sozinho."*, sem a linha de "há N
     dias" (não é pausa).
   - **Sessão acabou** — aviso *"Não foi possível reconectar: a sessão foi
     encerrada no aparelho. Para voltar, leia um QR Code novo — o número continua o
     mesmo."* com o botão "Ler QR Code novo".
3. Abaixo da grade, os três textos de efeito revisados (Desconectar, Encerrar no
   aparelho, Remover), do jeito que vão aparecer nos diálogos de confirmação.
4. A Marcelle aprova ou pede ajustes de forma e de texto.

### Edge Cases

- **Número sem telefone conhecido** num estado de pausa: não se aplica — pausa só
  existe depois de conectado, e o protótipo mostra sempre um número com telefone.
- **Número banido**: não muda nesta issue; o aviso de bloqueio atual continua
  valendo e não aparece na grade.
- **Largura de celular**: a grade vira uma coluna, como a lista de números atual.

### Cenário de Erro

Não há: o protótipo não chama o gateway nem grava nada. Usuário que não é admin
é mandado para `/perfil`, como na página de WhatsApp.

## Banco de Dados

Não se aplica.

## Arquivos

- **Criar:** `src/app/(auth)/configuracoes/whatsapp/prototipo-pausa/page.tsx` — rota
  temporária do protótipo: confere admin como `configuracoes/whatsapp/page.tsx`
  (`perfil?.role !== "admin"` → `redirect("/perfil")`) e monta a grade com dados
  fixos. Sai do repositório na B9-03, quando o último estado estiver ligado aos
  dados reais.
- **Criar:** `src/app/(auth)/configuracoes/whatsapp/canal-direto/aviso-do-numero.tsx`
  — o bloco de aviso do cartão, com as variantes que o protótipo precisa: pausa
  longa (âmbar), voltou (verde), caiu tentando voltar (neutro) e sessão acabou
  (vermelho, com espaço para uma ação). Puramente visual, recebe texto e variante;
  B9-02 e B9-03 o usam com dados reais.
- **Modificar:** `src/app/(auth)/configuracoes/whatsapp/canal-direto/cartao-numero.tsx`
  — duas props opcionais e só visuais: `desdeQuando?: string` (a linha "Desconectado
  há N dias", já formatada por quem chama) e `aviso?: React.ReactNode` (o bloco de
  aviso, no lugar onde hoje fica o do motivo). Sem as props, o cartão fica
  idêntico ao de hoje.

Reaproveitar, não recriar:

- `CartaoNumero`, `EstadoBadge`, `CanalBadge` (`canal-direto/cartao-numero.tsx`,
  `canal-direto/estado-badge.tsx`) — o cartão e os selos atuais, sem cópia.
- `Button` (`src/components/ui/button.tsx`) e ícones `lucide-react` (`RefreshCw`
  girando, como em `tela-qr-code.tsx`; `QrCode`, `Power`, `Trash2`, como em
  `acoes-canal-direto.tsx`).
- As cores dos avisos já usadas no projeto: verde `emerald-500/…` do aviso de
  "Número conectado" em `lista-numeros.tsx`, vermelho `red-500/…` dos avisos de erro,
  âmbar `amber-500/…` do selo "Aguardando leitura". O tema é sempre escuro:
  **não usar variantes `dark:`**.
- `EFEITO` (`src/lib/whatsapp/gateway/ciclo-de-vida.ts`) — os textos atuais servem
  de ponto de partida; a revisão aparece só no protótipo, e a troca no código fica
  para a B9-02.

## Dependências Externas

Nenhuma.

## Checklist

- [x] Criar `aviso-do-numero.tsx` com as quatro variantes visuais
- [x] Acrescentar `desdeQuando` e `aviso` opcionais ao `CartaoNumero`, sem mudar o cartão atual quando ausentes
- [x] Criar a rota `prototipo-pausa` com a checagem de admin
- [x] Montar os seis cartões de exemplo, cada um com o rótulo do estado
- [x] Mostrar os três textos de efeito revisados
- [ ] Conferir a tela em largura de celular
- [ ] Conferir que `/configuracoes/whatsapp` segue igual
