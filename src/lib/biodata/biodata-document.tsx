import { Document, Page, Text, View, Image, StyleSheet } from "@react-pdf/renderer";
import fs from "fs";
import path from "path";

// Company logo for the header (small 400px copy of public/eb-logo.png).
// If it can't be read, the header falls back to the "EB" text box.
let LOGO_DATA: Buffer | null = null;
try {
  LOGO_DATA = fs.readFileSync(path.join(process.cwd(), "public", "eb-logo-pdf.png"));
} catch {
  LOGO_DATA = null;
}
import type { BiodataData } from "./build-biodata-data";

const MAROON = "#6D1B2F";
const MAROON_DARK = "#3F0F1C";
const GOLD = "#C9A45C";
const CREAM = "#F5F0E7";
const INK = "#2B2420";
const MUTED = "#8A7F72";

const styles = StyleSheet.create({
  page: { padding: 0, fontSize: 9.5, fontFamily: "Helvetica", color: INK },
  content: { padding: 30, paddingTop: 20 },

  header: {
    backgroundColor: MAROON_DARK,
    paddingHorizontal: 30,
    paddingVertical: 16,
    flexDirection: "row",
    alignItems: "center",
  },
  logoBox: {
    width: 40, height: 40, borderRadius: 4, borderWidth: 1.2, borderColor: GOLD,
    alignItems: "center", justifyContent: "center", marginRight: 12,
  },
  logoText: { fontSize: 15, fontFamily: "Times-Bold", color: GOLD },
  logoImageBox: {
    width: 52, height: 42, borderRadius: 4, backgroundColor: "#FFFFFF", borderWidth: 1.2, borderColor: GOLD,
    alignItems: "center", justifyContent: "center", marginRight: 12,
  },
  logoImage: { width: 46, height: 36, objectFit: "contain" },
  brandCol: { flex: 1 },
  brandTitle: { fontSize: 18, fontFamily: "Times-Bold", color: "#fff", letterSpacing: 1.5 },
  brandSubtitle: { fontSize: 8, color: GOLD, letterSpacing: 2.5, marginTop: 2, textTransform: "uppercase" },
  headerGoldLine: { height: 2.5, backgroundColor: GOLD },

  pageHeadingRow: { marginTop: 18, marginBottom: 14 },
  pageHeadingName: { fontSize: 20, fontFamily: "Times-Bold", color: MAROON_DARK },
  pageHeadingTitle: { fontSize: 16, fontFamily: "Times-Bold", color: MAROON_DARK },
  pageHeadingMeta: { fontSize: 9, color: MUTED, marginTop: 4 },

  topRow: { flexDirection: "row", gap: 16, marginBottom: 16 },
  photoFrame: {
    width: 130, height: 160, borderRadius: 4, borderWidth: 1.2, borderColor: GOLD, padding: 3,
  },
  photo: { width: "100%", height: "100%", objectFit: "contain", borderRadius: 2 },
  photoPlaceholder: {
    width: "100%", height: "100%", backgroundColor: CREAM,
    alignItems: "center", justifyContent: "center", borderRadius: 2,
  },
  photoPlaceholderText: { color: MUTED, fontSize: 7.5, letterSpacing: 1 },

  aboutBox: {
    flex: 1, borderWidth: 0.75, borderColor: "#E7DFD2", borderRadius: 4,
    padding: 10, backgroundColor: "#FBF9F5",
  },
  aboutHeading: { fontSize: 9, fontFamily: "Helvetica-Bold", color: MAROON_DARK, letterSpacing: 1, marginBottom: 6, textTransform: "uppercase" },
  aboutText: { fontSize: 9, lineHeight: 1.55, color: "#4A4137" },

  galleryRow: { flexDirection: "row", gap: 10, marginBottom: 16 },
  galleryPhoto: { width: 145, height: 130, borderRadius: 4, objectFit: "cover", objectPosition: "top", borderWidth: 0.75, borderColor: "#E7DFD2" },

  section: { marginBottom: 14 },
  sectionTitleRow: { flexDirection: "row", alignItems: "center", marginBottom: 6 },
  sectionTitle: { fontSize: 10.5, fontFamily: "Helvetica-Bold", color: MAROON_DARK, letterSpacing: 0.8, textTransform: "uppercase" },
  sectionRule: { flex: 1, height: 1.5, backgroundColor: GOLD, marginLeft: 8 },

  gridRow: { flexDirection: "row" },
  gridRowShaded: { backgroundColor: CREAM },
  gridCell: { flex: 1, flexDirection: "row", paddingVertical: 5, paddingHorizontal: 8 },
  gridLabel: { width: 92, fontSize: 8.5, color: MUTED },
  gridValue: { flex: 1, fontSize: 9, color: INK, fontFamily: "Helvetica-Bold" },

  listRow: { flexDirection: "row", paddingVertical: 5, paddingHorizontal: 8 },
  listRowShaded: { backgroundColor: CREAM },
  listLabel: { width: 150, fontSize: 8.5, color: MUTED },
  listValue: { flex: 1, fontSize: 9, color: INK, fontFamily: "Helvetica-Bold" },

  paragraphBox: { paddingVertical: 5, paddingHorizontal: 8, marginTop: 2 },
  paragraphText: { fontSize: 9, lineHeight: 1.55, color: "#4A4137" },

  disclaimerBox: {
    marginTop: 6, padding: 10, backgroundColor: CREAM, borderRadius: 4,
    borderLeftWidth: 3, borderLeftColor: MAROON,
  },
  disclaimerTitle: { fontSize: 8.5, fontFamily: "Helvetica-Bold", color: MAROON_DARK, marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.5 },
  disclaimerText: { fontSize: 7.5, lineHeight: 1.5, color: "#6B6055" },

  footer: {
    position: "absolute", bottom: 0, left: 0, right: 0,
    backgroundColor: MAROON_DARK,
    borderTopWidth: 2, borderTopColor: GOLD,
    paddingVertical: 8, paddingHorizontal: 30,
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
  },
  footerText: { fontSize: 7.5, color: "#F5E6D3" },
});

