import { toBlob, toPng, toJpeg } from 'html-to-image';

/**
 * Generates an image blob (PNG or JPEG) from a DOM element (e.g., receipt).
 * Uses 2x pixel ratio for crystal-clear readability on WhatsApp and mobile screens.
 */
export async function generateReceiptImage(
  element: HTMLElement,
  format: 'png' | 'jpeg' = 'png'
): Promise<Blob | null> {
  try {
    const fn = format === 'jpeg' ? toJpeg : toPng;
    const dataUrl = await fn(element, {
      quality: 0.95,
      pixelRatio: 2.5,
      backgroundColor: '#ffffff',
      cacheBust: true,
      skipFonts: false,
    });

    const res = await fetch(dataUrl);
    const blob = await res.blob();
    return blob;
  } catch (error) {
    console.error('Error generating receipt image:', error);
    return null;
  }
}

/**
 * Downloads an image blob directly to user's device Downloads folder.
 */
export function downloadImageBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Copies an image Blob directly into the system clipboard.
 * Allows instant Ctrl+V pasting into WhatsApp Web / Desktop!
 */
export async function copyImageToClipboard(blob: Blob): Promise<boolean> {
  try {
    if (navigator.clipboard && typeof ClipboardItem !== 'undefined') {
      const item = new ClipboardItem({ [blob.type]: blob });
      await navigator.clipboard.write([item]);
      return true;
    }
  } catch (err) {
    console.warn('Failed to copy image to clipboard:', err);
  }
  return false;
}

/**
 * Shares an image file directly to WhatsApp using Web Share API if supported,
 * or copies image to clipboard and opens WhatsApp.
 */
export async function shareReceiptImageFile(
  blob: Blob,
  filename: string,
  title: string,
  text: string
): Promise<'shared-file' | 'copied-image' | 'downloaded'> {
  const file = new File([blob], filename, { type: blob.type });

  // 1. Try native navigator.share with file (Supported on Android Chrome, iOS Safari, macOS Safari)
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({
        title,
        text,
        files: [file],
      });
      return 'shared-file';
    } catch (e: any) {
      if (e.name === 'AbortError') {
        return 'shared-file';
      }
      console.warn('Native image share failed, trying clipboard fallback:', e);
    }
  }

  // 2. Fallback: Copy image to clipboard and trigger download
  const copied = await copyImageToClipboard(blob);
  downloadImageBlob(blob, filename);

  return copied ? 'copied-image' : 'downloaded';
}
