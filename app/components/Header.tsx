"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { user, signOut } = useAuth();
  const router = useRouter();

  const handleSignOut = async () => {
    await signOut();
    router.push("/");
    setIsMenuOpen(false);
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-sm shadow-sm dark:bg-black/90">
      <nav className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link href={user ? "/dashboard" : "/"} className="flex items-center gap-2">
            <div className="text-2xl font-bold text-green-600">⚽</div>
            <span className="text-xl font-bold text-gray-900 dark:text-white">
              Futebagres
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-6">
            {user ? (
              <>
                <Link
                  href="/dashboard"
                  className="text-gray-700 hover:text-green-600 transition-colors dark:text-gray-300 dark:hover:text-green-400"
                >
                  Dashboard
                </Link>
                <Link
                  href="/amigos"
                  className="text-gray-700 hover:text-green-600 transition-colors dark:text-gray-300 dark:hover:text-green-400"
                >
                  Amigos
                </Link>
                <Link
                  href="/perfil"
                  className="text-gray-700 hover:text-green-600 transition-colors dark:text-gray-300 dark:hover:text-green-400"
                >
                  Perfil
                </Link>
                <button
                  onClick={handleSignOut}
                  className="rounded-full bg-red-600 px-6 py-2 text-white font-medium hover:bg-red-700 transition-colors"
                >
                  Sair
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/#sobre"
                  className="text-gray-700 hover:text-green-600 transition-colors dark:text-gray-300 dark:hover:text-green-400"
                >
                  Sobre
                </Link>
                <Link
                  href="/#funcionalidades"
                  className="text-gray-700 hover:text-green-600 transition-colors dark:text-gray-300 dark:hover:text-green-400"
                >
                  Funcionalidades
                </Link>
                <Link
                  href="/login"
                  className="text-gray-700 hover:text-green-600 transition-colors dark:text-gray-300 dark:hover:text-green-400"
                >
                  Entrar
                </Link>
                <Link
                  href="/cadastro"
                  className="rounded-full bg-green-600 px-6 py-2 text-white font-medium hover:bg-green-700 transition-colors"
                >
                  Cadastrar
                </Link>
              </>
            )}
          </div>

          {/* Mobile menu button */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="md:hidden p-2 text-gray-700 dark:text-gray-300"
            aria-label="Menu"
          >
            <svg
              className="h-6 w-6"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              {isMenuOpen ? (
                <path d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="md:hidden py-4 space-y-4">
            {user ? (
              <>
                <Link
                  href="/dashboard"
                  className="block text-gray-700 hover:text-green-600 transition-colors dark:text-gray-300"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Dashboard
                </Link>
                <Link
                  href="/amigos"
                  className="block text-gray-700 hover:text-green-600 transition-colors dark:text-gray-300"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Amigos
                </Link>
                <Link
                  href="/perfil"
                  className="block text-gray-700 hover:text-green-600 transition-colors dark:text-gray-300"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Perfil
                </Link>
                <button
                  onClick={handleSignOut}
                  className="block w-full rounded-full bg-red-600 px-6 py-2 text-center text-white font-medium hover:bg-red-700 transition-colors"
                >
                  Sair
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/#sobre"
                  className="block text-gray-700 hover:text-green-600 transition-colors dark:text-gray-300"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Sobre
                </Link>
                <Link
                  href="/#funcionalidades"
                  className="block text-gray-700 hover:text-green-600 transition-colors dark:text-gray-300"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Funcionalidades
                </Link>
                <Link
                  href="/login"
                  className="block text-gray-700 hover:text-green-600 transition-colors dark:text-gray-300"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Entrar
                </Link>
                <Link
                  href="/cadastro"
                  className="block rounded-full bg-green-600 px-6 py-2 text-center text-white font-medium hover:bg-green-700 transition-colors"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Cadastrar
                </Link>
              </>
            )}
          </div>
        )}
      </nav>
    </header>
  );
}
