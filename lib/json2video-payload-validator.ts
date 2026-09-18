/**
 * JSON2Video Payload Validator
 * Validates payload structure and schema compliance before sending requests to JSON2Video API.
 */

export const SUPPORTED_JSON2VIDEO_RESOLUTIONS = [
  'instagram-story',
  'instagram-feed',
  'youtube-shorts',
  'tiktok',
  'full-hd',
  'hd',
  'square',
  'sd',
  'vertical-hd',
  'quad-hd',
  'uhd',
] as const;

export type SupportedResolution = (typeof SUPPORTED_JSON2VIDEO_RESOLUTIONS)[number];

export interface Json2VideoValidationResult {
  isValid: boolean;
  error?: string;
  details?: string;
  fallback: 'COPY_PAYLOAD';
}

/**
 * Validates JSON2Video movie payload according to schema rules and stability contracts.
 * Rejects:
 * 1. Root field 'aspect_ratio'
 * 2. Elements with type: 'shape'
 * 3. Scenes without 'elements' or with empty elements array
 * 4. Elements without 'type'
 * 5. Resolutions not supported by the application
 * 6. Scenes with 'client-data' (client-data only allowed at root movie)
 * 7. Element coordinates 'x' or 'y' of type string (must be number)
 * 8. Text elements with 'style' object (must use style: string and settings object)
 */
