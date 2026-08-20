import { extractFromUrl } from './urlExtract';
import { usePlacaStore, buildImportSlides } from './store';

// Descarga una imagen remota como dataURL (CORS, timeout, tope de tamaño).
async function fetchAsDataUrl(url: string, timeoutMs = 8000): Promise<string | null> {
  try {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), timeoutMs);
    const res = await fetch(url, { mode: 'cors', signal: controller.signal });
    clearTimeout(t);
    if (!res.ok) return null;
    const b = await res.blob();
    if (b.size > 8 * 1024 * 1024) return null; // skip > 8MB
    return await new Promise<string>((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result as string);
      r.onerror = () => reject(r.error);
      r.readAsDataURL(b);
    });
  } catch {
    return null;
  }
}

export interface ImportResult {
  ok: boolean;
  photoCount: number;
}

// Importa un listing desde una URL: extrae datos + fotos y arma las 2 placas
// (Placa 1 = Editorial minimal t24, Placa 2 = Galería). La primera foto queda de
// portada (la mejora con IA es opt-in vía el botón de la pestaña Fotos).
// Lógica COMPARTIDA por el campo "Importar de listing" y la pantalla de inicio.
export async function importFromUrl(url: string, onProgress?: (m: string) => void): Promise<ImportResult> {
  onProgress?.('Extrayendo datos…');
  const extracted = await extractFromUrl(url);
  if (!extracted) {
    throw new Error('No se pudo extraer datos de esa URL. Probá con Mercado Libre, Zonaprop, Argenprop o ficha.info.');
  }

  const { photoUrl, photoUrls, amenities, ...rest } = extracted as any;
  // Campos que el extractor puede NO traer se limpian explícitamente: si quedaran
  // los de la propiedad anterior (título-gancho, expensas…), la placa mezclaría datos.
  usePlacaStore.getState().patchData({
    titulo: '',
    expensas: '',
    antiguedad: '',
    amenText: '',
    attrsOn: undefined,
    ...rest,
  });

  // Línea de amenities para la Placa 2 (galería de ambientes).
  const amenLine = ((amenities as string[]) || []).slice(0, 6).join(' · ');

  // Bajamos todas las fotos del listing (tope 24) para tenerlas en la galería.
  const urls: string[] = (photoUrls && photoUrls.length ? photoUrls : photoUrl ? [photoUrl] : []).slice(0, 24);
  let photoCount = 0;

  if (urls.length) {
    const downloaded: string[] = [];
    for (let i = 0; i < urls.length; i++) {
      onProgress?.(`Descargando foto ${i + 1}/${urls.length}…`);
      const d = await fetchAsDataUrl(urls[i]);
      if (d) downloaded.push(d);
    }
    if (downloaded.length) {
      const { addPhotos, clearPhotos } = usePlacaStore.getState();
      clearPhotos();
      addPhotos(downloaded);
      photoCount = downloaded.length;
    }
  }

  onProgress?.('Armando placas…');
  buildImportSlides(amenLine);
  return { ok: true, photoCount };
}
