import { supabase } from "./supabase";

const DEFAULT_AVATAR_BUCKET = "avatars";
const DEFAULT_EVENT_IMAGES_BUCKET = "event-images";

const AVATAR_BUCKET =
  import.meta.env.VITE_SUPABASE_STORAGE_AVATARS_BUCKET?.trim() ||
  DEFAULT_AVATAR_BUCKET;
const EVENT_IMAGES_BUCKET =
  import.meta.env.VITE_SUPABASE_STORAGE_EVENT_IMAGES_BUCKET?.trim() ||
  DEFAULT_EVENT_IMAGES_BUCKET;

const MANAGED_BUCKETS = new Set([AVATAR_BUCKET, EVENT_IMAGES_BUCKET]);

export const ALLOWED_IMAGE_MIME_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
];

export const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

const FALLBACK_EXTENSION = "jpg";

const MIME_EXTENSION_MAP: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

function generateRandomId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    try {
      return crypto.randomUUID();
    } catch (error) {
      console.warn("crypto.randomUUID falhou, a usar fallback.", error);
    }
  }
  return Math.random().toString(36).slice(2, 12);
}

function inferExtension(file: File): string {
  const mimeExtension = MIME_EXTENSION_MAP[file.type];
  if (mimeExtension) {
    return mimeExtension;
  }

  const name = file.name.replace(/\?.*$/, "").trim().toLowerCase();
  const match = name.match(/\.([a-z0-9]{2,8})$/);
  if (match) {
    return match[1];
  }

  return FALLBACK_EXTENSION;
}

function parseStoragePublicUrl(
  publicUrl: string
): { bucket: string; path: string } | null {
  try {
    const url = new URL(publicUrl);
    const match = url.pathname.match(
      /\/storage\/v1\/object\/public\/([^/]+)\/(.+)$/
    );
    if (!match) return null;
    const [, bucket, encodedPath] = match;
    return {
      bucket,
      path: decodeURIComponent(encodedPath),
    };
  } catch (error) {
    console.warn("URL de storage inválida:", publicUrl, error);
    return null;
  }
}

async function uploadToBucket(
  bucket: string,
  path: string,
  file: File,
  options?: { upsert?: boolean }
): Promise<string> {
  const { error } = await supabase.storage.from(bucket).upload(path, file, {
    cacheControl: "3600",
    upsert: options?.upsert ?? false,
    contentType: file.type || undefined,
  });

  if (error) {
    console.error("Falha ao enviar ficheiro para o bucket", {
      bucket,
      path,
      error,
    });
    throw new Error(
      "Não foi possível carregar a imagem. Tente novamente mais tarde."
    );
  }

  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  if (!data?.publicUrl) {
    throw new Error("Não foi possível gerar o URL público da imagem.");
  }

  return data.publicUrl;
}

export function validateImageFile(file: File): string | null {
  if (!ALLOWED_IMAGE_MIME_TYPES.includes(file.type)) {
    return "Formato de imagem não suportado. Utilize JPG, PNG ou WEBP.";
  }

  if (file.size > MAX_IMAGE_SIZE_BYTES) {
    const megabytes = MAX_IMAGE_SIZE_BYTES / (1024 * 1024);
    return `A imagem deve ter no máximo ${megabytes}MB.`;
  }

  return null;
}

export async function uploadUserAvatar(
  userId: string,
  file: File
): Promise<string> {
  const extension = inferExtension(file);
  const filename = `${generateRandomId()}.${extension}`;
  const path = `profiles/${userId}/${filename}`;
  return uploadToBucket(AVATAR_BUCKET, path, file, { upsert: false });
}

export async function uploadEventImage(params: {
  organizationId: string;
  file: File;
  eventId?: string;
}): Promise<string> {
  const extension = inferExtension(params.file);
  const uniqueId = params.eventId ?? generateRandomId();
  const filename = `${uniqueId}-${generateRandomId()}.${extension}`;
  const path = `organizations/${params.organizationId}/${filename}`;
  return uploadToBucket(EVENT_IMAGES_BUCKET, path, params.file, {
    upsert: false,
  });
}

export async function removeStorageFileByUrl(publicUrl: string | null) {
  if (!publicUrl) return;
  const parsed = parseStoragePublicUrl(publicUrl);
  if (!parsed) return;
  if (!MANAGED_BUCKETS.has(parsed.bucket)) return;

  const { error } = await supabase.storage
    .from(parsed.bucket)
    .remove([parsed.path]);

  if (error) {
    console.warn("Falha ao remover ficheiro do storage", {
      publicUrl,
      error,
    });
  }
}

export function getImageConstraintsDescription(): string {
  const megabytes = MAX_IMAGE_SIZE_BYTES / (1024 * 1024);
  return `Formatos suportados: JPG, PNG, WEBP (até ${megabytes}MB).`;
}
