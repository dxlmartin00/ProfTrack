import * as LZString from 'lz-string';

/**
 * Safely compress any JS object or string into a URL-safe string.
 * Uses lz-string with safe browser base64 fallback.
 */
export function compressPayload(data: any): string {
  try {
    const jsonStr = typeof data === 'string' ? data : JSON.stringify(data);
    
    // Check various module export styles (CJS, ESM, default, namespace)
    const lz: any = LZString;
    const compressFn = lz?.compressToEncodedURIComponent || lz?.default?.compressToEncodedURIComponent;
    
    if (typeof compressFn === 'function') {
      const compressed = compressFn(jsonStr);
      if (compressed) return compressed;
    }
    
    // Fallback: UTF-8 safe Base64
    return encodeURIComponent(btoa(encodeURIComponent(jsonStr)));
  } catch (err) {
    console.warn('Fallback encoding used:', err);
    try {
      return encodeURIComponent(JSON.stringify(data));
    } catch {
      return '';
    }
  }
}

/**
 * Safely decompress a URL-safe string into the original JS object.
 */
export function decompressPayload<T = any>(encoded: string): T | null {
  if (!encoded || typeof encoded !== 'string') return null;

  try {
    const lz: any = LZString;
    const decompressFn = lz?.decompressFromEncodedURIComponent || lz?.default?.decompressFromEncodedURIComponent;
    
    let jsonStr: string | null = null;

    if (typeof decompressFn === 'function') {
      try {
        jsonStr = decompressFn(encoded);
      } catch {
        // Fall through
      }
    }

    if (!jsonStr) {
      try {
        jsonStr = decodeURIComponent(atob(decodeURIComponent(encoded)));
      } catch {
        try {
          jsonStr = decodeURIComponent(encoded);
        } catch {
          jsonStr = encoded;
        }
      }
    }

    if (!jsonStr) return null;
    return JSON.parse(jsonStr) as T;
  } catch (err) {
    console.error('Failed to decompress payload:', err);
    return null;
  }
}
