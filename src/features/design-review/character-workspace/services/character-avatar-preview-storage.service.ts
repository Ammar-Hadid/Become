import type { AvatarPlacement } from "@/components/ui/character-avatar/character-avatar-editor.component";

export type PreviewPortrait = {
  image: Blob | null;
  placement: AvatarPlacement;
};

const databaseName = "become-character-workspace-preview";
const storeName = "portraits";

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(databaseName, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(storeName))
        request.result.createObjectStore(storeName);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function loadPreviewPortrait(
  variant: string,
): Promise<PreviewPortrait | null> {
  const database = await openDatabase();
  try {
    return await new Promise((resolve, reject) => {
      const request = database
        .transaction(storeName, "readonly")
        .objectStore(storeName)
        .get(variant);
      request.onsuccess = () =>
        resolve((request.result as PreviewPortrait) ?? null);
      request.onerror = () => reject(request.error);
    });
  } finally {
    database.close();
  }
}

export async function savePreviewPortrait(
  variant: string,
  portrait: PreviewPortrait,
): Promise<void> {
  const database = await openDatabase();
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(storeName, "readwrite");
      transaction.objectStore(storeName).put(portrait, variant);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
    });
  } finally {
    database.close();
  }
}