function combine(parts: Array<string | number | null | undefined>, sep = " / "): string | null {
  const filled = parts.filter((p) => p !== null && p !== undefined && p !== "").map(String);
  return filled.length ? filled.join(sep) : null;
}

function Header({ eyebrow, title }: { eyebrow: string; title?: string }) {
  return (
    <View>
      <View style={styles.header}>
        <View style={LOGO_DATA ? styles.logoImageBox : styles.logoBox}>
          {LOGO_DATA ? (
            <Image src={{ data: LOGO_DATA, format: "png" }} style={styles.logoImage} />
          ) : (
            <Text style={styles.logoText}>EB</Text>
          )}
        </View>
        <View style={styles.brandCol}>
          <Text style={styles.brandTitle}>ELITE BANDHAN</Text>
          <Text style={styles.brandSubtitle}>{eyebrow}</Text>
        </View>
      </View>
      <View style={styles.headerGoldLine} />
    </View>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <View style={styles.sectionTitleRow}>
      <Text style={styles.sectionTitle}>{children}</Text>
      <View style={styles.sectionRule} />
    </View>
  );
}

type Item = { label: string; value: string | null };

function GridSection({ title, items }: { title: string; items: Item[] }) {
  const filled = items.filter((i): i is { label: string; value: string } => !!i.value);
  if (!filled.length) return null;
  const pairs: [Item & { value: string }, (Item & { value: string }) | undefined][] = [];
  for (let i = 0; i < filled.length; i += 2) pairs.push([filled[i], filled[i + 1]]);
  return (
    <View style={styles.section}>
      <SectionTitle>{title}</SectionTitle>
      {pairs.map(([a, b], idx) => (
        <View key={idx} style={[styles.gridRow, idx % 2 === 1 ? styles.gridRowShaded : undefined]} wrap={false}>
          <View style={styles.gridCell}>
            <Text style={styles.gridLabel}>{a.label}</Text>
            <Text style={styles.gridValue}>{a.value}</Text>
          </View>
          <View style={styles.gridCell}>
            {b && (
              <>
                <Text style={styles.gridLabel}>{b.label}</Text>
                <Text style={styles.gridValue}>{b.value}</Text>
              </>
            )}
          </View>
        </View>
      ))}
    </View>
  );
}

function ListSection({ title, items, paragraph }: { title: string; items: Item[]; paragraph?: string | null }) {
  const filled = items.filter((i): i is { label: string; value: string } => !!i.value);
  if (!filled.length && !paragraph) return null;
  return (
    <View style={styles.section}>
      <SectionTitle>{title}</SectionTitle>
      {filled.map((item, idx) => (
        <View key={idx} style={[styles.listRow, idx % 2 === 1 ? styles.listRowShaded : undefined]} wrap={false}>
          <Text style={styles.listLabel}>{item.label}</Text>
          <Text style={styles.listValue}>{item.value}</Text>
        </View>
      ))}
      {paragraph && (
        <View style={styles.paragraphBox} wrap={false}>
          <Text style={styles.paragraphText}>{paragraph}</Text>
        </View>
      )}
    </View>
  );
}

function Footer({ email }: { email: string }) {
  return (
    <View style={styles.footer} fixed>
      <Text style={styles.footerText}>elitebandhan.com   |   {email}   |   +91 9315812799</Text>
      <Text
        style={styles.footerText}
        render={({ pageNumber, totalPages }) => `${String(pageNumber).padStart(2, "0")} / ${String(totalPages).padStart(2, "0")}`}
      />
    </View>
  );
}

