# B22-02: Política de Privacidade do Atacado Exp

**Tipo:** Implementação
**Página:** Política de Privacidade (`/politica-de-privacidade`)
**Repositório:** `crm-exponencial`
**Spec:** `pre-desenvolvimento/spec-landing-atacado-exp.md`, módulo 2

## Descrição

O texto da política passa a falar do Atacado Exp e da SETE ADS LTDA e cobre tudo o que o
módulo 2 da spec lista:
- papéis na LGPD;
- dados recebidos do WhatsApp e para que são usados;
- o que não fazemos com eles;
- operadores (Meta, Supabase, Vercel) e transferência para os EUA;
- retenção, incluindo a lixeira de 30 dias;
- como pedir a exclusão;
- direitos do titular;
- segurança em linguagem simples;
- contato do encarregado.

Ganha também um link "Atacado Exp" no topo, que leva para `/`. A aparência continua a
mesma.

## Pronto quando

- `/politica-de-privacidade` abre sem login com o texto novo, a data de atualização nova e
  o título da aba "Política de Privacidade — Atacado Exp".
- Não sobra nenhuma menção a "CRM Exponencial" nem a "Atacado Exponencial" como dona.
- O link da política do WhatsApp abre em nova aba, o e-mail é clicável e o link do topo
  volta para a landing.
- A Marcelle aprovou o texto.

## Cenários

### Happy Path
1. O visitante abre `/politica-de-privacidade` sem login. A rota já é pública no
   `src/middleware.ts`.
2. No topo há o link "Atacado Exp", que volta para `/`. Depois vêm o título, a data de
   atualização (a data em que a revisão entrar no ar) e as seções, nesta ordem:
   1. quem somos;
   2. papéis na LGPD;
   3. dados que coletamos (usuários e dados recebidos do WhatsApp);
   4. para que usamos;
   5. o que não fazemos;
   6. com quem compartilhamos e transferência internacional;
   7. por quanto tempo guardamos;
   8. como pedir a exclusão;
   9. direitos do titular;
   10. segurança;
   11. alterações;
   12. contato e encarregado.
3. A aba mostra "Política de Privacidade — Atacado Exp".

### Edge Cases
- **Pedido de exclusão pela Meta:** `src/app/api/exclusao-de-dados/route.ts` registra o
  pedido em `data_deletion_requests` com status `pending` e devolve o endereço de
  acompanhamento `/exclusao-de-dados/<código>`. A política diz só o que é verdade: o
  pedido é registrado, pode ser acompanhado pelo código e é atendido em até 30 dias.
  Não promete exclusão instantânea.
- **Lixeira:** contato apagado some de vez em 30 dias (`src/app/api/cron/lixeira/route.ts`,
  B13-06).
- **Servidores próprios:** além de Meta, Supabase e Vercel, a plataforma usa servidores
  contratados pela Sete Ads para operar a conexão (o gateway). Para a política não
  omitir um operador, eles entram como "servidores contratados pela Sete Ads", sem citar o
  canal direto nem o QR Code, como manda a spec.
- **Tela estreita:** o layout atual (`max-w-3xl`, `px-6`) já funciona no celular.

### Cenário de Erro
Página estática, sem chamada de rede, então não há erro de execução. Os erros de texto
(sobrar "CRM Exponencial" ou "Atacado Exponencial" como dona, faltar CNPJ) são cobertos
pelo teste.

## Banco de Dados

Não se aplica. A página só descreve o que existe.

## Arquivos

- **Modificar:** `src/app/politica-de-privacidade/page.tsx`: o texto novo, conforme a
  spec, módulo 2. Mantém a estrutura visual atual (`bg-white`, `text-gray-800`, as mesmas
  seções e listas) e ganha o link "Atacado Exp" para `/` no topo. O tema escuro do CRM
  não interfere, porque a página já define fundo e cor de texto próprios.
- **Criar:** `src/test/politica-de-privacidade.test.tsx`: renderiza a página e confere:
  - o título da aba;
  - SETE ADS LTDA, CNPJ e endereço;
  - nenhuma menção a "CRM Exponencial" e nenhuma a "Atacado Exponencial" como dona (o
    e-mail `atacadoexponencial@` pode ficar);
  - Meta, Supabase e Vercel citados, com Estados Unidos;
  - os papéis de controladora e operadora;
  - a lixeira de 30 dias;
  - o link para `/`, o link externo da política do WhatsApp com `target="_blank"` e o
    `mailto:`.

## Dependências Externas

Nenhuma.

## Checklist

- [x] Reescrever o texto de `src/app/politica-de-privacidade/page.tsx` com as 12 seções
      da spec, metadata nova e data de atualização
- [x] Link "Atacado Exp" no topo levando para `/`
- [x] Criar `src/test/politica-de-privacidade.test.tsx` e rodá-lo
- [x] `npx eslint` no arquivo sem erros
- [ ] Publicar no preview junto com a B22-01 para a Marcelle aprovar o texto
