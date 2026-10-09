# B22-03: Termos de Serviço do Atacado Exp

**Tipo:** Implementação
**Página:** Termos de Serviço (`/termos-de-servico`)
**Repositório:** `crm-exponencial`
**Spec:** `pre-desenvolvimento/spec-landing-atacado-exp.md`, módulo 3

## Descrição

O texto dos termos passa a ter a SETE ADS LTDA como prestadora, com CNPJ e endereço, e o
Atacado Exp como produto. A descrição do serviço fica atualizada. A cláusula do WhatsApp
ganha opt-in, custos da Meta por conta do cliente e risco de limitação do número. Entram
ainda a cláusula de dados, que remete à política, e o foro de Hortolândia/SP. Ganha um
link "Atacado Exp" no topo, que leva para `/`, e um link para a política. A aparência
continua a mesma.

## Pronto quando

- `/termos-de-servico` abre sem login com o texto novo, a data de atualização nova e o
  título da aba "Termos de Serviço — Atacado Exp".
- Não sobra nenhuma menção a "CRM Exponencial" nem a "Atacado Exponencial" como dona.
- O link das políticas comerciais do WhatsApp abre em nova aba. O link para a política, o
  e-mail e o link do topo funcionam.
- A Marcelle aprovou o texto.

## Cenários

### Happy Path
1. O visitante abre `/termos-de-servico` sem login. A rota já é pública no middleware.
2. No topo há o link "Atacado Exp", que volta para `/`. Depois vêm o título, a data de
   atualização e as seções:
   - partes (SETE ADS LTDA, CNPJ, endereço);
   - descrição do serviço com os recursos atuais;
   - elegibilidade;
   - uso da API do WhatsApp (declarações atuais, opt-in, custos da Meta pagos pelo cliente,
     limitação do número pela Meta);
   - responsabilidades do usuário;
   - dados (remete à política e diz que o cliente é o controlador);
   - propriedade intelectual (Sete Ads);
   - limitação de responsabilidade;
   - suspensão e encerramento;
   - alterações;
   - lei aplicável e foro de Hortolândia/SP;
   - contato.
3. A aba mostra "Termos de Serviço — Atacado Exp".

### Edge Cases
- **"Atacado Exponencial" como dona:** em todo lugar vira Sete Ads ou SETE ADS LTDA, e
  "CRM Exponencial" vira "Atacado Exp". O e-mail `atacadoexponencial@gmail.com` continua.
- **Tela estreita:** o layout atual já funciona no celular.

### Cenário de Erro
Página estática, sem erro de execução. Os erros de texto são cobertos pelo teste.

## Banco de Dados

Não se aplica.

## Arquivos

- **Modificar:** `src/app/termos-de-servico/page.tsx`: texto novo conforme a spec,
  módulo 3. Mesma estrutura visual, mais o link "Atacado Exp" no topo e o link para
  `/politica-de-privacidade` na cláusula de dados.
- **Criar:** `src/test/termos-de-servico.test.tsx`: confere:
  - o título da aba;
  - SETE ADS LTDA com CNPJ e endereço;
  - que não sobra "CRM Exponencial" nem "Atacado Exponencial";
  - o foro de Hortolândia/SP;
  - o opt-in e os custos da Meta por conta do cliente;
  - os links (`/`, política, políticas comerciais do WhatsApp em nova aba e `mailto:`).

## Dependências Externas

Nenhuma.

## Checklist

- [x] Reescrever `src/app/termos-de-servico/page.tsx` com o texto da spec, metadata nova e
      data de atualização
- [x] Links "Atacado Exp" no topo e para a política na cláusula de dados
- [x] Criar `src/test/termos-de-servico.test.tsx` e rodá-lo
- [x] `npx eslint` no arquivo sem erros
- [ ] Publicar no preview junto com a B22-01 e a B22-02 para a Marcelle aprovar o texto
