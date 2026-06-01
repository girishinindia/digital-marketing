import { env } from "./env";

// Upload a file buffer to Bunny Storage and return its public CDN url.
export async function bunnyUpload(
  path: string,
  data: ArrayBuffer | Buffer,
  contentType = "application/octet-stream"
): Promise<{ storagePath: string; cdnUrl: string }> {
  if (!env.bunny.storageUrl || !env.bunny.key) {
    throw new Error("Bunny storage is not configured");
  }
  const clean = path.replace(/^\/+/, "");
  const res = await fetch(`${env.bunny.storageUrl}/${clean}`, {
    method: "PUT",
    headers: { AccessKey: env.bunny.key, "Content-Type": contentType },
    body: data as BodyInit,
  });
  if (!res.ok) {
    throw new Error(`Bunny upload failed (${res.status}): ${await res.text()}`);
  }
  return { storagePath: clean, cdnUrl: `${env.bunny.cdnUrl}/${clean}` };
}

export async function bunnyDelete(path: string): Promise<void> {
  if (!env.bunny.storageUrl || !env.bunny.key) return;
  const clean = path.replace(/^\/+/, "");
  await fetch(`${env.bunny.storageUrl}/${clean}`, {
    method: "DELETE",
    headers: { AccessKey: env.bunny.key },
  });
}
