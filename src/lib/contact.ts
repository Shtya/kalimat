const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type ParsedContact =
  | { phone: string | null; email: string | null }
  | { phone: null; email: null; error: string };

/** One field that is either a mobile number or an email. */
export function parseContact(raw: string): ParsedContact {
  const trimmed = raw.trim();
  if (!trimmed) return { phone: null, email: null, error: "اكتب رقمك أو بريدك" };
  if (trimmed.includes("@")) {
    const email = trimmed.toLowerCase();
    if (!EMAIL.test(email) || email.length > 120) return { phone: null, email: null, error: "البريد غير صالح" };
    return { phone: null, email };
  }
  const phone = trimmed.replace(/\D/g, "");
  if (phone.length < 8 || phone.length > 15) {
    return { phone: null, email: null, error: "اكتب رقم موبايل صحيح (٨–١٥ رقم) أو بريد إلكتروني" };
  }
  return { phone, email: null };
}

/** Settings form: phone and email are independent, at least one is required. */
export function parseAccountFields(phoneRaw: string, emailRaw: string): ParsedContact {
  const phoneTrim = phoneRaw.trim();
  const emailTrim = emailRaw.trim().toLowerCase();
  let phone: string | null = null;
  let email: string | null = null;

  if (phoneTrim) {
    phone = phoneTrim.replace(/\D/g, "");
    if (phone.length < 8 || phone.length > 15) {
      return { phone: null, email: null, error: "اكتب رقم موبايل صحيح (٨–١٥ رقم)" };
    }
  }
  if (emailTrim) {
    if (!EMAIL.test(emailTrim) || emailTrim.length > 120) {
      return { phone: null, email: null, error: "البريد غير صالح" };
    }
    email = emailTrim;
  }
  if (!phone && !email) return { phone: null, email: null, error: "أضف رقم موبايل أو بريد إلكتروني" };
  return { phone, email };
}
