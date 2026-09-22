import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: Number(process.env.SMTP_PORT) === 465,
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
});

// Uploaded photos are stored as relative paths ("/uploads/xyz.jpg"), which
// only resolve on the live site. Email clients fetch images directly and
// have no concept of a "current page" to resolve a relative path against,
// so every image src in an email must be a full absolute URL.
function toAbsoluteUrl(url: string | null): string | null {
  if (!url) return null;
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  const base = process.env.NEXTAUTH_URL?.replace(/\/$/, "") ?? "";
  return `${base}${url.startsWith("/") ? url : `/${url}`}`;
}

export type MatchedProfileForEmail = {
  name: string;
  profileCode: string;
  photoUrl: string | null;
  age: number | null;
  height: string | null;
  city: string | null;
  religionName: string | null;
  casteName: string | null;
  profession: string | null;
  highestQualification: string | null;
  viewUrl: string | null;
  downloadUrl: string | null;
};

export type EmailSender = {
  name: string;
  role?: string | null;
  email?: string | null;
  phone?: string | null;
};

function pill(text: string) {
  return `<span style="display: inline-block; background: #f3effa; color: #5b3a8e; font-size: 11px; font-weight: 600; padding: 3px 9px; border-radius: 999px; margin: 0 6px 6px 0;">${text}</span>`;
}

function profileCardHtml(p: MatchedProfileForEmail) {
  const headline = [p.age ? `${p.age} yrs` : null, p.height, p.city]
    .filter(Boolean)
    .join(" &nbsp;&bull;&nbsp; ");

  const pills = [p.religionName, p.casteName, p.profession, p.highestQualification]
    .filter((v): v is string => !!v)
    .map(pill)
    .join("");

  const buttons = `
    <div style="margin-top: 12px; display: flex; gap: 10px; flex-wrap: wrap;">
      ${p.downloadUrl ? `<a href="${p.downloadUrl}" target="_blank" style="display: inline-block; padding: 11px 18px; background: #a71c1c; color: #ffffff; text-decoration: none; border-radius: 30px; font-size: 13px; font-weight: 700;">⬇ Download Profile</a>` : ""}
      ${p.viewUrl ? `<a href="${p.viewUrl}" target="_blank" style="display: inline-block; padding: 11px 18px; background: #8b1538; color: #ffffff; text-decoration: none; border-radius: 30px; font-size: 13px; font-weight: 700;">👁 View Profile</a>` : ""}
    </div>
  `;

  return `
    <div style="border: 1px solid #eee3d7; border-radius: 14px; padding: 18px; margin-bottom: 16px; background: linear-gradient(180deg, #fffdfb 0%, #fff7f1 100%);">
      <p style="margin: 0 0 4px; font-size: 18px; font-weight: 700; color: #8b1538;">${p.name}</p>
      <p style="margin: 0 0 8px; font-size: 11px; letter-spacing: 0.03em; color: #999; text-transform: uppercase;">Profile ID: ${p.profileCode}</p>
      <p style="margin: 0 0 8px; font-size: 13px; color: #555;">${headline}</p>
      <div>${pills}</div>
      ${buttons}
    </div>
  `;
}
    

function signatureHtml(sender: EmailSender) {
  return `
    <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #eee;">
      <p style="margin: 0; font-size: 14px; color: #333;">Warm regards,</p>
      <p style="margin: 4px 0 0; font-size: 14px; font-weight: 600; color: #2b1b4e;">${sender.name}</p>
      ${sender.role ? `<p style="margin: 0; font-size: 12px; color: #777;">${sender.role}</p>` : ""}
      <p style="margin: 6px 0 0; font-size: 12px; color: #777;">Elite Bandhan</p>
      ${sender.email ? `<p style="margin: 0; font-size: 12px; color: #777;">${sender.email}</p>` : ""}
      ${sender.phone ? `<p style="margin: 0; font-size: 12px; color: #777;">${sender.phone}</p>` : ""}
    </div>
  `;
}

