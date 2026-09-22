import { prisma } from "@/lib/db/prisma";

export type EnquiryTracking = {
  pagePath?: string;
  landingPath?: string;
  referrer?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmTerm?: string;
  hasClickId?: boolean;
  device?: string;
  pagesViewed?: number;
};

const clip = (v: string | undefined | null, max = 500) => {
  const t = (v ?? "").trim();
  return t ? t.slice(0, max) : null;
};

function hostOf(ref: string | null) {
  if (!ref) return null;
  try {
    return new URL(ref).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return null;
  }
}

// Turns referrer + UTM tags into one simple traffic channel.
export function channelFor(t: EnquiryTracking | undefined, host: string | null): string {
  const medium = (t?.utmMedium ?? "").toLowerCase();
  const source = (t?.utmSource ?? "").toLowerCase();
  if (/cpc|ppc|paid|display|cpm/.test(medium)) return "Paid ads";
  if (/whatsapp/.test(source) || /wa\.me|whatsapp/.test(host ?? "")) return "WhatsApp";
  if (/email|newsletter/.test(medium)) return "Email";
  if (/social/.test(medium) || /facebook|instagram|fb\.|youtube|t\.co|twitter|x\.com|linkedin|pinterest|l\.instagram/.test(host ?? "") || /facebook|instagram|youtube|^ig$|^fb$/.test(source))
    return "Social";
  if (t?.hasClickId) return "Paid ads";
  if (/google\.|bing\.|duckduckgo|yahoo\.|ecosia|yandex|baidu/.test(host ?? "") || medium === "organic") return "Organic search";
  if (host && !/elitebandhan/.test(host)) return "Other website";
  if (host) return "Direct / internal";
  return "Direct";
}

// Never throws: a tracking failure must never block a lead.
export async function logEnquiryEvent(leadId: string, isRepeat: boolean, t: EnquiryTracking | undefined) {
  try {
    const referrer = clip(t?.referrer);
    const host = hostOf(referrer);
    const channel = channelFor(t, host);
    await prisma.$executeRaw`
      INSERT INTO enquiry_events
        ("leadId","isRepeat","pagePath","landingPath","referrer","referrerHost","channel",
         "utmSource","utmMedium","utmCampaign","utmTerm","hasClickId","device","pagesViewed")
      VALUES
        (${leadId}, ${isRepeat}, ${clip(t?.pagePath)}, ${clip(t?.landingPath)}, ${referrer}, ${host}, ${channel},
         ${clip(t?.utmSource, 120)}, ${clip(t?.utmMedium, 120)}, ${clip(t?.utmCampaign, 200)}, ${clip(t?.utmTerm, 200)},
         ${!!t?.hasClickId}, ${clip(t?.device, 20)}, ${typeof t?.pagesViewed === "number" ? Math.round(t.pagesViewed) : null})
    `;
  } catch (err) {
    console.error("Enquiry event log failed", err);
  }
}

export type TrafficEvent = {
  leadId: string;
  isRepeat: boolean;
  createdAt: number;
  landingPath: string | null;
  pagePath: string | null;
  referrerHost: string | null;
  channel: string;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  hasClickId: boolean;
  device: string | null;
  pagesViewed: number | null;
};

type RawEventRow = {
  createdAt: Date;
  leadId: string;
  isRepeat: boolean;
  landingPath: string | null;
  pagePath: string | null;
  referrerHost: string | null;
  channel: string | null;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  hasClickId: boolean | null;
  device: string | null;
  pagesViewed: number | bigint | null;
};

// Reads every tracked enquiry. Returns an empty list on any failure.
export async function loadTrafficEvents(): Promise<TrafficEvent[]> {
  try {
    const rows = await prisma.$queryRaw<RawEventRow[]>`SELECT "createdAt","leadId","isRepeat","landingPath","pagePath","referrerHost","channel","utmSource","utmMedium","utmCampaign","hasClickId","device","pagesViewed" FROM enquiry_events ORDER BY "createdAt" ASC`;
    return rows.map((r) => ({
      leadId: String(r.leadId),
      isRepeat: !!r.isRepeat,
      createdAt: new Date(r.createdAt).getTime(),
      landingPath: r.landingPath,
      pagePath: r.pagePath,
      referrerHost: r.referrerHost,
      channel: channelFor({ utmSource: r.utmSource ?? undefined, utmMedium: r.utmMedium ?? undefined, hasClickId: !!r.hasClickId }, r.referrerHost),
      utmSource: r.utmSource,
      utmMedium: r.utmMedium,
      utmCampaign: r.utmCampaign,
      hasClickId: !!r.hasClickId,
      device: r.device,
      pagesViewed: r.pagesViewed === null || r.pagesViewed === undefined ? null : Number(r.pagesViewed),
    }));
  } catch (err) {
    console.error("Traffic events load failed", err);
    return [];
  }
}
