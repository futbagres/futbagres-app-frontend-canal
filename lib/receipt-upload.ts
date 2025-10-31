import { supabase } from "./supabase";

/**
 * Faz upload de um comprovante de pagamento para o Supabase Storage
 * @param file Arquivo de imagem do comprovante
 * @param eventId ID do evento
 * @param userId ID do usuário que está fazendo upload
 * @returns URL pública do comprovante
 */
export async function uploadReceipt(
  file: File,
  eventId: string,
  userId: string
): Promise<string> {
  try {
    // Validar tipo de arquivo
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp", "application/pdf"];
    if (!allowedTypes.includes(file.type)) {
      throw new Error(
        "Tipo de arquivo não permitido. Use JPG, PNG, WEBP ou PDF."
      );
    }

    // Validar tamanho (máx 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      throw new Error("Arquivo muito grande. Tamanho máximo: 5MB");
    }

    // Gerar nome único para o arquivo
    const timestamp = Date.now();
    const extension = file.name.split(".").pop() || "jpg";
    const fileName = `comprovante-${timestamp}.${extension}`;

    // Path: payment-receipts/{eventId}/{userId}/comprovante-{timestamp}.ext
    const filePath = `${eventId}/${userId}/${fileName}`;

    // Upload para o Supabase Storage
    const { data, error } = await supabase.storage
      .from("payment-receipts")
      .upload(filePath, file, {
        cacheControl: "3600",
        upsert: false,
      });

    if (error) {
      console.error("Erro ao fazer upload:", error);
      throw new Error(`Erro ao fazer upload: ${error.message}`);
    }

    // Obter URL pública do arquivo
    const {
      data: { publicUrl },
    } = supabase.storage.from("payment-receipts").getPublicUrl(filePath);

    return publicUrl;
  } catch (error: any) {
    console.error("Erro em uploadReceipt:", error);
    throw error;
  }
}

/**
 * Deleta um comprovante do Storage
 * @param comprovanteUrl URL do comprovante a ser deletado
 */
export async function deleteReceipt(comprovanteUrl: string): Promise<void> {
  try {
    // Extrair o path do arquivo da URL
    const url = new URL(comprovanteUrl);
    const pathParts = url.pathname.split("/payment-receipts/");
    if (pathParts.length < 2) {
      throw new Error("URL de comprovante inválida");
    }

    const filePath = pathParts[1];

    // Deletar do Storage
    const { error } = await supabase.storage
      .from("payment-receipts")
      .remove([filePath]);

    if (error) {
      console.error("Erro ao deletar comprovante:", error);
      throw new Error(`Erro ao deletar: ${error.message}`);
    }
  } catch (error: any) {
    console.error("Erro em deleteReceipt:", error);
    throw error;
  }
}

/**
 * Obtém URL assinada temporária para visualizar comprovante privado
 * @param comprovanteUrl URL do comprovante
 * @param expiresIn Tempo de expiração em segundos (padrão: 1 hora)
 * @returns URL assinada temporária
 */
export async function getSignedReceiptUrl(
  comprovanteUrl: string,
  expiresIn: number = 3600
): Promise<string> {
  try {
    // Extrair o path do arquivo da URL
    const url = new URL(comprovanteUrl);
    const pathParts = url.pathname.split("/payment-receipts/");
    if (pathParts.length < 2) {
      throw new Error("URL de comprovante inválida");
    }

    const filePath = pathParts[1];

    // Gerar URL assinada
    const { data, error } = await supabase.storage
      .from("payment-receipts")
      .createSignedUrl(filePath, expiresIn);

    if (error || !data) {
      console.error("Erro ao gerar URL assinada:", error);
      throw new Error("Erro ao gerar URL de visualização");
    }

    return data.signedUrl;
  } catch (error: any) {
    console.error("Erro em getSignedReceiptUrl:", error);
    throw error;
  }
}

/**
 * Valida se um arquivo é uma imagem válida
 */
export function validateReceiptFile(file: File): {
  valid: boolean;
  error?: string;
} {
  const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp", "application/pdf"];
  const maxSize = 5 * 1024 * 1024; // 5MB

  if (!allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: "Tipo de arquivo não permitido. Use JPG, PNG, WEBP ou PDF.",
    };
  }

  if (file.size > maxSize) {
    return {
      valid: false,
      error: "Arquivo muito grande. Tamanho máximo: 5MB",
    };
  }

  return { valid: true };
}
