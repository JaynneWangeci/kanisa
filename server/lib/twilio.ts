import twilio from "twilio";

const accountSid = process.env.TWILIO_ACCOUNT_SID || "";
const authToken = process.env.TWILIO_AUTH_TOKEN || "";
const whatsappFrom = process.env.TWILIO_WHATSAPP_FROM || "";

let client: ReturnType<typeof twilio> | null = null;

export function getTwilioClient() {
  if (!authToken) return null;
  if (!client) client = twilio(accountSid, authToken);
  return client;
}

export async function sendWhatsApp(to: string, message: string): Promise<boolean> {
  try {
    const c = getTwilioClient();
    if (!c || !whatsappFrom) {
      console.warn("Twilio not configured — skipping WhatsApp send");
      return false;
    }
    const clean = to.replace(/\D/g, "");
    const formatted = clean.startsWith("0") ? "254" + clean.slice(1) : clean.startsWith("254") ? clean : "254" + clean;
    await c.messages.create({
      from: `whatsapp:${whatsappFrom}`,
      to: `whatsapp:+${formatted}`,
      body: message,
    });
    return true;
  } catch (err) {
    console.error("WhatsApp send error:", err);
    return false;
  }
}