export function BiodataDocument({ data }: { data: BiodataData }) {
  const personalDetails: Item[] = [
    { label: "Date of Birth", value: data.dob ? new Date(data.dob).toLocaleDateString("en-IN", { dateStyle: "medium" }) : null },
    { label: "Height", value: data.height },
    { label: "Marital Status", value: data.maritalStatus },
    { label: "Mother Tongue", value: data.motherTongue },
    { label: "Current City", value: combine([data.city, data.state]) },
    { label: "Native Place", value: data.nativePlace },
    { label: "Nationality", value: data.country },
    { label: "Citizenship", value: data.citizenship },
    { label: "Visa Status", value: data.visaStatus },
    { label: "Religion", value: data.religion },
    { label: "Community / Caste", value: combine([data.caste, data.subCaste]) },
    { label: "Gotra", value: data.gotra },
    { label: "Time of Birth", value: data.timeOfBirth },
    { label: "Place of Birth", value: data.placeOfBirth },
    { label: "Weight", value: data.weightKg ? `${data.weightKg} kg` : null },
    { label: "Body Type", value: data.bodyType },
    { label: "Complexion", value: data.complexion },
    { label: "Blood Group", value: data.bloodGroup },
    { label: "Health Status", value: data.healthStatus },
  ];

  const educationCareer: Item[] = [
    { label: "Qualification", value: combine([data.highestQualification, data.educationField]) },
    { label: "Institute / University", value: data.institute },
    { label: "Profession / Organisation", value: combine([data.profession, data.workingWith]) },
    { label: "Designation / Annual Income", value: combine([data.designation, data.annualIncome]) },
  ];

  const lifestyle: Item[] = [
    { label: "Diet / Smoking / Drinking", value: combine([data.diet, data.smoking, data.drinking], " • ") },
  ];

  const familyBackground: Item[] = [
    { label: "Father's Occupation", value: data.fatherOccupation },
    { label: "Mother's Occupation", value: data.motherOccupation },
    {
      label: "Siblings",
      value:
        data.brothers || data.sisters
          ? `${data.brothers ?? 0} Brother(s) (${data.brothersMarried ?? 0} Married), ${data.sisters ?? 0} Sister(s) (${data.sistersMarried ?? 0} Married)`
          : null,
    },
    { label: "Family Type / Values", value: combine([data.familyType, data.familyValues]) },
    { label: "Family Annual Income", value: data.familyAnnualIncome },
    { label: "Family Net Worth", value: data.familyNetWorth },
  ];

  const additionalDetails: Item[] = [
    { label: "Rashi / Nakshatra / Manglik", value: combine([data.rashi, data.nakshatra, data.manglik], " • ") },
    { label: "Contact Person / Relationship", value: combine([data.contactPerson, data.creatingFor]) },
  ];

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Header eyebrow="Matrimonial Profile" />
        <View style={styles.content}>
          <View style={styles.pageHeadingRow}>
            <Text style={styles.pageHeadingName}>{data.name}</Text>
            <Text style={styles.pageHeadingMeta}>
              Profile ID: {data.profileCode}   |   Age: {data.age ? `${data.age} Yrs` : "-"}   |   Gender: {data.gender}
            </Text>
          </View>

          <View style={styles.topRow} wrap={false}>
            <View style={styles.photoFrame}>
              {data.photoUrl ? (
                <Image src={data.photoUrl} style={styles.photo} />
              ) : (
                <View style={styles.photoPlaceholder}>
                  <Text style={styles.photoPlaceholderText}>NO PHOTO</Text>
                </View>
              )}
            </View>
            {data.aboutYourself && (
              <View style={styles.aboutBox}>
                <Text style={styles.aboutHeading}>About Me</Text>
                <Text style={styles.aboutText}>{data.aboutYourself}</Text>
              </View>
            )}
          </View>

          <GridSection title="Personal Details" items={personalDetails} />
          <ListSection title="Education & Career" items={educationCareer} />
          <ListSection title="Lifestyle" items={lifestyle} />
        </View>
        <Footer email="care@elitebandhan.com" />
      </Page>

      <Page size="A4" style={styles.page}>
        <Header eyebrow="Family Details" />
        <View style={styles.content}>
          <View style={styles.pageHeadingRow}>
            <Text style={styles.pageHeadingTitle}>Family Details</Text>
            <Text style={styles.pageHeadingMeta}>Profile ID: {data.profileCode}</Text>
          </View>

          {data.galleryPhotos.length > 0 && (
            <View style={styles.galleryRow} wrap={false}>
              {data.galleryPhotos.map((src, i) => (
                <Image key={i} src={src} style={styles.galleryPhoto} />
              ))}
            </View>
          )}

          <ListSection title="Family Background" items={familyBackground} paragraph={data.familyBio} />
          <ListSection title="Additional Details" items={additionalDetails} />

          <View style={styles.disclaimerBox} wrap={false}>
            <Text style={styles.disclaimerTitle}>Confidentiality & Disclaimer</Text>
            <Text style={styles.disclaimerText}>
              This content may be confidential or privileged. If you have received the said profile from any
              other source, kindly update us, or else it will be treated as our Company's proposal. Also, the
              details provided in the profile are sent by the said party & our firm is not responsible for any
              misinterpretation regarding the same. You may reach us at: Address: A, 4, LGF, near Vardhman
              Mall, Sector 19B, Nanda Enclave, Sector 19, Dwarka, Delhi, 110075. Email: Care@elitebandhan.com.
              Contact number: +91 9315812799.
            </Text>
          </View>
        </View>
        <Footer email="care@elitebandhan.com" />
      </Page>
    </Document>
  );
}
