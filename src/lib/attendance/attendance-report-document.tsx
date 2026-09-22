import { Document, Page, View, Text, StyleSheet } from "@react-pdf/renderer";

const MANDATORY_HOURS = 8.5;

const styles = StyleSheet.create({
  page: { padding: 28, fontSize: 9, fontFamily: "Helvetica" },
  title: { fontSize: 14, marginBottom: 2, fontFamily: "Helvetica-Bold" },
  subtitle: { fontSize: 9, color: "#64748b", marginBottom: 14 },
  table: { display: "flex", width: "100%" },
  headerRow: {
    flexDirection: "row",
    borderBottom: "1 solid #cbd5e1",
    paddingBottom: 4,
    marginBottom: 4,
  },
  row: {
    flexDirection: "row",
    borderBottom: "0.5 solid #e2e8f0",
    paddingVertical: 4,
  },
  headerCell: { fontFamily: "Helvetica-Bold", color: "#334155" },
  colDate: { width: "20%" },
  colEmployee: { width: "30%" },
  colRole: { width: "20%" },
  colHours: { width: "15%" },
  colShortfall: { width: "15%" },
  shortfall: { color: "#b91c1c", fontFamily: "Helvetica-Bold" },
  ok: { color: "#15803d" },
});

type ReportRow = {
  date: Date;
  checkIn: Date | null;
  checkOut: Date | null;
  breakStart: Date | null;
  breakEnd: Date | null;
  user: { name: string; role: string };
};

function totalHoursDecimal(row: ReportRow): number | null {
  if (!row.checkIn || !row.checkOut) return null;
  return (new Date(row.checkOut).getTime() - new Date(row.checkIn).getTime()) / 3600000;
}

export function AttendanceReportDocument({
  rows,
  rangeLabel,
}: {
  rows: ReportRow[];
  rangeLabel: string;
}) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>Work Hours Report</Text>
        <Text style={styles.subtitle}>{rangeLabel}</Text>
        <View style={styles.table}>
          <View style={styles.headerRow}>
            <Text style={[styles.headerCell, styles.colDate]}>Date</Text>
            <Text style={[styles.headerCell, styles.colEmployee]}>Employee</Text>
            <Text style={[styles.headerCell, styles.colRole]}>Role</Text>
            <Text style={[styles.headerCell, styles.colHours]}>Total Hours</Text>
            <Text style={[styles.headerCell, styles.colShortfall]}>Shortfall</Text>
          </View>
          {rows.map((row, i) => {
            const total = totalHoursDecimal(row);
            const shortfallMin =
              total !== null && MANDATORY_HOURS - total > 0
                ? Math.round((MANDATORY_HOURS - total) * 60)
                : null;
            return (
              <View style={styles.row} key={i}>
                <Text style={styles.colDate}>
                  {new Date(row.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                </Text>
                <Text style={styles.colEmployee}>{row.user.name}</Text>
                <Text style={styles.colRole}>{row.user.role.replace(/_/g, " ")}</Text>
                <Text style={styles.colHours}>{total !== null ? `${total.toFixed(1)}h` : "—"}</Text>
                <Text style={[styles.colShortfall, shortfallMin !== null ? styles.shortfall : styles.ok]}>
                  {shortfallMin !== null ? `-${shortfallMin}m` : total !== null ? "OK" : "—"}
                </Text>
              </View>
            );
          })}
        </View>
      </Page>
    </Document>
  );
}