export async function sendMatchedProfilesEmail(
  to: string,
  clientName: string,
  profiles: MatchedProfileForEmail[],
  sender: EmailSender
) {
  const info = await transporter.sendMail({
    from: `"Elite Bandhan" <${process.env.SMTP_USER}>`,
    to,
    cc: "meenakshi@elitebandhan.com",
    subject: "Weekly matches from elitebandhan.com!",
    html: `
      <div style="font-family: Arial, Helvetica, sans-serif; max-width: 620px; margin: 0 auto; background: #f4f1ed; padding: 20px;">
        <div style="background: #ffffff; border-radius: 18px; overflow: hidden; box-shadow: 0 8px 24px rgba(0,0,0,0.08);">
          <div style="height: 6px; background: linear-gradient(90deg, #8b1538, #c79b5d, #8b1538);"></div>
          <div style="background: linear-gradient(135deg, #7d102d 0%, #a71c1c 60%, #c79b5d 100%); text-align: center; padding: 32px 25px 28px; color: #ffffff;">
            <img src="https://www.elitebandhan.com/img/eb-logo.webp" alt="EliteBandhan.Com Logo" style="max-width: 100px; height: 100px; margin-bottom: 15px; background: #fff; border-radius: 20%; padding: 8px;" />
            <h1 style="margin: 0 0 10px; font-size: 26px; font-weight: 700;">Profiles Curated for You</h1>
            <p style="margin: 0; font-size: 14px; color: #f8e9e9;">Personalised recommendations from EliteBandhan.com</p>
          </div>
          <div style="padding: 30px 26px;">
            <p style="font-size: 15px; color: #333; margin: 0 0 14px;">Dear ${clientName || "Valued Member"},</p>
            <p style="font-size: 14px; color: #555; margin: 0 0 22px;">
              Please find the attached profiles as per your preferences. We request you to kindly review the same and share your valuable feedback.
            </p>
            <h2 style="font-size: 16px; font-weight: 700; color: #8b1538; margin: 0 0 18px; text-align: center;">Recommended Profiles</h2>
            ${profiles.map(profileCardHtml).join("")}
            <p style="font-size: 14px; color: #555; margin-top: 18px;">
              We hope these recommendations bring you closer to finding the right match. Thank you for trusting EliteBandhan.com.
            </p>
            ${signatureHtml(sender)}
          </div>
          <div style="background: #faf7f3; text-align: center; padding: 22px 20px; border-top: 1px solid #eee7df;">
            <p style="margin: 6px 0; font-size: 13px; color: #6b6b6b;"><strong>EliteBandhan.com</strong></p>
            <p style="margin: 6px 0; font-size: 13px; color: #6b6b6b;">Premium Matrimonial &amp; Matchmaking Assistance</p>
            <p style="margin: 6px 0; font-size: 13px;"><a href="https://www.elitebandhan.com" style="color: #8b1538; text-decoration: none; font-weight: 600;">Visit Website</a></p>
            <p style="margin: 6px 0; font-size: 13px; color: #6b6b6b;">Your happiness is our true success.</p>
            <p style="margin-top: 14px; font-size: 13px; color: #6b6b6b;">
              For any kind of assistance kindly write us at:
              <a href="mailto:care@elitebandhan.com" style="color: #8b1538; text-decoration: none; font-weight: 600;">care@elitebandhan.com</a>
              or call at <strong>+91 9315812799</strong>
            </p>
          </div>
        </div>
      </div>
    `,
  });

  if (process.env.NODE_ENV !== "production") {
    console.log("Preview URL:", nodemailer.getTestMessageUrl(info));
  }
}

