# B24-02: Política de Privacidade e Termos com a SETE ADS 2 LTDA

**Tipo:** Implementação
**Página:** `/politica-de-privacidade` e `/termos-de-servico`
**Repositório:** `crm-exponencial`
**Spec:** `pre-desenvolvimento/spec-landing-crmatacado-exp.md`

## Descrição

Atualizar as duas páginas públicas já existentes: empresa responsável SETE ADS 2 LTDA com CNPJ e endereço, operadores Supabase, Vercel e Meta nomeados, parágrafo sobre o uso dos dados do WhatsApp (não vendidos, sem publicidade, apagados ao desconectar ou a pedido), foro em Hortolândia/SP e data de atualização nova.

## Pronto quando

As duas páginas abrem sem login e dizem o mesmo que foi declarado no formulário da Meta: quem é a controladora, quem processa os dados e o que é feito com o que chega do WhatsApp.

## Critérios de aceite

- **CA-B24-15** (automática) — Política cita a empresa certa. Dado a página de política aberta, quando se lê o texto, então aparece "SETE ADS 2 LTDA" e "53.756.257/0001-34", e não aparece "SETE ADS LTDA" sozinha nem "22.987.352/0001-15".
- **CA-B24-16** (automática) — Política nomeia os operadores e o uso dos dados da Meta. Dado a página de política aberta, quando se lê o texto, então aparecem "Supabase", "Vercel" e "Meta" como quem processa dados, e um parágrafo diz que os dados do WhatsApp não são vendidos nem usados para publicidade e são apagados ao desconectar o número ou a pedido.
- **CA-B24-17** (automática) — Termos citam a empresa e o foro. Dado a página de termos aberta, quando se lê o texto, então aparece "SETE ADS 2 LTDA", "53.756.257/0001-34" e a comarca do foro escolhida; não aparece "domicílio do usuário".

## Suposições

| ID | Suposição | Status | Resolução |
|---|---|---|---|
| SUP-B24-01 | O endereço da SETE ADS 2 LTDA que vai no rodapé e na política é o mesmo da B22: Rua Carlos Roberto de Melo, 475, Pavimento 11, Sala 05, Parque Gabriel, Hortolândia/SP, CEP 13186-604 | confirmada | Marcelle, 23/10/2026 |
| SUP-B24-02 | O foro dos termos passa a ser a comarca de Hortolândia/SP, como decidido na B22 | confirmada | Marcelle, 23/10/2026 |

## Perguntas em aberto

| ID | Pergunta | Status | Resposta |
|---|---|---|---|

Nenhuma.

## Cenários

### Happy Path
1. Visitante abre `/politica-de-privacidade` sem login (o porteiro já libera a rota).
2. Lê na abertura que o crmatacado exp é desenvolvido e operado pela SETE ADS 2 LTDA, CNPJ 53.756.257/0001-34.
3. Em "Dados que coletamos" vê também os modelos de mensagem e o status do número e da conta do WhatsApp Business.
4. Em "Compartilhamento com terceiros" vê os operadores nomeados: Meta (API do WhatsApp), Supabase (banco e arquivos) e Vercel (hospedagem), e que nenhum usa os dados para fins próprios.
5. Vê a seção "Uso dos dados recebidos do WhatsApp": só para prestar o serviço à empresa que conectou o número; não vendidos; sem publicidade; apagados ao desconectar o número ou a pedido.
6. No contato vê SETE ADS 2 LTDA, endereço de Hortolândia/SP e o e-mail como link.
7. Abre `/termos-de-servico`: abertura com SETE ADS 2 LTDA e CNPJ; propriedade intelectual e limitação de responsabilidade citam a SETE ADS 2 LTDA; foro da comarca de Hortolândia/SP; contato com razão social e endereço.
8. As duas páginas mostram "Última atualização: 23 de outubro de 2026".

### Edge Cases
- Nome "Atacado Exponencial" continua existindo como marca da empresa: pode aparecer como "SETE ADS 2 LTDA (Atacado Exponencial)" na abertura, mas nunca sozinho como operadora.
- A descrição para buscadores (metadata) também troca "Atacado Exponencial" por "SETE ADS 2 LTDA".

### Cenário de Erro
- Páginas estáticas, sem dados nem formulário: não há erro de execução possível além de a página não abrir, o que o porteiro já cobre.

## Prova

| Critério | Prova | Onde | O que confere |
|---|---|---|---|
| CA-B24-15 | automática | `src/test/b24-politica-e-termos.test.tsx` | o texto da política traz "SETE ADS 2 LTDA" e "53.756.257/0001-34" e não traz "SETE ADS LTDA" sozinha nem "22.987.352/0001-15" |
| CA-B24-16 | automática | `src/test/b24-politica-e-termos.test.tsx` | o texto da política cita Supabase, Vercel e Meta e o parágrafo que diz que os dados do WhatsApp não são vendidos, não vão para publicidade e são apagados ao desconectar ou a pedido |
| CA-B24-17 | automática | `src/test/b24-politica-e-termos.test.tsx` | o texto dos termos traz "SETE ADS 2 LTDA", "53.756.257/0001-34" e "comarca de Hortolândia" e não traz "domicílio do usuário" |

## Banco de Dados

Não se aplica.

## Arquivos

- **Modificar:** `src/app/politica-de-privacidade/page.tsx` — abertura, dados coletados, compartilhamento (operadores), seção nova de uso dos dados do WhatsApp, contato e data.
- **Modificar:** `src/app/termos-de-servico/page.tsx` — abertura, propriedade intelectual, limitação de responsabilidade, foro, contato e data.
- **Criar:** `src/test/b24-politica-e-termos.test.tsx` — renderiza as duas páginas com `renderToStaticMarkup` (como `src/test/tema.test.tsx` já faz) e confere os textos.

## Dependências Externas

Nenhuma.

## Checklist

- [x] Política: abertura com SETE ADS 2 LTDA e CNPJ
- [x] Política: dados coletados incluem modelos de mensagem e status do número/conta
- [x] Política: operadores Meta, Supabase e Vercel nomeados, sem uso próprio
- [x] Política: seção "Uso dos dados recebidos do WhatsApp"
- [x] Política: contato com razão social, endereço e e-mail; data 23/10/2026; metadata
- [x] Termos: abertura, propriedade intelectual e responsabilidade com SETE ADS 2 LTDA
- [x] Termos: foro da comarca de Hortolândia/SP; contato com endereço; data; metadata
- [x] Teste `src/test/b24-politica-e-termos.test.tsx` com CA-B24-15, 16 e 17 no nome
