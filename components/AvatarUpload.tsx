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
  const fileInputRef = useRef<HTMLInputElement>(null);

  const uploadAvatar = async (file: File) => {
    try {
      setUploading(true);
      setError(null);

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
    <div className="flex flex-col items-center space-y-4">
      {/* Avatar atual */}
      <div className="relative">
        <div className="w-24 h-24 bg-green-600 rounded-full flex items-center justify-center text-white text-4xl font-bold overflow-hidden">
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

        {uploading && (
          <div className="absolute inset-0 bg-black bg-opacity-50 rounded-full flex items-center justify-center">
            <div className="animate-spin h-6 w-6 border-2 border-white border-t-transparent rounded-full"></div>
          </div>
        )}
      </div>

      {/* Botões */}
      <div className="flex space-x-2">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {uploading ? "Enviando..." : "Alterar Foto"}
        </button>

        {currentAvatarUrl && (
          <button
            type="button"
            onClick={handleRemoveAvatar}
            disabled={uploading}
            className="px-4 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Remover
          </button>
        )}
      </div>

      {/* Input de arquivo (escondido) */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Erro */}
      {error && (
        <p className="text-sm text-red-600 text-center">{error}</p>
      )}
    </div>
  );
}