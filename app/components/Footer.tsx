import Link from "next/link";

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-white">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Logo e descrição */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="text-2xl">⚽</div>
              <span className="text-xl font-bold">Futebagres</span>
            </div>
            <p className="text-gray-400 text-sm">
              A plataforma para amantes do futebol se conectarem e jogarem juntos.
            </p>
          </div>

          {/* Links */}
          <div>
            <h3 className="font-semibold mb-4">Links Rápidos</h3>
            <ul className="space-y-2 text-sm text-gray-400">
              <li>
                <Link href="/#sobre" className="hover:text-green-400 transition-colors">
                  Sobre
                </Link>
              </li>
              <li>
                <Link href="/#funcionalidades" className="hover:text-green-400 transition-colors">
                  Funcionalidades
                </Link>
              </li>
              <li>
                <Link href="/login" className="hover:text-green-400 transition-colors">
                  Entrar
                </Link>
              </li>
              <li>
                <Link href="/cadastro" className="hover:text-green-400 transition-colors">
                  Cadastrar
                </Link>
              </li>
            </ul>
          </div>

          {/* Contato */}
          <div>
            <h3 className="font-semibold mb-4">Contato</h3>
            <ul className="space-y-2 text-sm text-gray-400">
              <li>contato@futebagres.com</li>
              <li>© 2025 Futebagres. Todos os direitos reservados.</li>
            </ul>
          </div>
        </div>
      </div>
    </footer>
  );
}
