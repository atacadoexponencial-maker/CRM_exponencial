import type { Metadata } from "next"
import Link from "next/link"

export const metadata: Metadata = {
  title: "Política de Privacidade — Atacado Exp",
  description: "Política de privacidade do Atacado Exp, produto da SETE ADS LTDA.",
}

export default function PoliticaDePrivacidadePage() {
  return (
    <main className="min-h-screen bg-white">
      <div className="max-w-3xl mx-auto px-6 py-16 text-sm text-gray-800">
      <Link href="/" className="inline-block mb-8 font-semibold text-gray-900 hover:underline">
        Atacado Exp
      </Link>
      <h1 className="text-2xl font-semibold mb-2">Política de Privacidade</h1>
      <p className="text-gray-500 mb-10">Última atualização: 9 de outubro de 2026</p>

      <section className="mb-8">
        <h2 className="text-base font-semibold mb-3">1. Quem somos</h2>
        <p>
          O <strong>Atacado Exp</strong> é uma plataforma de CRM para atacadistas que vendem pelo
          WhatsApp. É um produto da <strong>SETE ADS LTDA</strong>, CNPJ 22.987.352/0001-15, com sede na
          Rua Carlos Roberto de Melo, 475, Pavimento 11, Sala 05, Parque Gabriel, Hortolândia/SP,
          CEP 13186-604. Esta política explica como coletamos, usamos, guardamos e compartilhamos os
          dados tratados na plataforma.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-base font-semibold mb-3">2. Papéis na LGPD</h2>
        <ul className="list-disc pl-5 space-y-1">
          <li>
            <strong>Dados dos compradores</strong> (contatos e conversas): a empresa cliente que usa o
            Atacado Exp é a <strong>controladora</strong>. A Sete Ads é a <strong>operadora</strong> e trata
            esses dados só para prestar o serviço, conforme as instruções da empresa cliente.
          </li>
          <li>
            <strong>Dados dos usuários da plataforma</strong> (administradores, gerentes e atendentes): a
            Sete Ads é a <strong>controladora</strong>.
          </li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-base font-semibold mb-3">3. Dados que coletamos</h2>
        <p className="mb-2">Dos usuários da plataforma:</p>
        <ul className="list-disc pl-5 space-y-1 mb-4">
          <li>Nome, e-mail e senha de acesso</li>
          <li>Nome da empresa e o papel de cada usuário</li>
          <li>Registros de uso, como ações no funil e atribuições de atendimento</li>
        </ul>
        <p className="mb-2">
          Recebidos do WhatsApp, pela API Oficial do WhatsApp Business, quando a empresa cliente
          conecta um número:
        </p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Mensagens de texto e de mídia (imagem, áudio, vídeo e documento)</li>
          <li>Número de telefone e nome de perfil de quem escreve para a empresa</li>
          <li>Status de entrega e de leitura das mensagens</li>
          <li>Dados do número conectado: número, nome verificado e identificadores da conta</li>
          <li>Modelos de mensagem da conta</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-base font-semibold mb-3">4. Para que usamos</h2>
        <ul className="list-disc pl-5 space-y-1">
          <li>Receber as mensagens e mostrá-las na caixa de entrada da empresa cliente</li>
          <li>Permitir que o time da empresa cliente responda</li>
          <li>Enviar os modelos de mensagem e as campanhas pedidos pela empresa cliente</li>
          <li>Mostrar o status de entrega das mensagens</li>
          <li>Organizar funis, contatos, sequências e automações da empresa cliente</li>
          <li>Manter a plataforma funcionando e segura</li>
        </ul>
        <p className="mt-2">Não usamos os dados para nenhuma outra finalidade.</p>
      </section>

      <section className="mb-8">
        <h2 className="text-base font-semibold mb-3">5. O que não fazemos</h2>
        <ul className="list-disc pl-5 space-y-1">
          <li>Não vendemos nem alugamos dados</li>
          <li>Não usamos dados para publicidade</li>
          <li>Não usamos os dados de uma empresa cliente para outra empresa</li>
          <li>Não usamos os dados para treinar modelos de inteligência artificial</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-base font-semibold mb-3">6. Com quem compartilhamos</h2>
        <p className="mb-2">
          Compartilhamos dados só com os fornecedores que operam a plataforma, e só no necessário para
          isso:
        </p>
        <ul className="list-disc pl-5 space-y-1">
          <li>
            <strong>Meta Platforms, Inc.</strong>, pela API do WhatsApp Business: as mensagens enviadas e
            recebidas passam pela infraestrutura da Meta, sujeita à{" "}
            <a
              href="https://www.whatsapp.com/legal/privacy-policy"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 underline"
            >
              Política de Privacidade do WhatsApp
            </a>
          </li>
          <li><strong>Supabase</strong>: banco de dados e armazenamento de arquivos</li>
          <li><strong>Vercel</strong>: hospedagem do site e da plataforma</li>
          <li>Servidores contratados pela Sete Ads para operar a conexão com o WhatsApp</li>
        </ul>
        <p className="mt-2">
          Meta, Supabase e Vercel processam os dados nos <strong>Estados Unidos</strong>. Essa
          transferência internacional é feita para cumprir o contrato com a empresa cliente e com
          fornecedores que adotam cláusulas contratuais e medidas de segurança compatíveis com a LGPD.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-base font-semibold mb-3">7. Por quanto tempo guardamos</h2>
        <ul className="list-disc pl-5 space-y-1">
          <li>Os dados ficam guardados enquanto a conta da empresa cliente estiver ativa</li>
          <li>Um contato apagado vai para a lixeira e é excluído de vez após 30 dias</li>
          <li>
            Quando a conta é encerrada ou a exclusão é pedida, os dados são apagados em até 30 dias,
            salvo obrigação legal de guarda
          </li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-base font-semibold mb-3">8. Como pedir a exclusão</h2>
        <p className="mb-2">
          Envie o pedido para o e-mail de contato abaixo, informando a empresa e os dados que deseja
          excluir.
        </p>
        <p>
          Quem conectou o WhatsApp pelo login da Meta também pode pedir a exclusão pelas configurações da
          própria Meta. O pedido chega automaticamente ao Atacado Exp, recebe um código de acompanhamento
          e é atendido em até 30 dias.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-base font-semibold mb-3">9. Direitos do titular</h2>
        <p className="mb-2">Você tem direito a:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Acessar os dados pessoais que guardamos sobre você</li>
          <li>Pedir a correção de dados incorretos</li>
          <li>Pedir a exclusão dos seus dados</li>
          <li>Receber seus dados em formato estruturado (portabilidade)</li>
          <li>Revogar o consentimento a qualquer momento</li>
        </ul>
        <p className="mt-2">
          Se você conversou pelo WhatsApp com uma empresa que usa o Atacado Exp, procure primeiro essa
          empresa: ela é a controladora dos seus dados. Também pode nos escrever no e-mail abaixo.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-base font-semibold mb-3">10. Segurança</h2>
        <p>
          Usamos login com senha, permissões por papel (administrador, gerente e atendente) e
          separação dos dados de cada empresa: um cliente nunca vê os dados de outro. Os dados são
          criptografados no armazenamento e na transmissão.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-base font-semibold mb-3">11. Alterações nesta política</h2>
        <p>
          Podemos atualizar esta política periodicamente. Avisaremos os usuários sobre mudanças
          relevantes por e-mail ou dentro da plataforma. O uso continuado após as alterações
          implica aceitação da nova versão.
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold mb-3">12. Contato e encarregado de dados</h2>
        <p>
          Para dúvidas, pedidos ou reclamações sobre esta política e sobre seus dados, fale com o
          encarregado de dados:
        </p>
        <p className="mt-2">
          <strong>SETE ADS LTDA</strong>
          <br />
          <a
            href="mailto:atacadoexponencial@gmail.com"
            className="text-blue-600 underline"
          >
            atacadoexponencial@gmail.com
          </a>
        </p>
      </section>
      </div>
    </main>
  )
}
