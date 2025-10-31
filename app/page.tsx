import Link from "next/link";
import Header from "./components/Header";
import Footer from "./components/Footer";

export default function Home() {
  return (
    <>
      <Header />
      <main className="min-h-screen">
        {/* Hero Section */}
        <section className="relative bg-gradient-to-br from-green-50 to-green-100 dark:from-gray-900 dark:to-gray-800 pt-24 pb-20 px-4">
          <div className="mx-auto max-w-7xl">
            <div className="text-center">
              <h1 className="text-5xl md:text-6xl font-bold text-gray-900 dark:text-white mb-6">
                Bem-vindo ao <span className="text-green-600">Futebagres</span>
              </h1>
              <p className="text-xl md:text-2xl text-gray-700 dark:text-gray-300 mb-8 max-w-3xl mx-auto">
                A plataforma que conecta amantes do futebol para organizar partidas,
                gerenciar eventos e construir uma comunidade apaixonada pelo esporte.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                <Link
                  href="/cadastro"
                  className="w-full sm:w-auto rounded-full bg-green-600 px-8 py-4 text-lg font-semibold text-white hover:bg-green-700 transition-colors shadow-lg"
                >
                  Começar Agora
                </Link>
                <Link
                  href="/login"
                  className="w-full sm:w-auto rounded-full border-2 border-green-600 px-8 py-4 text-lg font-semibold text-green-600 hover:bg-green-50 dark:hover:bg-gray-800 transition-colors"
                >
                  Já tenho conta
                </Link>
              </div>
            </div>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-white dark:from-black to-transparent"></div>
        </section>

        {/* Sobre Section */}
        <section id="sobre" className="py-20 px-4 bg-white dark:bg-black">
          <div className="mx-auto max-w-7xl">
            <h2 className="text-4xl font-bold text-center text-gray-900 dark:text-white mb-12">
              Sobre o Futebagres
            </h2>
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div>
                <p className="text-lg text-gray-700 dark:text-gray-300 mb-6">
                  O Futebagres nasceu da paixão pelo futebol e da necessidade de
                  facilitar a organização de partidas entre amigos, colegas e
                  entusiastas do esporte.
                </p>
                <p className="text-lg text-gray-700 dark:text-gray-300">
                  Nossa missão é criar uma comunidade vibrante onde jogadores de
                  todos os níveis possam se conectar, organizar eventos e viver
                  sua paixão pelo futebol de forma simples e eficiente.
                </p>
              </div>
              <div className="bg-gradient-to-br from-green-400 to-green-600 rounded-2xl p-12 text-white text-center">
                <div className="text-6xl mb-4">⚽</div>
                <h3 className="text-2xl font-bold mb-2">Junte-se a nós!</h3>
                <p className="text-green-50">
                  Milhares de jogadores já fazem parte da nossa comunidade
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Funcionalidades Section */}
        <section id="funcionalidades" className="py-20 px-4 bg-gray-50 dark:bg-gray-900">
          <div className="mx-auto max-w-7xl">
            <h2 className="text-4xl font-bold text-center text-gray-900 dark:text-white mb-12">
              Funcionalidades
            </h2>
            <div className="grid md:grid-cols-3 gap-8">
              {/* Card 1 */}
              <div className="bg-white dark:bg-gray-800 rounded-xl p-8 shadow-lg hover:shadow-xl transition-shadow">
                <div className="text-4xl mb-4">👤</div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
                  Perfil Personalizado
                </h3>
                <p className="text-gray-700 dark:text-gray-300">
                  Crie e edite seu perfil com informações sobre sua posição
                  preferida, nível de habilidade e disponibilidade.
                </p>
              </div>

              {/* Card 2 */}
              <div className="bg-white dark:bg-gray-800 rounded-xl p-8 shadow-lg hover:shadow-xl transition-shadow">
                <div className="text-4xl mb-4">📅</div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
                  Organização de Eventos
                </h3>
                <p className="text-gray-700 dark:text-gray-300">
                  Crie e gerencie eventos de futebol, defina local, horário e
                  número de jogadores necessários.
                </p>
              </div>

              {/* Card 3 */}
              <div className="bg-white dark:bg-gray-800 rounded-xl p-8 shadow-lg hover:shadow-xl transition-shadow">
                <div className="text-4xl mb-4">💳</div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
                  Pagamentos Integrados
                </h3>
                <p className="text-gray-700 dark:text-gray-300">
                  Sistema de pagamento seguro para divisão de custos de aluguel
                  de quadras e outros gastos do evento.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 px-4 bg-green-600">
          <div className="mx-auto max-w-4xl text-center">
            <h2 className="text-4xl font-bold text-white mb-6">
              Pronto para começar?
            </h2>
            <p className="text-xl text-green-50 mb-8">
              Cadastre-se agora e faça parte da maior comunidade de futebol da região!
            </p>
            <Link
              href="/cadastro"
              className="inline-block rounded-full bg-white px-8 py-4 text-lg font-semibold text-green-600 hover:bg-gray-100 transition-colors shadow-lg"
            >
              Criar Conta Grátis
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
