import { supabase } from "./supabase";

const DEFAULT_AVATAR_BUCKET = "avatars";
const DEFAULT_EVENT_IMAGES_BUCKET = "event-images";
const DEFAULT_APPLICATION_ATTACHMENTS_BUCKET = "application-attachments";

const AVATAR_BUCKET =
  import.meta.env.VITE_SUPABASE_STORAGE_AVATARS_BUCKET?.trim() ||
  DEFAULT_AVATAR_BUCKET;
const EVENT_IMAGES_BUCKET =
  import.meta.env.VITE_SUPABASE_STORAGE_EVENT_IMAGES_BUCKET?.trim() ||
  DEFAULT_EVENT_IMAGES_BUCKET;
const APPLICATION_ATTACHMENTS_BUCKET =
  import.meta.env.VITE_SUPABASE_STORAGE_APPLICATION_ATTACHMENTS_BUCKET?.trim() ||
  DEFAULT_APPLICATION_ATTACHMENTS_BUCKET;

const MANAGED_BUCKETS = new Set([
  AVATAR_BUCKET,
  EVENT_IMAGES_BUCKET,
  APPLICATION_ATTACHMENTS_BUCKET,
]);

export const ALLOWED_IMAGE_MIME_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
];

export const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

export const MAX_ATTACHMENT_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

const ALLOWED_ATTACHMENT_EXTENSIONS = new Set([
  "pdf",
  "doc",
  "docx",
  "jpg",
  "jpeg",
  "png",
]);

const FALLBACK_EXTENSION = "jpg";

const MIME_EXTENSION_MAP: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "application/pdf": "pdf",
  "application/msword": "doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
    "docx",
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

export function validateApplicationAttachment(file: File): string | null {
  if (file.size > MAX_ATTACHMENT_SIZE_BYTES) {
    const megabytes = MAX_ATTACHMENT_SIZE_BYTES / (1024 * 1024);
    return `O ficheiro deve ter no máximo ${megabytes}MB.`;
  }

  const extension = inferExtension(file).toLowerCase();
  const normalizedExtension = extension === "jpeg" ? "jpg" : extension;

  if (!ALLOWED_ATTACHMENT_EXTENSIONS.has(normalizedExtension)) {
    return "Formato não suportado. Utilize PDF, DOC, DOCX, JPG ou PNG.";
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

export async function uploadOrganizationGalleryImage(params: {
  organizationId: string;
  file: File;
}): Promise<string> {
  const extension = inferExtension(params.file);
  const filename = `gallery-${generateRandomId()}.${extension}`;
  const path = `organizations/${params.organizationId}/gallery/${filename}`;
  return uploadToBucket(EVENT_IMAGES_BUCKET, path, params.file, {
    upsert: false,
  });
}

export async function uploadEventRecapImage(params: {
  organizationId: string;
  eventId: string;
  file: File;
}): Promise<string> {
  const extension = inferExtension(params.file);
  const filename = `recap-${generateRandomId()}.${extension}`;
  const path = `organizations/${params.organizationId}/recaps/${params.eventId}/${filename}`;
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

export async function uploadApplicationAttachment(params: {
  eventId: string;
  volunteerId: string;
  file: File;
}): Promise<{ storagePath: string }> {
  const extension = inferExtension(params.file).toLowerCase();
  const normalizedExtension = extension === "jpeg" ? "jpg" : extension;
  const uniqueId = generateRandomId();
  const path = `applications/${params.eventId}/${params.volunteerId}-${uniqueId}.${normalizedExtension}`;

  const { data, error } = await supabase.storage
    .from(APPLICATION_ATTACHMENTS_BUCKET)
    .upload(path, params.file, {
      cacheControl: "7200",
      upsert: false,
      contentType: params.file.type || undefined,
    });

  if (error) {
    console.error("Falha ao enviar ficheiro de candidatura", {
      path,
      error,
    });
    throw new Error(
      "Não foi possível carregar o ficheiro. Verifique o formato e tente novamente."
    );
  }

  return { storagePath: data?.path ?? path };
}

export async function removeApplicationAttachment(
  storagePath: string | null
): Promise<void> {
  if (!storagePath) return;

  const { error } = await supabase.storage
    .from(APPLICATION_ATTACHMENTS_BUCKET)
    .remove([storagePath]);

  if (error) {
    console.warn("Falha ao remover ficheiro de candidatura", {
      storagePath,
      error,
    });
  }
}

export async function getApplicationAttachmentSignedUrl(
  storagePath: string,
  expiresInSeconds = 300
): Promise<string | null> {
  if (!storagePath) return null;

  const { data, error } = await supabase.storage
    .from(APPLICATION_ATTACHMENTS_BUCKET)
    .createSignedUrl(storagePath, expiresInSeconds);

  if (error) {
    console.error("Falha ao gerar URL temporário para o anexo", {
      storagePath,
      error,
    });
    return null;
  }

  return data?.signedUrl ?? null;
}

export function getAttachmentConstraintsDescription(): string {
  const megabytes = MAX_ATTACHMENT_SIZE_BYTES / (1024 * 1024);
  return `Formatos suportados: PDF, DOC, DOCX, JPG, PNG (até ${megabytes}MB).`;
}
