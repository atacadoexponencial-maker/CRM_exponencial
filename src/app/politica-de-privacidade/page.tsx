import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Política de Privacidade — CRM Exponencial",
  description: "Política de privacidade do CRM Exponencial, desenvolvido por Atacado Exponencial.",
}

export default function PoliticaDePrivacidadePage() {
  return (
    <main className="max-w-3xl mx-auto px-6 py-16 text-sm text-gray-800">
      <h1 className="text-2xl font-semibold mb-2">Política de Privacidade</h1>
      <p className="text-gray-500 mb-10">Última atualização: 29 de maio de 2025</p>

      <section className="mb-8">
        <p>
          Esta Política de Privacidade descreve como o <strong>CRM Exponencial</strong>, desenvolvido e
          operado por <strong>Atacado Exponencial</strong>, coleta, usa, armazena e compartilha
          informações dos usuários e de seus clientes finais.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-base font-semibold mb-3">1. Dados que coletamos</h2>
        <p className="mb-2">Ao usar o CRM Exponencial, coletamos:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Nome, e-mail e senha dos usuários da plataforma (administradores e atendentes)</li>
          <li>Nome da empresa e informações do workspace</li>
          <li>Números de telefone WhatsApp conectados à plataforma via WhatsApp Business API</li>
          <li>Mensagens trocadas entre atendentes e contatos via WhatsApp (texto, imagens, documentos, áudio e vídeo)</li>
          <li>Nome e número de telefone dos contatos dos clientes finais</li>
          <li>Dados de uso da plataforma (ações no pipeline, atribuições de atendimento)</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-base font-semibold mb-3">2. Como usamos os dados</h2>
        <p className="mb-2">Utilizamos as informações coletadas para:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Operar e manter a plataforma CRM Exponencial</li>
          <li>Facilitar o envio e recebimento de mensagens via WhatsApp Business API</li>
          <li>Organizar conversas, contatos e pipeline de vendas dos usuários</li>
          <li>Garantir a segurança e o isolamento dos dados entre diferentes empresas (workspaces)</li>
          <li>Melhorar e desenvolver novas funcionalidades da plataforma</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-base font-semibold mb-3">3. Compartilhamento com terceiros</h2>
        <p className="mb-2">
          Para operar a integração com WhatsApp, utilizamos a{" "}
          <strong>WhatsApp Business API da Meta Platforms, Inc.</strong> Mensagens enviadas e recebidas
          pela plataforma passam pela infraestrutura da Meta, sujeita à{" "}
          <a
            href="https://www.whatsapp.com/legal/privacy-policy"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 underline"
          >
            Política de Privacidade do WhatsApp
          </a>
          .
        </p>
        <p className="mb-2">
          Utilizamos o <strong>Supabase</strong> para armazenamento de dados, hospedado em
          servidores seguros com criptografia em repouso e em trânsito.
        </p>
        <p>
          Não vendemos, alugamos nem compartilhamos dados pessoais com terceiros para fins de
          marketing ou publicidade.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-base font-semibold mb-3">4. Retenção de dados</h2>
        <p>
          Os dados são mantidos enquanto o workspace estiver ativo na plataforma. Ao solicitar o
          encerramento da conta, os dados serão excluídos em até 30 dias, salvo obrigação legal de
          retenção.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-base font-semibold mb-3">5. Direitos dos usuários</h2>
        <p className="mb-2">Você tem direito a:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Acessar os dados pessoais que armazenamos sobre você</li>
          <li>Solicitar a correção de dados incorretos</li>
          <li>Solicitar a exclusão dos seus dados</li>
          <li>Portabilidade dos seus dados em formato estruturado</li>
          <li>Revogar o consentimento para o tratamento de dados a qualquer momento</li>
        </ul>
        <p className="mt-2">
          Para exercer qualquer um desses direitos, entre em contato pelo e-mail abaixo.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-base font-semibold mb-3">6. Segurança</h2>
        <p>
          Adotamos medidas técnicas e organizacionais para proteger seus dados contra acesso não
          autorizado, perda ou divulgação indevida, incluindo autenticação segura, controle de
          acesso por papéis e isolamento de dados por workspace via Row Level Security (RLS).
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-base font-semibold mb-3">7. Alterações nesta política</h2>
        <p>
          Podemos atualizar esta política periodicamente. Notificaremos os usuários sobre mudanças
          relevantes por e-mail ou aviso dentro da plataforma. O uso continuado após as alterações
          implica aceitação da nova versão.
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold mb-3">8. Contato</h2>
        <p>
          Em caso de dúvidas, solicitações ou reclamações relacionadas a esta política, entre em
          contato:
        </p>
        <p className="mt-2">
          <strong>Atacado Exponencial</strong>
          <br />
          <a
            href="mailto:atacadoexponencial@gmail.com"
            className="text-blue-600 underline"
          >
            atacadoexponencial@gmail.com
          </a>
        </p>
      </section>
    </main>
  )
}
