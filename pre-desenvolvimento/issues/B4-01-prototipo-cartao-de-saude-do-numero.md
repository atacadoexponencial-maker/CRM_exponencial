# B4-01: Protótipo — Cartão de Saúde do Número

**Tipo:** Protótipo
**Módulo:** B4 — Saúde e Risco do Número
**Repositório:** `CRM_exponencial`

---

## Contexto

O canal direto (gateway) atende também prospecção fria e Campanhas, que é o uso com maior
risco de o WhatsApp banir o número. O cliente precisa **enxergar o risco antes de perder o
número**, não depois — e hoje a tela de WhatsApp do CRM mostra apenas "Conectado" ou
"Desconectado", em um `Badge`.

Esta issue monta só a tela, com dados fixos escritos no código. Nenhuma chamada ao
gateway, nenhuma decisão de negócio. Serve para a Marcelle olhar e dizer se é isso, antes
de alguém gastar tempo ligando os fios.

---

## O que construir

A tela de saúde de **um** número conectado, com os cinco componentes que a spec descreve:

1. **Cartão de Saúde** — estado da conexão, tempo conectado, volume enviado hoje e na hora corrente
2. **Medidor de Consumo** — quanto dos tetos por hora e por dia já foi usado
3. **Indicador de Aquecimento** — dias restantes e tetos vigentes de um número novo
4. **Sinal de Risco** — baixo, médio ou alto, com a explicação do que está elevando
5. **Aviso de Freio** — destaque quando os envios do número estão interrompidos, com o botão de retomar

Monte **três estados** da tela, em dados fixos, porque é neles que o desenho se prova:

- número maduro, risco baixo, consumo em 30% dos tetos;
- número novo em aquecimento, dia 3, risco médio, consumo em 90% do teto da hora;
- número freado por proporção de falhas, com 1.840 mensagens paradas e risco alto.

Não existe primitivo de barra de progresso em `src/components/ui/` — o medidor precisa ser
construído. Fazer o mais simples que comunique, com Tailwind, e **não** instalar
biblioteca de gráfico para isso.

---

## Comportamentos da spec cobertos

Nenhum — protótipo é tela, sem comportamento ligado. Os 8 comportamentos de B4 entram em
`B4-02`, `B4-03` e `B4-04`.

---

## Contrato do gateway

Nenhuma chamada nesta issue. Os dados são fixos, escritos no próprio componente.

O formato real vem do endpoint de saúde, que ainda **não existe** e será definido em
`B4-00`. Por isso o protótipo não deve inventar nomes de campo que pareçam contrato: use
nomes em português, do domínio do CRM.

---

## Arquivos

Pesquisado no repo antes de listar:

- **Criar:** a rota da tela, seguindo o padrão de pasta por comportamento das outras
  telas de configuração — sugestão `src/app/(auth)/configuracoes/whatsapp/[id]/saude/`,
  com `page.tsx` (server component, checa papel) e um client component para a tela
- **Criar:** os componentes do cartão, medidor, aquecimento, risco e freio, na mesma pasta
- **Reutilizar:** `src/components/ui/badge.tsx` e `src/components/ui/button.tsx`; o
  padrão de layout e de checagem de papel de
  `src/app/(auth)/configuracoes/whatsapp/page.tsx:8-21` (`perfil?.role !== "admin"` →
  `redirect("/perfil")`), e o container `max-w-5xl mx-auto w-full px-4 py-8`

**Atenção, achado da pesquisa:** `configuracoes/whatsapp/page.tsx` assume **um único
número por workspace** — é `conexao ? cartão : wizard`, sem lista. B4 e B5 são **por
número**. Transformar essa tela em lista é escopo de B2 (Conexão de Número por QR Code),
não desta issue. Enquanto B2 não existir, a tela de saúde é alcançada por URL direta.

---

## Depende de

Nada. Protótipo com dados fixos não depende de `B4-00` nem de B2.

---

## Critérios de aceite

- [ ] A tela abre e mostra os cinco componentes da spec
- [ ] Os três estados (maduro, em aquecimento, freado) são visíveis, sem precisar editar o código para trocar
- [ ] O medidor mostra proporção de consumo, não só o número absoluto
- [ ] O aviso de freio se destaca dos outros elementos e diz o motivo
- [ ] O sinal de risco diz **o que** o está elevando, não só a classificação
- [ ] A tela funciona em largura de celular
- [ ] Papel: só Admin e Gerente alcançam a tela
- [ ] `npm run build` e `npm run lint` passam

## Fora de escopo

- Qualquer chamada ao gateway — é `B4-02`
- Calcular risco, consumo ou aquecimento: nesta issue os números são fixos
- O botão de retomar funcionar de verdade — é `B4-04`
- Transformar a tela de WhatsApp em lista de números — é B2
- Alertas na central de alertas — é `B4-03`
