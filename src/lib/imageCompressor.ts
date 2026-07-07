/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Compress a base64 image string to a smaller size using standard Canvas.
 * Useful for reducing size before sending to Firestore or caching in LocalStorage.
 * @param base64Str The raw image (Data URL)
 * @param maxWidth Max width of the compressed image
 * @param maxHeight Max height of the compressed image
 * @param quality JPEG quality multiplier (0.0 to 1.0)
 */
export function compressBase64Image(
  base64Str: string | undefined,
  maxWidth: number = 320,
  maxHeight: number = 240,
  quality: number = 0.6
): Promise<string> {
  return new Promise((resolve) => {
    if (!base64Str || !base64Str.startsWith('data:image')) {
      resolve(base64Str || '');
      return;
    }

    // If it's already reasonably small, don't re-compress to avoid losing more quality
    if (base64Str.length < 15000) {
      resolve(base64Str);
      return;
    }

    const img = new Image();
    img.onload = () => {
      let width = img.width;
      let height = img.height;

      // Calculate aspect ratio-friendly bounds
      if (width > height) {
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
      } else {
        if (height > maxHeight) {
          width = Math.round((width * maxHeight) / height);
          height = maxHeight;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(base64Str);
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);
      const dataUrl = canvas.toDataURL('image/jpeg', quality);
      resolve(dataUrl);
    };

    img.onerror = () => {
      resolve(base64Str);
    };

    img.src = base64Str;
  });
}

/**
 * Checks an array of attendance records and compresses any large base64 images inside them.
 * This ensures we auto-heal any bloated legacy data existing in the user's cache.
 */
export async function autoHealAttendancePhotos(records: any[]): Promise<any[]> {
  if (!records || !Array.isArray(records)) return [];
  
  const healed = [];
  for (const record of records) {
    let clockInPhoto = record.clockInPhoto;
    let clockOutPhoto = record.clockOutPhoto;
    let changed = false;

    if (clockInPhoto && clockInPhoto.startsWith('data:image') && clockInPhoto.length > 25000) {
      clockInPhoto = await compressBase64Image(clockInPhoto, 320, 240, 0.6);
      changed = true;
    }
    
    if (clockOutPhoto && clockOutPhoto.startsWith('data:image') && clockOutPhoto.length > 25000) {
      clockOutPhoto = await compressBase64Image(clockOutPhoto, 320, 240, 0.6);
      changed = true;
    }

    if (changed) {
      healed.push({
        ...record,
        clockInPhoto,
        clockOutPhoto
      });
    } else {
      healed.push(record);
    }
  }
  return healed;
}
