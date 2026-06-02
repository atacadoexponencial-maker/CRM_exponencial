import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Termos de Serviço — CRM Exponencial",
  description: "Termos de serviço do CRM Exponencial, desenvolvido por Atacado Exponencial.",
}

export default function TermosDeServicoPage() {
  return (
    <main className="min-h-screen bg-white">
      <div className="max-w-3xl mx-auto px-6 py-16 text-sm text-gray-800">
        <h1 className="text-2xl font-semibold mb-2">Termos de Serviço</h1>
        <p className="text-gray-500 mb-10">Última atualização: 2 de junho de 2025</p>

        <section className="mb-8">
          <p>
            Ao acessar ou usar o <strong>CRM Exponencial</strong>, desenvolvido e operado por{" "}
            <strong>Atacado Exponencial</strong>, você concorda com estes Termos de Serviço. Leia-os
            com atenção antes de utilizar a plataforma.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-base font-semibold mb-3">1. Descrição do serviço</h2>
          <p>
            O CRM Exponencial é uma plataforma de gestão de relacionamento com clientes voltada para
            atacadistas que utilizam o WhatsApp como canal de vendas. A plataforma permite o
            gerenciamento de contatos, conversas, times de atendimento e pipeline de vendas por meio
            da integração com a WhatsApp Business API da Meta.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-base font-semibold mb-3">2. Elegibilidade</h2>
          <p>
            Para usar a plataforma, você deve ser maior de 18 anos, representar uma empresa
            legalmente constituída e ter autoridade para vincular essa empresa a estes termos. O
            cadastro de pessoa física não é permitido.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-base font-semibold mb-3">3. Uso da WhatsApp Business API</h2>
          <p className="mb-2">
            A integração com WhatsApp é realizada por meio da{" "}
            <strong>WhatsApp Business API da Meta Platforms, Inc.</strong> Ao conectar um número à
            plataforma, você declara que:
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>É o legítimo proprietário ou responsável pelo número de WhatsApp conectado</li>
            <li>Possui autorização para enviar mensagens aos contatos cadastrados</li>
            <li>Cumprirá as{" "}
              <a
                href="https://www.whatsapp.com/legal/business-policy"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 underline"
              >
                Políticas Comerciais do WhatsApp
              </a>
              {" "}e os Termos da API da Meta
            </li>
            <li>Não utilizará a plataforma para envio de spam, mensagens em massa não autorizadas ou conteúdo proibido</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-base font-semibold mb-3">4. Responsabilidades do usuário</h2>
          <p className="mb-2">Você é responsável por:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Manter a confidencialidade das credenciais de acesso da sua conta</li>
            <li>Todas as atividades realizadas sob seu workspace</li>
            <li>Garantir que os dados dos seus contatos foram obtidos de forma lícita e com consentimento adequado</li>
            <li>Cumprir a legislação de proteção de dados aplicável (LGPD e demais normas vigentes)</li>
            <li>Não compartilhar acesso à plataforma com pessoas não autorizadas</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-base font-semibold mb-3">5. Propriedade intelectual</h2>
          <p>
            Todo o código, design, marca e conteúdo da plataforma CRM Exponencial são de
            propriedade exclusiva da Atacado Exponencial. É vedada a reprodução, distribuição ou
            criação de obras derivadas sem autorização expressa por escrito.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-base font-semibold mb-3">6. Limitação de responsabilidade</h2>
          <p className="mb-2">
            A Atacado Exponencial não se responsabiliza por:
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Interrupções ou indisponibilidades da WhatsApp Business API causadas pela Meta</li>
            <li>Perda de dados decorrente de uso indevido ou violação de segurança por parte do usuário</li>
            <li>Danos indiretos, incidentais ou consequentes resultantes do uso da plataforma</li>
            <li>Mudanças nas políticas da Meta que afetem o funcionamento da integração</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-base font-semibold mb-3">7. Suspensão e encerramento</h2>
          <p>
            Reservamo-nos o direito de suspender ou encerrar o acesso de qualquer workspace que
            viole estes termos, sem aviso prévio e sem direito a reembolso. O usuário pode solicitar
            o encerramento da conta a qualquer momento pelo e-mail de contato abaixo.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-base font-semibold mb-3">8. Alterações nos termos</h2>
          <p>
            Podemos atualizar estes termos periodicamente. Notificaremos os usuários sobre mudanças
            relevantes por e-mail ou aviso dentro da plataforma. O uso continuado após as alterações
            implica aceitação da nova versão.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-base font-semibold mb-3">9. Lei aplicável</h2>
          <p>
            Estes termos são regidos pelas leis da República Federativa do Brasil. Qualquer litígio
            será submetido ao foro da comarca de domicílio do usuário, salvo disposição legal em
            contrário.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold mb-3">10. Contato</h2>
          <p>
            Em caso de dúvidas ou solicitações relacionadas a estes termos, entre em contato:
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
      </div>
    </main>
  )
}