export async function sendProfileEmail(to: string, profileName: string, profileCode: string, photoUrl: string | null) {
  const photo = toAbsoluteUrl(photoUrl);
  const info = await transporter.sendMail({
    from: `"Elite Bandhan" <${process.env.SMTP_USER}>`,
    to,
    subject: `A Compatible Match: ${profileName} (${profileCode})`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; border: 1px solid #eee; border-radius: 8px; overflow: hidden;">
        <div style="background: #2b1b4e; color: white; padding: 20px; text-align: center;">
          <h2 style="margin: 0;">Elite Bandhan</h2>
          <p style="margin: 4px 0 0; opacity: 0.8;">A New Match For You</p>
        </div>
        <div style="padding: 20px;">
          ${photo ? `<img src="${photo}" style="width: 100%; max-height: 300px; object-fit: cover; border-radius: 6px;" />` : ""}
          <h3 style="margin-top: 16px;">${profileName}</h3>
          <p style="color: #666;">Profile ID: ${profileCode}</p>
          <p>Please contact your relationship manager for more details about this profile.</p>
        </div>
        <div style="background: #f5f5f5; padding: 12px; text-align: center; font-size: 12px; color: #999;">
          Elite Bandhan &middot; This email was sent on your behalf by our Service team.
        </div>
      </div>
    `,
  });

  if (process.env.NODE_ENV !== "production") {
    console.log("Preview URL:", nodemailer.getTestMessageUrl(info));
  }
}

export async function sendProspectInterestEmail(
  to: string,
  prospectName: string,
  clientName: string,
  clientProfileCode: string,
  acceptUrl: string,
  rejectUrl: string,
  sender: EmailSender,
  attachment?: { filename: string; content: Buffer }
) {
  const info = await transporter.sendMail({
    from: `"Elite Bandhan" <${process.env.SMTP_USER}>`,
    to,
    cc: "meenakshi@elitebandhan.com",
    subject: `Marriage Proposal from Elite Bandhan — ${clientName}`,
    html: `
      <div style="font-family: Arial, Helvetica, sans-serif; max-width: 620px; margin: 0 auto; background: #f4f1ed; padding: 20px;">
        <div style="background: #ffffff; border-radius: 18px; overflow: hidden; box-shadow: 0 8px 24px rgba(0,0,0,0.08);">
          <div style="height: 6px; background: linear-gradient(90deg, #8b1538, #c79b5d, #8b1538);"></div>
          <div style="background: linear-gradient(135deg, #7d102d 0%, #a71c1c 60%, #c79b5d 100%); text-align: center; padding: 32px 25px 28px; color: #ffffff;">
            <h1 style="margin: 0 0 10px; font-size: 26px; font-weight: 700;">Elite Bandhan</h1>
            <p style="margin: 0; font-size: 14px; color: #f8e9e9;">A Marriage Proposal For You</p>
          </div>
          <div style="padding: 30px 26px;">
            <p style="font-size: 15px; color: #333; margin: 0 0 14px;">Dear ${prospectName || "Member"},</p>
            <p style="font-size: 14px; color: #555; margin: 0 0 14px;">
              I am the Relationship Manager for Elite Bandhan member, <strong>${clientName} (${clientProfileCode})</strong>.
            </p>
            <p style="font-size: 14px; color: #555; margin: 0 0 22px;">
              We believe our client could be a suitable match for you. If you are interested, we would be happy to take this forward and arrange a meeting at the earliest. Please find their biodata attached for your review.
            </p>
            <div style="text-align: center; margin: 24px 0;">
              <a href="${acceptUrl}" target="_blank" style="display: inline-block; margin: 0 8px 10px; padding: 12px 22px; background: #1a7f4b; color: #ffffff; text-decoration: none; border-radius: 30px; font-size: 14px; font-weight: 700;">
                ✓ I'm Interested
              </a>
              <a href="${rejectUrl}" target="_blank" style="display: inline-block; margin: 0 8px 10px; padding: 12px 22px; background: #8a8a8a; color: #ffffff; text-decoration: none; border-radius: 30px; font-size: 14px; font-weight: 700;">
                Not Interested
              </a>
            </div>
            <p style="font-size: 13px; color: #666; margin: 20px 0 0;">
              If you have any questions, feel free to reply to this email or reach out directly.
            </p>
            ${signatureHtml(sender)}
          </div>
          <div style="background: #faf7f3; text-align: center; padding: 22px 20px; border-top: 1px solid #eee7df;">
            <p style="margin: 6px 0; font-size: 13px; color: #6b6b6b;"><strong>Elite Bandhan</strong></p>
            <p style="margin: 6px 0; font-size: 13px; color: #6b6b6b;">Premium Matrimonial &amp; Matchmaking Assistance</p>
            <p style="margin: 6px 0; font-size: 13px; color: #999;">This email was sent on behalf of our Service team</p>
          </div>
        </div>
      </div>
    `,
    attachments: attachment ? [{ filename: attachment.filename, content: attachment.content }] : undefined,
  });

  if (process.env.NODE_ENV !== "production") {
    console.log("Preview URL:", nodemailer.getTestMessageUrl(info));
  }
}
