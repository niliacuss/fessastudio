/**
 * Cloudflare Pages Function — fessastudio.nl contactformulier.
 * Vervangt de oude Netlify Forms-koppeling.
 *
 * Verwerkt application/x-www-form-urlencoded POST vanuit contact.html.
 * Stuurt twee mails via MailerSend:
 *   1. Bevestiging naar de afzender
 *   2. Notificatie naar info@fessastudio.nl en essafouad@gmail.com
 * Redirect daarna naar /bedankt.html.
 *
 * Env vars (Cloudflare Pages → Settings → Environment variables):
 *   MAILERSEND_API_KEY     (secret) — token van MailerSend
 *   FESSA_FROM_EMAIL       optional, default "info@fessastudio.nl"
 *   FESSA_CONTACT_TO       komma-gescheiden lijst, default "info@fessastudio.nl,essafouad@gmail.com"
 */

const ESCAPE_MAP = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
function esc(value) {
  return String(value ?? "").replace(/[&<>"']/g, (c) => ESCAPE_MAP[c]);
}

function trimStr(value) {
  return typeof value === "string" ? value.trim() : "";
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function nl2br(text) {
  return esc(text).replace(/\n/g, "<br />");
}

function redirect(location) {
  return new Response(null, { status: 303, headers: { Location: location } });
}

function customerHtml({ naam, type, bericht }) {
  return `<!doctype html>
<html lang="nl"><head><meta charset="utf-8" /><title>Bedankt voor je bericht</title></head>
<body style="margin:0;padding:0;background:#f5f5f3;font-family:Helvetica,Arial,sans-serif;color:#1a1a1a;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f5f5f3;padding:40px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.06);">
        <tr><td style="padding:36px 40px 0 40px;">
          <p style="margin:0;font-size:11px;letter-spacing:0.32em;text-transform:uppercase;color:#888;">Fessa Studio</p>
          <h1 style="margin:14px 0 0 0;font-family:Georgia,serif;font-size:30px;line-height:1.2;color:#1a1a1a;font-weight:400;">Bedankt voor je bericht</h1>
        </td></tr>
        <tr><td style="padding:24px 40px 8px 40px;">
          <p style="margin:0;font-size:15px;line-height:1.7;color:#3a3a3a;">Hi ${esc(naam)},</p>
          <p style="margin:14px 0 0 0;font-size:15px;line-height:1.7;color:#3a3a3a;">
            We hebben je bericht ontvangen en komen er binnen 1-2 werkdagen op terug.
            Hieronder een korte samenvatting van wat je hebt ingestuurd.
          </p>
        </td></tr>
        <tr><td style="padding:24px 40px 0 40px;">
          <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f5f5f3;border-radius:8px;">
            <tr><td style="padding:18px 22px;">
              <p style="margin:0;font-size:11px;letter-spacing:0.28em;text-transform:uppercase;color:#888;">Type aanvraag</p>
              <p style="margin:6px 0 14px 0;font-size:14px;color:#1a1a1a;">${esc(type)}</p>
              <p style="margin:0;font-size:11px;letter-spacing:0.28em;text-transform:uppercase;color:#888;">Je bericht</p>
              <p style="margin:6px 0 0 0;font-size:14px;line-height:1.7;color:#1a1a1a;">${nl2br(bericht)}</p>
            </td></tr>
          </table>
        </td></tr>
        <tr><td style="padding:32px 40px 36px 40px;">
          <p style="margin:0;font-size:13px;line-height:1.7;color:#666;">
            Vragen? Beantwoord deze e-mail dan zonder zorgen — die komt binnen op
            <a href="mailto:info@fessastudio.nl" style="color:#1a1a1a;">info@fessastudio.nl</a>.
          </p>
        </td></tr>
        <tr><td style="padding:24px 40px;text-align:center;border-top:1px solid #ececec;background:#fafafa;">
          <p style="margin:0;font-family:Georgia,serif;font-size:14px;color:#1a1a1a;">Fessa Studio</p>
          <p style="margin:6px 0 0 0;font-size:11px;color:#888;"><a href="https://fessastudio.nl" style="color:#888;text-decoration:none;">fessastudio.nl</a></p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

function adminHtml({ naam, email, type, bericht, when }) {
  return `<!doctype html>
<html lang="nl"><head><meta charset="utf-8" /><title>Nieuwe aanvraag — Fessa Studio</title></head>
<body style="margin:0;padding:0;background:#f5f5f3;font-family:Helvetica,Arial,sans-serif;color:#1a1a1a;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f5f5f3;padding:40px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.06);">
        <tr><td style="padding:32px 40px 0 40px;background:#1a1a1a;">
          <p style="margin:0;font-size:11px;letter-spacing:0.32em;text-transform:uppercase;color:#aaa;">Nieuwe aanvraag</p>
          <h1 style="margin:8px 0 24px 0;font-family:Georgia,serif;font-size:24px;line-height:1.2;color:#fff;font-weight:400;">${esc(naam)} — ${esc(type)}</h1>
        </td></tr>
        <tr><td style="padding:24px 40px 0 40px;">
          <table width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td style="padding:10px 0;font-size:13px;color:#888;width:30%;vertical-align:top;">Naam</td>
              <td style="padding:10px 0;font-size:14px;color:#1a1a1a;vertical-align:top;">${esc(naam)}</td>
            </tr>
            <tr>
              <td style="padding:10px 0;font-size:13px;color:#888;border-top:1px solid #ececec;vertical-align:top;">E-mail</td>
              <td style="padding:10px 0;font-size:14px;color:#1a1a1a;border-top:1px solid #ececec;vertical-align:top;">
                <a href="mailto:${esc(email)}" style="color:#1a1a1a;">${esc(email)}</a>
              </td>
            </tr>
            <tr>
              <td style="padding:10px 0;font-size:13px;color:#888;border-top:1px solid #ececec;vertical-align:top;">Type</td>
              <td style="padding:10px 0;font-size:14px;color:#1a1a1a;border-top:1px solid #ececec;vertical-align:top;">${esc(type)}</td>
            </tr>
            <tr>
              <td style="padding:10px 0;font-size:13px;color:#888;border-top:1px solid #ececec;vertical-align:top;">Ontvangen</td>
              <td style="padding:10px 0;font-size:14px;color:#1a1a1a;border-top:1px solid #ececec;vertical-align:top;">${esc(when)}</td>
            </tr>
          </table>
        </td></tr>
        <tr><td style="padding:24px 40px 8px 40px;">
          <p style="margin:0;font-size:11px;letter-spacing:0.32em;text-transform:uppercase;color:#888;">Bericht</p>
          <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:10px;background:#f5f5f3;border-radius:8px;">
            <tr><td style="padding:18px 22px;font-size:14px;line-height:1.7;color:#1a1a1a;">${nl2br(bericht)}</td></tr>
          </table>
        </td></tr>
        <tr><td style="padding:28px 40px 36px 40px;text-align:center;">
          <a href="mailto:${esc(email)}?subject=Re%3A%20${encodeURIComponent("Je bericht aan Fessa Studio")}"
             style="display:inline-block;padding:12px 24px;background:#1a1a1a;color:#fff;text-decoration:none;border-radius:24px;font-size:13px;letter-spacing:0.16em;text-transform:uppercase;">
            Beantwoord direct
          </a>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

async function sendMail(apiKey, payload) {
  const resp = await fetch("https://api.mailersend.com/v1/email", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "X-Requested-With": "XMLHttpRequest",
    },
    body: JSON.stringify(payload),
  });
  if (!resp.ok) {
    const body = await resp.text();
    throw new Error(`MailerSend ${resp.status}: ${body.slice(0, 200)}`);
  }
}

export const onRequestPost = async ({ request, env }) => {
  const apiKey = env.MAILERSEND_API_KEY;
  const fromEmail = env.FESSA_FROM_EMAIL || "info@fessastudio.nl";
  const toRaw = env.FESSA_CONTACT_TO || "info@fessastudio.nl,essafouad@gmail.com";
  const toList = toRaw.split(",").map(s => s.trim()).filter(Boolean).map(email => ({ email }));

  if (!apiKey) {
    console.error("MAILERSEND_API_KEY missing");
    return redirect("/contact.html?error=server");
  }

  let form;
  try {
    form = await request.formData();
  } catch {
    return redirect("/contact.html?error=parse");
  }

  // Honeypot — als bot-field gevuld is, doen alsof het slaagt zonder iets te sturen
  if (trimStr(form.get("bot-field")).length > 0) {
    return redirect("/bedankt.html");
  }

  const naam = trimStr(form.get("naam"));
  const email = trimStr(form.get("email"));
  const type = trimStr(form.get("type"));
  const bericht = trimStr(form.get("bericht"));

  if (naam.length < 2 || !isValidEmail(email) || bericht.length < 5) {
    return redirect("/contact.html?error=validation");
  }
  if (bericht.length > 5000) {
    return redirect("/contact.html?error=length");
  }

  const fromHeader = { email: fromEmail, name: "Fessa Studio" };
  const replyTo = { email, name: naam };
  const when = new Date().toLocaleString("nl-NL", { dateStyle: "full", timeStyle: "short" });

  try {
    // Bevestiging naar afzender
    await sendMail(apiKey, {
      from: fromHeader,
      to: [{ email, name: naam }],
      reply_to: { email: fromEmail, name: "Fessa Studio" },
      subject: "Bedankt voor je bericht — Fessa Studio",
      html: customerHtml({ naam, type, bericht }),
    });

    // Notificatie naar admin(s)
    await sendMail(apiKey, {
      from: fromHeader,
      to: toList,
      reply_to: replyTo,
      subject: `[FESSA] ${naam} — ${type || "aanvraag"}`,
      html: adminHtml({ naam, email, type: type || "—", bericht, when }),
    });
  } catch (err) {
    console.error("MailerSend failure:", err);
    return redirect("/contact.html?error=send");
  }

  return redirect("/bedankt.html");
};