export function validateJson2VideoPayload(payload: any): Json2VideoValidationResult {
  if (!payload || typeof payload !== 'object') {
    return {
      isValid: false,
      error: 'Format payload tidak valid atau kosong. Gunakan opsi Copy Payload untuk mengecek draf.',
      details: 'Payload bukan merupakan object JSON yang valid.',
      fallback: 'COPY_PAYLOAD',
    };
  }

  // 1. Rejects root field aspect_ratio
  if ('aspect_ratio' in payload || payload.aspect_ratio !== undefined) {
    return {
      isValid: false,
      error: "Payload tidak valid: field 'aspect_ratio' tidak didukung oleh API JSON2Video. Gunakan field 'resolution' (misal: 'instagram-story').",
      details: "Ditemukan field root 'aspect_ratio' yang dilarang pada skema JSON2Video API.",
      fallback: 'COPY_PAYLOAD',
    };
  }

  // 5. Resolution check (must be in supported resolutions)
  const resolution = payload.resolution;
  if (!resolution || typeof resolution !== 'string' || !resolution.trim()) {
    return {
      isValid: false,
      error: "Payload tidak valid: field 'resolution' wajib diisi (misal: 'instagram-story' untuk format 9:16).",
      details: "Field 'resolution' tidak ditemukan atau bukan string.",
      fallback: 'COPY_PAYLOAD',
    };
  }

  if (!SUPPORTED_JSON2VIDEO_RESOLUTIONS.includes(resolution.trim() as SupportedResolution)) {
    return {
      isValid: false,
      error: `Payload tidak valid: resolusi '${resolution}' tidak didukung. Gunakan resolusi standar seperti 'instagram-story' (9:16).`,
      details: `Resolusi '${resolution}' tidak terdaftar dalam resolusi yang didukung: ${SUPPORTED_JSON2VIDEO_RESOLUTIONS.join(', ')}`,
      fallback: 'COPY_PAYLOAD',
    };
  }

  // Validate root elements if provided (e.g. voice/audio)
  if (payload.elements !== undefined) {
    if (!Array.isArray(payload.elements)) {
      return {
        isValid: false,
        error: "Payload tidak valid: properti 'elements' pada root movie harus berupa array.",
        details: "Field root 'elements' bukan merupakan array.",
        fallback: 'COPY_PAYLOAD',
      };
    }

    for (let reIdx = 0; reIdx < payload.elements.length; reIdx++) {
      const rElement = payload.elements[reIdx];
      if (!rElement || typeof rElement !== 'object') {
        return {
          isValid: false,
          error: `Payload tidak valid: root element ke-${reIdx + 1} tidak valid.`,
          details: `Root element index ${reIdx} bukan object.`,
          fallback: 'COPY_PAYLOAD',
        };
      }

      if (!rElement.type || typeof rElement.type !== 'string' || !rElement.type.trim()) {
        return {
          isValid: false,
          error: `Payload tidak valid: root element ke-${reIdx + 1} tidak memiliki atribut 'type'.`,
          details: `Root element index ${reIdx} tidak memiliki properti 'type'.`,
          fallback: 'COPY_PAYLOAD',
        };
      }

      if (rElement.type.trim().toLowerCase() === 'shape') {
        return {
          isValid: false,
          error: `Payload tidak valid: root element dengan type 'shape' tidak didukung.`,
          details: `Ditemukan root element type 'shape' pada index ${reIdx}.`,
          fallback: 'COPY_PAYLOAD',
        };
      }
    }
  }

  // 3. Check scenes exist and are not empty
  if (!Array.isArray(payload.scenes) || payload.scenes.length === 0) {
    return {
      isValid: false,
      error: 'Payload tidak valid: daftar scene (scenes) tidak boleh kosong.',
      details: "Field 'scenes' wajib berupa array dan memiliki minimal 1 scene.",
      fallback: 'COPY_PAYLOAD',
    };
  }

  // Check each scene and its elements
  for (let sIdx = 0; sIdx < payload.scenes.length; sIdx++) {
    const scene = payload.scenes[sIdx];
    if (!scene || typeof scene !== 'object') {
      return {
        isValid: false,
        error: `Payload tidak valid: scene ke-${sIdx + 1} tidak terdefinisi dengan benar.`,
        details: `Scene pada index ${sIdx} bukan object JSON.`,
        fallback: 'COPY_PAYLOAD',
      };
    }

    // Reject 'client-data' in individual scenes
    if ('client-data' in scene || (scene as any)['client-data'] !== undefined) {
      return {
        isValid: false,
        error: `Payload tidak valid: properti 'client-data' tidak diperbolehkan di dalam scene (scene ke-${sIdx + 1}). Metadata 'client-data' hanya disimpan pada root movie.`,
        details: `Ditemukan properti 'client-data' pada scene index ${sIdx}.`,
        fallback: 'COPY_PAYLOAD',
      };
    }

    // 3. Scene without elements
    if (!Array.isArray(scene.elements) || scene.elements.length === 0) {
      return {
        isValid: false,
        error: `Payload tidak valid: scene ke-${sIdx + 1} tidak memiliki daftar elemen ('elements').`,
        details: `Scene pada index ${sIdx} tidak memiliki array 'elements' atau array kosong.`,
        fallback: 'COPY_PAYLOAD',
      };
    }

    for (let eIdx = 0; eIdx < scene.elements.length; eIdx++) {
      const element = scene.elements[eIdx];
      if (!element || typeof element !== 'object') {
        return {
          isValid: false,
          error: `Payload tidak valid: elemen ke-${eIdx + 1} pada scene ke-${sIdx + 1} tidak valid.`,
          details: `Elemen pada scene ${sIdx}, index ${eIdx} bukan object.`,
          fallback: 'COPY_PAYLOAD',
        };
      }

      // 4. Element without type
      if (!element.type || typeof element.type !== 'string' || !element.type.trim()) {
        return {
          isValid: false,
          error: `Payload tidak valid: elemen ke-${eIdx + 1} pada scene ke-${sIdx + 1} tidak memiliki atribut 'type'.`,
          details: `Elemen pada scene ${sIdx}, index ${eIdx} tidak memiliki properti 'type' (contoh yang valid: 'html', 'text', 'image', 'video', 'audio').`,
          fallback: 'COPY_PAYLOAD',
        };
      }

      // Validate image src (must be valid public https URL, reject blob:, data:, file:)
      if (element.type.trim().toLowerCase() === 'image') {
        if (!element.src || typeof element.src !== 'string' || !element.src.trim()) {
          return {
            isValid: false,
            error: `Payload tidak valid: elemen image pada scene ke-${sIdx + 1} tidak memiliki atribut 'src'.`,
            details: `Elemen image index ${eIdx} tidak memiliki properti 'src'.`,
            fallback: 'COPY_PAYLOAD',
          };
        }
        const srcLower = element.src.trim().toLowerCase();
        if (srcLower.startsWith('blob:') || srcLower.startsWith('data:') || srcLower.startsWith('file:') || srcLower.startsWith('/')) {
          return {
            isValid: false,
            error: `Payload tidak valid: URL gambar ('${element.src.substring(0, 30)}...') tidak boleh berupa blob, data, atau file lokal. Gunakan URL publik HTTPS.`,
            details: `Elemen image index ${eIdx} menggunakan URL yang tidak dapat diakses publik oleh JSON2Video.`,
            fallback: 'COPY_PAYLOAD',
          };
        }
      }

      // 2. Element with type "shape" is rejected
      if (element.type.trim().toLowerCase() === 'shape') {
        return {
          isValid: false,
          error: `Payload tidak valid: elemen dengan type 'shape' pada scene ke-${sIdx + 1} tidak didukung oleh JSON2Video API. Gunakan type 'html' atau 'text'.`,
          details: `Ditemukan elemen type 'shape' pada scene index ${sIdx}, elemen index ${eIdx}.`,
          fallback: 'COPY_PAYLOAD',
        };
      }

      // Reject element coordinate 'x' if type string
      if (element.x !== undefined && typeof element.x !== 'number') {
        return {
          isValid: false,
          error: `Payload tidak valid: koordinat 'x' pada elemen ke-${eIdx + 1} (scene ke-${sIdx + 1}) harus berupa angka (number), bukan string (misal: 'center').`,
          details: `Ditemukan koordinat 'x' bernilai ${JSON.stringify(element.x)} bertipe '${typeof element.x}' pada scene index ${sIdx}, elemen index ${eIdx}.`,
          fallback: 'COPY_PAYLOAD',
        };
      }

      // Reject element coordinate 'y' if type string
      if (element.y !== undefined && typeof element.y !== 'number') {
        return {
          isValid: false,
          error: `Payload tidak valid: koordinat 'y' pada elemen ke-${eIdx + 1} (scene ke-${sIdx + 1}) harus berupa angka (number), bukan string (misal: 'center').`,
          details: `Ditemukan koordinat 'y' bernilai ${JSON.stringify(element.y)} bertipe '${typeof element.y}' pada scene index ${sIdx}, elemen index ${eIdx}.`,
          fallback: 'COPY_PAYLOAD',
        };
      }

      // 6. Text element must not use 'style' object (must use style: string and settings object)
      if (element.type.trim().toLowerCase() === 'text') {
        if (element.style !== undefined && typeof element.style === 'object') {
          return {
            isValid: false,
            error: `Payload tidak valid: properti 'style' pada elemen text (scene ke-${sIdx + 1}, elemen ke-${eIdx + 1}) harus berupa string (misal: '001'), bukan object. Properti CSS dipindahkan ke 'settings'.`,
            details: `Ditemukan properti 'style' bertipe object pada elemen text scene ${sIdx}, elemen ${eIdx}.`,
            fallback: 'COPY_PAYLOAD',
          };
        }
      }
    }
  }

  return {
    isValid: true,
    fallback: 'COPY_PAYLOAD',
  };
}
