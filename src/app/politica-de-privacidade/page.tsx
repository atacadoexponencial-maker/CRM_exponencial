import type { Metadata } from "next"
import { TemaClaro } from "@/components/shared/tema-claro"

export const metadata: Metadata = {
  title: "Política de Privacidade — crmatacado exp",
  description: "Política de privacidade do crmatacado exp, desenvolvido e operado pela SETE ADS 2 LTDA.",
}

export default function PoliticaDePrivacidadePage() {
  return (
    <TemaClaro>
    <main className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-6 py-16 text-sm text-foreground">
      <h1 className="text-[26px] font-semibold leading-tight tracking-tight mb-2">Política de Privacidade</h1>
      <p className="text-muted-foreground mb-10">Última atualização: 23 de outubro de 2026</p>

      <section className="mb-8">
        <p>
          Esta Política de Privacidade descreve como o <strong>crmatacado exp</strong>, desenvolvido e
          operado pela <strong>SETE ADS 2 LTDA</strong>, CNPJ 53.756.257/0001-34 (marca Atacado
          Exponencial), coleta, usa, armazena e compartilha informações dos usuários e de seus
          clientes finais. A SETE ADS 2 LTDA é a controladora desses dados.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-base font-semibold mb-3">1. Dados que coletamos</h2>
        <p className="mb-2">Ao usar o crmatacado exp, coletamos:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Nome, e-mail e senha dos usuários da plataforma (administradores e atendentes)</li>
          <li>Nome da empresa e informações do workspace</li>
          <li>Números de telefone WhatsApp conectados à plataforma via WhatsApp Business API</li>
          <li>Mensagens trocadas entre atendentes e contatos via WhatsApp (texto, imagens, documentos, áudio e vídeo)</li>
          <li>Nome e número de telefone dos contatos dos clientes finais</li>
          <li>Lista de modelos de mensagem aprovados da conta do WhatsApp Business e o status do número e da conta (qualidade, nome exibido, limite de envio)</li>
          <li>Dados de uso da plataforma (ações no pipeline, atribuições de atendimento)</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-base font-semibold mb-3">2. Como usamos os dados</h2>
        <p className="mb-2">Utilizamos as informações coletadas para:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Operar e manter a plataforma crmatacado exp</li>
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
            className="text-info underline"
          >
            Política de Privacidade do WhatsApp
          </a>
          .
        </p>
        <p className="mb-2">
          Para guardar e processar os dados, contratamos operadores que agem só sob nossas
          instruções e não usam os dados para fins próprios:
        </p>
        <ul className="list-disc pl-5 space-y-1 mb-2">
          <li><strong>Supabase</strong> — banco de dados, autenticação e arquivos, com criptografia em repouso e em trânsito</li>
          <li><strong>Vercel</strong> — hospedagem da aplicação e processamento das requisições</li>
          <li><strong>Meta Platforms, Inc.</strong> — envio e recebimento das mensagens pela API do WhatsApp</li>
        </ul>
        <p>
          Não vendemos, alugamos nem compartilhamos dados pessoais com terceiros para fins de
          marketing ou publicidade.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-base font-semibold mb-3">4. Uso dos dados recebidos do WhatsApp</h2>
        <p className="mb-2">
          Os dados que recebemos pela API do WhatsApp Business (mensagens, nome e telefone dos
          contatos, modelos de mensagem e status do número) são usados exclusivamente para prestar
          o serviço à empresa que conectou o número: exibir as conversas na caixa de entrada do
          time, organizar contatos e funis e enviar as mensagens que a própria empresa escreve ou
          agenda.
        </p>
        <p>
          Esses dados não são vendidos, não são usados para publicidade nem para treinar modelos, e
          não são compartilhados com outras empresas que usam a plataforma. Eles são apagados
          quando a empresa desconecta o número ou pede a exclusão pelo e-mail de contato.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-base font-semibold mb-3">5. Retenção de dados</h2>
        <p>
          Os dados são mantidos enquanto o workspace estiver ativo na plataforma. Ao solicitar o
          encerramento da conta, os dados serão excluídos em até 30 dias, salvo obrigação legal de
          retenção.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-base font-semibold mb-3">6. Direitos dos usuários</h2>
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
        <h2 className="text-base font-semibold mb-3">7. Segurança</h2>
        <p>
          Adotamos medidas técnicas e organizacionais para proteger seus dados contra acesso não
          autorizado, perda ou divulgação indevida, incluindo autenticação segura, controle de
          acesso por papéis e isolamento de dados por workspace via Row Level Security (RLS).
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-base font-semibold mb-3">8. Alterações nesta política</h2>
        <p>
          Podemos atualizar esta política periodicamente. Notificaremos os usuários sobre mudanças
          relevantes por e-mail ou aviso dentro da plataforma. O uso continuado após as alterações
          implica aceitação da nova versão.
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold mb-3">9. Contato</h2>
        <p>
          Em caso de dúvidas, solicitações ou reclamações relacionadas a esta política, entre em
          contato:
        </p>
        <p className="mt-2">
          <strong>SETE ADS 2 LTDA</strong> — CNPJ 53.756.257/0001-34
          <br />
          Rua Carlos Roberto de Melo, 475, Pavimento 11, Sala 05, Parque Gabriel, Hortolândia/SP,
          CEP 13186-604
          <br />
          <a
            href="mailto:atacadoexponencial@gmail.com"
            className="text-info underline"
          >
            atacadoexponencial@gmail.com
          </a>
        </p>
      </section>
      </div>
    </main>
    </TemaClaro>
  )
}
