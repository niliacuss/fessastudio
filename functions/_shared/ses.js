/**
 * AWS SES v2 e-mailverstuurder voor Cloudflare Pages Functions.
 * Gebruikt Web Crypto API + Signature V4 — geen npm-dependency nodig.
 *
 * Vereiste env vars:
 *   AWS_ACCESS_KEY_ID
 *   AWS_SECRET_ACCESS_KEY
 *   AWS_REGION  (default "eu-north-1")
 */

const ENC = new TextEncoder();

function bytesToHex(bytes) {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

async function sha256Hex(input) {
  const data = typeof input === "string" ? ENC.encode(input) : input;
  const hash = await crypto.subtle.digest("SHA-256", data);
  return bytesToHex(new Uint8Array(hash));
}

async function hmac(keyData, message) {
  const key = await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, ENC.encode(message));
  return new Uint8Array(sig);
}

async function deriveSigningKey(secret, dateStamp, region, service) {
  const kDate = await hmac(ENC.encode("AWS4" + secret), dateStamp);
  const kRegion = await hmac(kDate, region);
  const kService = await hmac(kRegion, service);
  return hmac(kService, "aws4_request");
}

/**
 * Verstuurt één e-mail via SES v2.
 * @param {object} opts
 * @param {string} opts.accessKeyId
 * @param {string} opts.secretAccessKey
 * @param {string} opts.region            bv. "eu-north-1"
 * @param {string} opts.from              "Naam <mail@domein.nl>" of "mail@domein.nl"
 * @param {string|string[]} opts.to       e-mailadres(sen)
 * @param {string|string[]} [opts.replyTo]
 * @param {string} opts.subject
 * @param {string} opts.html
 * @returns {Promise<{messageId: string}>}
 */
export async function sendSesEmail({
  accessKeyId,
  secretAccessKey,
  region,
  from,
  to,
  replyTo,
  subject,
  html,
}) {
  const service = "ses";
  const host = `email.${region}.amazonaws.com`;
  const path = "/v2/email/outbound-emails";
  const url = `https://${host}${path}`;

  const toArr = Array.isArray(to) ? to : [to];
  const replyArr = replyTo
    ? Array.isArray(replyTo)
      ? replyTo
      : [replyTo]
    : undefined;

  const payload = {
    FromEmailAddress: from,
    Destination: { ToAddresses: toArr },
    Content: {
      Simple: {
        Subject: { Data: subject, Charset: "UTF-8" },
        Body: { Html: { Data: html, Charset: "UTF-8" } },
      },
    },
  };
  if (replyArr) payload.ReplyToAddresses = replyArr;

  const body = JSON.stringify(payload);

  // ISO-8601 basic format YYYYMMDDTHHMMSSZ
  const now = new Date();
  const amzDate = now
    .toISOString()
    .replace(/[:-]|\.\d{3}/g, "");
  const dateStamp = amzDate.slice(0, 8);

  const payloadHash = await sha256Hex(body);

  // Canonical request — headers alphabetical
  const signedHeaders = "content-type;host;x-amz-content-sha256;x-amz-date";
  const canonicalRequest = [
    "POST",
    path,
    "",
    "content-type:application/json",
    `host:${host}`,
    `x-amz-content-sha256:${payloadHash}`,
    `x-amz-date:${amzDate}`,
    "",
    signedHeaders,
    payloadHash,
  ].join("\n");

  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
  const stringToSign = [
    "AWS4-HMAC-SHA256",
    amzDate,
    credentialScope,
    await sha256Hex(canonicalRequest),
  ].join("\n");

  const signingKey = await deriveSigningKey(
    secretAccessKey,
    dateStamp,
    region,
    service
  );
  const signature = bytesToHex(await hmac(signingKey, stringToSign));

  const authHeader = [
    "AWS4-HMAC-SHA256",
    `Credential=${accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`,
  ].join(" ");

  const resp = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: authHeader,
      "Content-Type": "application/json",
      "X-Amz-Date": amzDate,
      "X-Amz-Content-Sha256": payloadHash,
    },
    body,
  });

  if (!resp.ok) {
    const errBody = await resp.text();
    throw new Error(`SES ${resp.status}: ${errBody.slice(0, 300)}`);
  }

  return resp.json();
}
