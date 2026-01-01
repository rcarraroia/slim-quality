/**
 * Página de teste para o Chat Widget
 * Sprint 5: Painel Admin - Agente IA
 */

import { ChatWidget } from '@/components/chat/ChatWidget';

export default function ChatTest() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-center mb-8 text-gray-800">
          Teste do Chat Widget
        </h1>
        
        <div className="grid md:grid-cols-2 gap-8">
          <div className="bg-white rounded-lg p-6 shadow-lg">
            <h2 className="text-2xl font-semibold mb-4 text-gray-700">
              Sobre a Slim Quality
            </h2>
            <p className="text-gray-600 mb-4">
              Somos especialistas em colchões magnéticos terapêuticos que revolucionam 
              a qualidade do seu sono e bem-estar.
            </p>
            <p className="text-gray-600 mb-4">
              Nossos produtos utilizam tecnologia avançada com:
            </p>
            <ul className="list-disc list-inside text-gray-600 space-y-2">
              <li>Sistema Magnético (240 ímãs de 800 Gauss)</li>
              <li>Infravermelho Longo</li>
              <li>Energia Bioquântica</li>
              <li>Vibromassagem (8 motores)</li>
              <li>Cromoterapia</li>
            </ul>
          </div>

          <div className="bg-white rounded-lg p-6 shadow-lg">
            <h2 className="text-2xl font-semibold mb-4 text-gray-700">
              Como Testar o Chat
            </h2>
            <p className="text-gray-600 mb-4">
              O widget de chat está localizado no canto inferior direito da tela.
            </p>
            <div className="space-y-3 text-gray-600">
              <div className="flex items-start gap-2">
                <span className="bg-green-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">1</span>
                <span>Clique no ícone de chat para abrir</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="bg-green-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">2</span>
                <span>Digite uma mensagem e pressione Enter</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="bg-green-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">3</span>
                <span>A BIA responderá automaticamente</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="bg-green-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">4</span>
                <span>A conversa será salva no dashboard admin</span>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 bg-white rounded-lg p-6 shadow-lg">
          <h2 className="text-2xl font-semibold mb-4 text-gray-700">
            Funcionalidades do Widget
          </h2>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-green-600 font-semibold mb-2">💬 Chat em Tempo Real</div>
              <p className="text-sm text-gray-600">Conversas instantâneas com a BIA</p>
            </div>
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-blue-600 font-semibold mb-2">📊 Dashboard Admin</div>
              <p className="text-sm text-gray-600">Todas as conversas aparecem no painel</p>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <div className="text-purple-600 font-semibold mb-2">🔄 Supabase Realtime</div>
              <p className="text-sm text-gray-600">Atualizações em tempo real</p>
            </div>
          </div>
        </div>
      </div>

      {/* Chat Widget */}
      <ChatWidget 
        title="Fale com a BIA"
        subtitle="Assistente Slim Quality"
        placeholder="Como posso ajudar você?"
        primaryColor="#10b981"
      />
    </div>
  );
}