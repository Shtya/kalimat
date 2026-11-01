// Public contact settings for the product landing page.

/** International format without "+" or spaces, e.g. "201001234567". Set NEXT_PUBLIC_WHATSAPP_NUMBER in .env. */
export const WHATSAPP_NUMBER = (process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "").replace(/\D/g, "");

const DEFAULT_MESSAGE = "السلام عليكم، أريد عرضًا لتطبيق «كلمات قرآنية» لمركزنا.";

/** WhatsApp chat link with a ready-made first message (falls back to the contact section if no number is set). */
export function whatsappLink(message = DEFAULT_MESSAGE): string {
  if (!WHATSAPP_NUMBER) return "#contact";
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}
