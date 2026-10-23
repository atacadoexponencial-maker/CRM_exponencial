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
