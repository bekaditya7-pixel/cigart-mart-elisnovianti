/**
 * WhatsApp and Native Web Share Utilities
 * Ensures 100% reliable sharing across desktop, mobile, and sandboxed iframes.
 */

export function cleanWhatsAppNumber(phone: string): string {
  let cleaned = phone.replace(/\D/g, '');
  if (cleaned.startsWith('0')) {
    cleaned = '62' + cleaned.slice(1);
  } else if (!cleaned.startsWith('62') && cleaned.length > 0) {
    cleaned = '62' + cleaned;
  }
  return cleaned;
}

export function generateWhatsAppUrl(text: string, phone?: string): string {
  const encodedText = encodeURIComponent(text);
  const cleanPhone = phone ? cleanWhatsAppNumber(phone) : '';
  if (cleanPhone) {
    return `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodedText}`;
  }
  return `https://api.whatsapp.com/send?text=${encodedText}`;
}

/**
 * Triggers WhatsApp opening without getting blocked by iframe popup restrictions.
 * Uses a real HTMLAnchorElement dispatched in user-gesture scope.
 */
export function openWhatsAppDirect(text: string, phone?: string): void {
  const url = generateWhatsAppUrl(text, phone);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.target = '_blank';
  anchor.rel = 'noopener noreferrer';
  document.body.appendChild(anchor);
  anchor.click();
  setTimeout(() => {
    try {
      document.body.removeChild(anchor);
    } catch {
      // ignore
    }
  }, 100);
}

/**
 * Copies text safely to clipboard with fallback for older browsers or iframes
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch (err) {
    console.warn('Clipboard API failed, trying fallback textarea:', err);
  }

  // Fallback using textarea
  try {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    const successful = document.execCommand('copy');
    document.body.removeChild(textArea);
    return successful;
  } catch (err) {
    console.error('Copy fallback failed:', err);
    return false;
  }
}

/**
 * Native Web Share or WhatsApp Fallback
 */
export async function shareToWhatsAppOrNative(
  title: string,
  text: string,
  phone?: string,
  file?: { filename: string; content: string }
): Promise<'native-share' | 'whatsapp-direct'> {
  // Try native navigator.share if available (especially on Android/iOS)
  if (navigator.canShare) {
    try {
      const shareData: ShareData = {
        title,
        text,
      };

      if (file && typeof File !== 'undefined') {
        const blob = new Blob(['\uFEFF' + file.content], { type: 'text/csv;charset=utf-8;' });
        const fileObj = new File([blob], file.filename, { type: 'text/csv' });
        if (navigator.canShare({ files: [fileObj] })) {
          shareData.files = [fileObj];
        }
      }

      await navigator.share(shareData);
      return 'native-share';
    } catch (e: any) {
      // If user aborted/cancelled, stop here
      if (e.name === 'AbortError') {
        return 'native-share';
      }
      console.warn('Native share threw error, falling back to direct WhatsApp:', e);
    }
  }

  // Fallback to WhatsApp Direct Link
  openWhatsAppDirect(text, phone);
  return 'whatsapp-direct';
}
