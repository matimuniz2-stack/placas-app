// Lazy-loaded background removal using @imgly/background-removal.
// Note: the WASM model is ~30MB, loaded on first use.
let modulePromise: Promise<any> | null = null;

async function loadModule() {
  if (!modulePromise) {
    modulePromise = import('@imgly/background-removal').catch(() => null as any);
  }
  return modulePromise;
}

export async function removeBackground(imageUrl: string): Promise<string> {
  const mod = await loadModule();
  if (!mod || !mod.removeBackground) {
    throw new Error('Background removal no disponible (instalación pendiente). Subí @imgly/background-removal.');
  }
  // returns a Blob with transparency
  const blob: Blob = await mod.removeBackground(imageUrl);
  return await blobToDataUrl(blob);
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = () => reject(r.error);
    r.readAsDataURL(blob);
  });
}
