import nodemailer, { type Transporter } from "nodemailer";

export function createMailTransport() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT ?? "587");
  const secure = process.env.SMTP_SECURE === "true";
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || user === undefined || pass === undefined) {
    throw new Error("SMTP_HOST, SMTP_USER, and SMTP_PASS are required.");
  }

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
  });
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Inline HTML only — matches app navy/orange; hex for older mail clients. */
function buildBirthdayEmailHtml(displayName: string): string {
  const safe = escapeHtml(displayName);

  const navy = "#151b2e";
  const navyMid = "#1e2740";
  const orange = "#f15d03";
  const muted = "#64748b";
  const paper = "#ffffff";
  const wash = "#f1f5f9";

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta http-equiv="x-ua-compatible" content="ie=edge">
<title>Happy Birthday</title>
<!--[if mso]><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml><![endif]-->
</head>
<body style="margin:0;padding:0;background-color:${wash};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;-webkit-font-smoothing:antialiased;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:${wash};">
  <tr>
    <td align="center" style="padding:40px 16px;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:560px;background-color:${paper};border-radius:16px;overflow:hidden;box-shadow:0 12px 40px rgba(21,27,46,0.12);">
        <tr>
          <td style="background:linear-gradient(135deg,${navy} 0%,${navyMid} 55%,${navy} 100%);padding:0;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="height:4px;background:${orange};font-size:0;line-height:0;">&nbsp;</td>
              </tr>
              <tr>
                <td style="padding:28px 32px 20px 32px;text-align:center;">
                  <p style="margin:0 0 8px 0;font-size:11px;letter-spacing:0.28em;text-transform:uppercase;color:rgba(255,255,255,0.55);font-weight:600;">Sioux Badminton Club</p>
                  <p style="margin:0;font-size:42px;line-height:1;">&#127881;</p>
                  <h1 style="margin:12px 0 0 0;font-size:26px;font-weight:700;line-height:1.25;color:#ffffff;letter-spacing:-0.02em;">Happy Birthday!</h1>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:32px 36px 8px 36px;">
            <p style="margin:0 0 16px 0;font-size:18px;line-height:1.5;color:${navy};font-weight:600;">Dear ${safe},</p>
            <p style="margin:0 0 18px 0;font-size:16px;line-height:1.65;color:${muted};">
              Today we&rsquo;re celebrating <strong style="color:${navy};font-weight:600;">you</strong>. Thank you for being part of our club - your energy on court and camaraderie off it make Sioux Badminton Club what it is.
            </p>
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:24px 0;border-radius:12px;background:linear-gradient(180deg,rgba(241,93,3,0.08) 0%,rgba(241,93,3,0.02) 100%);border:1px solid rgba(241,93,3,0.18);">
              <tr>
                <td style="padding:20px 22px;">
                  <p style="margin:0 0 8px 0;font-size:13px;font-weight:600;letter-spacing:0.06em;text-transform:uppercase;color:${orange};">From all of us</p>
                  <p style="margin:0;font-size:15px;line-height:1.6;color:${navy};">
                    Wishing you a smash-filled year ahead, with great rallies, sharp net shots, and plenty of wins — on and off the court. &#127992;
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:0 36px 36px 36px;">
            <p style="margin:0;font-size:15px;line-height:1.6;color:${muted};">
              Enjoy your special day!<br/>
              <span style="color:${navy};font-weight:600;">Sioux Badminton Club</span>
            </p>
          </td>
        </tr>
        <tr>
          <td style="padding:20px 36px;background-color:${wash};border-top:1px solid rgba(148,163,184,0.25);">
            <p style="margin:0;font-size:12px;line-height:1.5;color:#94a3b8;text-align:center;">
              You received this message because you are an active member with a birthday on file.<br/>
              <span style="white-space:nowrap;">SBC &middot; Sioux Badminton Club</span>
            </p>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>`;
}

export async function sendHappyBirthdayEmail(
  to: string,
  recipientName: string | null,
  /** Reuse one transporter per batch (e.g. cron) to avoid reconnecting to SMTP for every message. */
  transport: Transporter = createMailTransport(),
): Promise<void> {
  const from = process.env.MAIL_FROM ?? '"SBC" <noreply@sbc.com>';
  const name = recipientName?.trim() || "Member";

  await transport.sendMail({
    from,
    to,
    subject: `Happy Birthday, ${name}!`,
    text: [
      `Dear ${name},`,
      "",
      "Happy birthday from Sioux Badminton Club!",
      "",
      "Today we're celebrating you. Thank you for being part of our club — your energy on court and camaraderie off it mean a lot.",
      "",
      "Wishing you a great year ahead — enjoy your special day!",
      "",
      "— Sioux Badminton Club",
      "",
      "(You received this because you are an active member with a birthday on file.)",
    ].join("\n"),
    html: buildBirthdayEmailHtml(name),
  });
}
