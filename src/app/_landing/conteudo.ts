// B24-01: todos os textos da landing num lugar só. A página e o teste leem daqui,
// então o que a Marcelle trocar no preview muda nos dois.

export const EMPRESA = {
  produto: "crmatacado exp",
  razaoSocial: "SETE ADS 2 LTDA",
  cnpj: "53.756.257/0001-34",
  endereco: "Rua Carlos Roberto de Melo, 475, Pavimento 11, Sala 05, Parque Gabriel, Hortolândia/SP, CEP 13186-604",
  email: "atacadoexponencial@gmail.com",
} as const

export const WHATSAPP_DEMONSTRACAO = {
  numero: "5519981702315",
  mensagem: "Olá! Quero uma demonstração do crmatacado exp.",
} as const

export const LINK_DEMONSTRACAO = `https://wa.me/${WHATSAPP_DEMONSTRACAO.numero}?text=${encodeURIComponent(WHATSAPP_DEMONSTRACAO.mensagem)}`

export const TITULO_ABA = "crmatacado exp — CRM para atacadistas que vendem pelo WhatsApp"
export const DESCRICAO_ABA =
  "Caixa de entrada, funis, catálogo e relatórios num só lugar, para times de atacado que vendem pelo WhatsApp. Conexão pela API Oficial do WhatsApp Business."

export const ANCORAS = [
  { id: "modulos", rotulo: "Módulos" },
  { id: "como-funciona", rotulo: "Como funciona" },
  { id: "para-quem", rotulo: "Para quem" },
  { id: "perguntas", rotulo: "Perguntas" },
] as const

export const ABERTURA = {
  rotulo: "CRM para atacado",
  titulo: "Transforme o WhatsApp do seu atacado em uma máquina de pedidos",
  subtitulo: "Caixa de entrada, funis, catálogo e relatórios num só lugar, para times que vendem pelo WhatsApp.",
  selos: ["API Oficial do WhatsApp Business", "Implantação acompanhada", "Suporte humano"],
} as const

export const DOR = {
  rotulo: "A dor",
  titulo: "Vender pelo WhatsApp sem sistema custa caro",
  itens: [
    { titulo: "Pedido anotado em três lugares", texto: "Um no caderno, um na conversa, outro na planilha. Na hora de separar, falta peça e sobra dúvida." },
    { titulo: "Cliente que compra uma vez e some", texto: "Ninguém lembra de chamar de novo. A recompra, que é o lucro do atacado, fica no acaso." },
    { titulo: "Follow-up que o vendedor esquece", texto: "O lead pediu tabela, o vendedor foi atender outro e a conversa morreu no meio." },
    { titulo: "Fim do mês sem número", texto: "Quanto cada vendedor vendeu? Quantos clientes novos entraram? Só olhando conversa por conversa." },
  ],
} as const

export const VIRADA = {
  rotulo: "A virada",
  titulo: "Do primeiro \"oi\" à recompra, tudo no mesmo lugar",
  passos: [
    { titulo: "O contato chega", texto: "A mensagem cai na caixa de entrada do time, com nome, telefone e histórico do contato." },
    { titulo: "O vendedor responde e qualifica", texto: "O contato entra no funil de Entrada e avança etapa por etapa, com etiquetas e mensagens rápidas." },
    { titulo: "O pedido vira compra", texto: "O cliente monta o pedido no catálogo, ele chega pelo WhatsApp e fica registrado como compra." },
    { titulo: "A recompra acontece", texto: "O cliente passa ao funil de Recompra e as sequências lembram o vendedor de voltar a falar com ele." },
  ],
} as const

export const MODULOS = {
  rotulo: "Módulos",
  titulo: "Tudo o que o time de vendas usa no dia",
  itens: [
    { icone: "inbox", titulo: "Caixa de entrada", texto: "Todas as conversas do número da empresa, com texto, imagem, áudio e documento, etiquetas e mensagens rápidas." },
    { icone: "funil", titulo: "Funis de Entrada e Recompra", texto: "Cada contato no seu estágio, do primeiro contato à recompra, e funis próprios da empresa quando precisar." },
    { icone: "contatos", titulo: "Contatos", texto: "Ficha com histórico, compras, etiquetas e filtros salvos para achar quem importa." },
    { icone: "agenda", titulo: "Sequências e agenda", texto: "Lembretes de follow-up para o vendedor não esquecer ninguém." },
    { icone: "campanhas", titulo: "Campanhas", texto: "Envio de modelos de mensagem aprovados para listas segmentadas, com relatório de entrega." },
    { icone: "automacoes", titulo: "Automações", texto: "Regras em fluxo que movem o contato, marcam etiquetas e disparam mensagens sozinhas." },
    { icone: "catalogo", titulo: "Catálogo e loja", texto: "Vitrine com valores por quantidade, pedido mínimo e grade. O pedido chega pelo WhatsApp." },
    { icone: "relatorios", titulo: "Relatórios", texto: "Visão geral, RFV, coorte, funil de clientes e carteiras por vendedor." },
  ],
} as const

