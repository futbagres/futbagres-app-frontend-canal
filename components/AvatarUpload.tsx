"use client";

import { useState, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { User } from "@supabase/supabase-js";

interface AvatarUploadProps {
  user: User;
  currentAvatarUrl: string | null;
  onAvatarUpdate: (url: string | null) => void;
}

export default function AvatarUpload({ user, currentAvatarUrl, onAvatarUpdate }: AvatarUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const uploadAvatar = async (file: File) => {
    try {
      setUploading(true);
      setError(null);
      setShowModal(false);

      // Validar tamanho do arquivo (máximo 5MB)
      if (file.size > 5 * 1024 * 1024) {
        throw new Error("Arquivo muito grande. Máximo 5MB.");
      }

      // Validar tipo do arquivo
      if (!file.type.startsWith("image/")) {
        throw new Error("Apenas imagens são permitidas.");
      }

      // Gerar nome único para o arquivo
      const fileExt = file.name.split(".").pop();
      const fileName = `avatar.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;

      // Fazer upload para o Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: true, // Sobrescrever se já existir
        });

      if (uploadError) {
        throw uploadError;
      }

      // Obter URL pública do arquivo
      const { data } = supabase.storage
        .from("avatars")
        .getPublicUrl(filePath);

      const avatarUrl = data.publicUrl;

      // Atualizar o perfil do usuário com a nova URL
      const { error: updateError } = await supabase
        .from("profiles")
        // @ts-ignore - Campo avatar_url será adicionado via SQL
        .update({ avatar_url: avatarUrl })
        .eq("id", user.id);

      if (updateError) {
        throw updateError;
      }

      // Notificar o componente pai
      onAvatarUpdate(avatarUrl);

    } catch (err: any) {
      console.error("Erro ao fazer upload do avatar:", err);
      setError(err.message || "Erro ao fazer upload da imagem.");
    } finally {
      setUploading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      uploadAvatar(file);
    }
  };

  const handleRemoveAvatar = async () => {
    try {
      setUploading(true);
      setError(null);
      setShowModal(false);

      // Remover arquivo do storage
      const fileName = "avatar.jpg"; // ou determinar dinamicamente
      const filePath = `${user.id}/${fileName}`;

      await supabase.storage
        .from("avatars")
        .remove([filePath]);

      // Atualizar perfil removendo a URL
      const { error: updateError } = await supabase
        .from("profiles")
        // @ts-ignore - Campo avatar_url será adicionado via SQL
        .update({ avatar_url: null })
        .eq("id", user.id);

      if (updateError) {
        throw updateError;
      }

      onAvatarUpdate(null);

    } catch (err: any) {
      console.error("Erro ao remover avatar:", err);
      setError(err.message || "Erro ao remover a imagem.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <>
      <div className="relative inline-block">
        {/* Anel branco externo */}
        <div className="w-32 h-32 rounded-full bg-white p-1 shadow-2xl ring-4 ring-white/50">
          {/* Avatar atual - círculo perfeito com foto preenchendo todo o espaço */}
          <div className="w-full h-full rounded-full bg-gradient-to-br from-green-400 to-blue-500 flex items-center justify-center text-white text-4xl font-bold overflow-hidden">
            {currentAvatarUrl ? (
              <img
                src={currentAvatarUrl}
                alt="Avatar"
                className="w-full h-full object-cover"
              />
            ) : (
              user.email?.charAt(0).toUpperCase() || "?"
            )}
          </div>

          {/* Loading overlay */}
          {uploading && (
            <div className="absolute inset-0 bg-black bg-opacity-60 rounded-full flex items-center justify-center">
              <div className="animate-spin h-8 w-8 border-3 border-white border-t-transparent rounded-full"></div>
            </div>
          )}
        </div>

        {/* Botão de editar - ícone de lápis */}
        <button
          type="button"
          onClick={() => setShowModal(true)}
          disabled={uploading}
          className="absolute bottom-0 right-0 w-10 h-10 bg-white dark:bg-gray-800 rounded-full shadow-xl hover:shadow-2xl transition-all hover:scale-110 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center border-2 border-green-500 group"
          title="Editar foto"
        >
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            className="h-5 w-5 text-green-600 dark:text-green-400 group-hover:text-green-700 dark:group-hover:text-green-300" 
            viewBox="0 0 20 20" 
            fill="currentColor"
          >
            <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
          </svg>
        </button>
      </div>

      {/* Erro */}
      {error && (
        <p className="text-sm text-red-600 dark:text-red-400 text-center mt-2 animate-shake">{error}</p>
      )}

      {/* Input de arquivo (escondido) */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Modal de Edição */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full p-6 animate-in fade-in zoom-in duration-200">
            <div className="text-center mb-6">
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                Editar Foto do Perfil
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Escolha uma ação para sua foto
              </p>
            </div>

            <div className="space-y-3">
              {/* Botão: Alterar Foto */}
              <button
                type="button"
                onClick={() => {
                  fileInputRef.current?.click();
                }}
                disabled={uploading}
                className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-gradient-to-r from-green-600 to-blue-600 text-white rounded-xl hover:from-green-700 hover:to-blue-700 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4 5a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V7a2 2 0 00-2-2h-1.586a1 1 0 01-.707-.293l-1.121-1.121A2 2 0 0011.172 3H8.828a2 2 0 00-1.414.586L6.293 4.707A1 1 0 015.586 5H4zm6 9a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
                </svg>
                {currentAvatarUrl ? "Alterar Foto" : "Adicionar Foto"}
              </button>

              {/* Botão: Remover Foto (apenas se houver foto) */}
              {currentAvatarUrl && (
                <button
                  type="button"
                  onClick={handleRemoveAvatar}
                  disabled={uploading}
                  className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  Remover Foto
                </button>
              )}

              {/* Botão: Cancelar */}
              <button
                type="button"
                onClick={() => {
                  setShowModal(false);
                  setError(null);
                }}
                disabled={uploading}
                className="w-full px-6 py-4 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-xl hover:bg-gray-300 dark:hover:bg-gray-600 transition-all font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancelar
              </button>
            </div>

            {/* Dica */}
            <p className="text-xs text-gray-500 dark:text-gray-400 text-center mt-4">
              💡 Tamanho máximo: 5MB • Formatos aceitos: JPG, PNG, GIF
            </p>
          </div>
        </div>
      )}
    </>
  );
}