export const PARA_QUEM = {
  rotulo: "Para quem",
  titulo: "Feito para quem vende no atacado",
  perfis: [
    { titulo: "Atacadistas e distribuidores", texto: "Que atendem lojistas todos os dias e precisam de histórico de cada um." },
    { titulo: "Marcas que vendem no atacado pelo WhatsApp", texto: "Que recebem dezenas de conversas por dia e não querem perder nenhuma." },
    { titulo: "Fábricas e multimarcas", texto: "Com grade, pedido mínimo e tabela por quantidade." },
    { titulo: "Times com vários vendedores", texto: "Com papéis de administrador, gerente e atendente, cada um vendo o que precisa." },
  ],
} as const

export const CONEXAO = {
  rotulo: "Como funciona",
  titulo: "Conexão com o WhatsApp em quatro passos",
  passos: [
    { titulo: "A empresa entra no crmatacado exp", texto: "Com o usuário administrador criado para ela." },
    { titulo: "O administrador clica em conectar", texto: "Abre a janela oficial da Meta, onde ele escolhe o portfólio, a conta do WhatsApp Business e o número." },
    { titulo: "As mensagens passam a chegar", texto: "O que os compradores mandam para o número cai na caixa de entrada, e o time responde por ali." },
    { titulo: "Desconecta quando quiser", texto: "O administrador remove o número da plataforma a qualquer momento." },
  ],
  nota: "A conexão usa a API Oficial do WhatsApp Business. O envio de modelos de mensagem segue as regras da Meta e é cobrado por ela direto na conta da empresa.",
} as const

export const SEUS_DADOS = {
  rotulo: "Seus dados",
  titulo: "O que é da sua empresa fica com a sua empresa",
  itens: [
    "Cada empresa só vê os próprios dados.",
    "Os dados não são vendidos nem usados para publicidade.",
    "A empresa pode pedir a exclusão a qualquer momento.",
  ],
} as const

export const PERGUNTAS = {
  rotulo: "Perguntas",
  titulo: "Perguntas frequentes",
  itens: [
    { pergunta: "Preciso de um número novo de WhatsApp?", resposta: "Não. Você conecta um número que já é da empresa, pela janela oficial da Meta. Se preferir separar, pode conectar um número só para o time de vendas." },
    { pergunta: "O número conectado continua no celular?", resposta: "Não. Um número conectado pela API Oficial passa a ser atendido pelo crmatacado exp, no computador ou no celular, pelo navegador. É por isso que o time todo vê as mesmas conversas." },
    { pergunta: "Quantos vendedores podem usar?", resposta: "Quantos a empresa precisar. Cada um entra com o próprio usuário, no papel de administrador, gerente ou atendente, e o atendente vê só as conversas e os contatos dele." },
    { pergunta: "Funciona no celular?", resposta: "Sim. A plataforma abre no navegador do celular, com a caixa de entrada, o funil e o catálogo adaptados à tela pequena." },
    { pergunta: "Como é a implantação?", resposta: "Acompanhada. Criamos a empresa, conectamos o número com você, importamos os produtos por planilha e treinamos o time nas primeiras semanas." },
    { pergunta: "Como peço uma demonstração?", resposta: "Pelo botão \"Solicitar demonstração\", que abre uma conversa no WhatsApp com a nossa equipe. A gente marca um horário e mostra o sistema com os seus produtos." },
  ],
} as const

export const CHAMADA_FINAL = {
  titulo: "Organize as vendas do seu atacado",
  texto: "Veja o crmatacado exp funcionando com o seu catálogo e o seu time.",
} as const

export const BOTAO_DEMONSTRACAO = "Solicitar demonstração"
export const BOTAO_ENTRAR = "Entrar"
export const LINK_VER_COMO_FUNCIONA = "Ver como funciona"

// Prints reais da empresa de teste, tirados a 1440 px no tema claro (CA-B24-12).
export const PRINTS = {
  caixaDeEntrada: { src: "/landing/caixa-de-entrada.png", alt: "Caixa de entrada do crmatacado exp com as conversas do time", largura: 1440, altura: 900 },
  funil: { src: "/landing/funil.png", alt: "Funil de Entrada do crmatacado exp com os cards por etapa", largura: 1440, altura: 860 },
  catalogo: { src: "/landing/catalogo.png", alt: "Catálogo de produtos do crmatacado exp", largura: 1440, altura: 860 },
  conexao: { src: "/landing/conexao.png", alt: "Tela de conexão do número no crmatacado exp", largura: 1440, altura: 860 },
} as const
