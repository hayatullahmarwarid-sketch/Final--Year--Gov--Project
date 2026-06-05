import { InspectionAssignmentModel } from '../../../database/models/inspection-assignment.model.js';
import { InspectionAssignmentStatus } from '../shared/enums/inspection-assignment-status.js';
import { AFGHANISTAN_ZONES, zoneByKey, zoneKeyFromLocation, extractPrimaryCityToken } from './lib/afghanistan-zones.js';
import PDFDocument from 'pdfkit';
 
/**
 * @param {string | undefined} v
 */
function parseIsoDate(v) {
  if (!v || typeof v !== 'string') return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}
 
function quarterKeyFromDate(d) {
  const m = d.getUTCMonth() + 1;
  if (m <= 3) return 'Q1';
  if (m <= 6) return 'Q2';
  if (m <= 9) return 'Q3';
  return 'Q4';
}
 
/**
 * Effective compliance score for tracking.
 * We use the finalized assignment's denormalized reporting score when present.
 *
 * @param {Record<string, unknown>} a
 * @returns {number | null}
 */
function complianceScoreFromAssignment(a) {
  const rep = a.reporting && typeof a.reporting === 'object' ? a.reporting : null;
  const v = rep && typeof rep.reviewScore === 'number' ? rep.reviewScore : null;
  if (typeof v !== 'number' || !Number.isFinite(v)) return null;
  return Math.max(0, Math.min(100, Math.round(v * 10) / 10));
}
 
/**
 * Incident definition for tracking:
 * A finalized inspection is treated as an incident when its compliance score is below threshold.
 *
 * @param {number} score
 * @param {number} threshold
 */
function isIncident(score, threshold) {
  return score < threshold;
}
 
/**
 * @param {number[]} values
 * @returns {{ label: string, up: boolean }}
 */
function trendFromValues(values) {
  if (values.length < 2) return { label: '—', up: true };
  const mid = Math.floor(values.length / 2);
  const a = values.slice(0, mid).reduce((s, v) => s + v, 0);
  const b = values.slice(mid).reduce((s, v) => s + v, 0);
  if (a === 0) return { label: b > 0 ? 'New' : '0%', up: b >= 0 };
  const pct = Math.round(((b - a) / a) * 100);
  return { label: `${pct >= 0 ? '+' : ''}${pct}%`, up: pct >= 0 };
}
 
/**
 * @param {number[]} series
 */
function netGainPct(series) {
  if (series.length < 2) return { label: 'Net Gain +0%', up: true, pct: 0 };
  const first = series[0] ?? 0;
  const last = series[series.length - 1] ?? 0;
  if (first <= 0) return { label: 'Net Gain +0%', up: true, pct: 0 };
  const pct = Math.round(((last - first) / first) * 100);
  return { label: `Net Gain ${pct >= 0 ? '+' : ''}${pct}%`, up: pct >= 0, pct };
}
 
/**
 * @typedef {{
 *   zoneKey: import('./lib/afghanistan-zones.js').AfghanistanZoneKey,
 *   zoneName: string,
 *   zoneAnchor: string,
 *   inspectionsCount: number,
 *   complianceAvg: number,
 *   incidentRatePct: number,
 *   trendLabel: string,
 *   trendUp: boolean,
 *   quarterly: Array<{ quarterKey: string, complianceAvg: number, inspectionsCount: number, incidentRatePct: number }>,
 *   netGainLabel: string,
 *   locations: Array<{ city: string, inspectionsCount: number, complianceAvg: number, incidentRatePct: number }>,
 * }} ZoneTrackingDto
 */
 
export class InspectorAdminTrackingService {
  /**
   * @param {{
   *   startDate?: string,
   *   endDate?: string,
   *   incidentThreshold?: number,
   * }} q
   */
  async getNationalTrackingSummary(q) {
    const from = parseIsoDate(q.startDate) ?? new Date(Date.now() - 180 * 86400000);
    const to = parseIsoDate(q.endDate) ?? new Date();
    const threshold =
      typeof q.incidentThreshold === 'number' && Number.isFinite(q.incidentThreshold)
        ? Math.max(0, Math.min(100, q.incidentThreshold))
        : 70;
 
    const rows = await InspectionAssignmentModel.find(
      {
        isDeleted: { $ne: true },
        status: InspectionAssignmentStatus.FINALIZED,
        finalizedAt: { $gte: from, $lte: to },
      },
      { finalizedAt: 1, location: 1, reporting: 1 },
    )
      .limit(25000)
      .lean();
 
    /** @type {Map<string, { zoneKey: string, city: string, scores: number[], incidentCount: number, inspectionsCount: number, quarterAgg: Map<string, { scores: number[], incidentCount: number, inspectionsCount: number }> }>} */
    const byZone = new Map();
 
    /** @type {Map<string, { city: string, scores: number[], incidentCount: number, inspectionsCount: number }>} */
    const cityAgg = new Map();
 
    for (const a of rows) {
      const score = complianceScoreFromAssignment(a);
      if (score === null) continue;
      const loc = a.location ?? null;
      const cityToken = extractPrimaryCityToken(loc);
      const zKey = zoneKeyFromLocation(loc);
      if (!zKey || !cityToken) continue;
 
      const dt = a.finalizedAt ? new Date(a.finalizedAt) : null;
      const qKey = dt ? quarterKeyFromDate(dt) : 'Q1';
      const incident = isIncident(score, threshold);
 
      const z = byZone.get(zKey) ?? {
        zoneKey: zKey,
        city: '',
        scores: [],
        incidentCount: 0,
        inspectionsCount: 0,
        quarterAgg: new Map(),
      };
      z.scores.push(score);
      z.inspectionsCount += 1;
      if (incident) z.incidentCount += 1;
      const qRow = z.quarterAgg.get(qKey) ?? { scores: [], incidentCount: 0, inspectionsCount: 0 };
      qRow.scores.push(score);
      qRow.inspectionsCount += 1;
      if (incident) qRow.incidentCount += 1;
      z.quarterAgg.set(qKey, qRow);
      byZone.set(zKey, z);
 
      const c = cityAgg.get(cityToken) ?? { city: cityToken, scores: [], incidentCount: 0, inspectionsCount: 0 };
      c.scores.push(score);
      c.inspectionsCount += 1;
      if (incident) c.incidentCount += 1;
      cityAgg.set(cityToken, c);
    }
 
    /** @type {ZoneTrackingDto[]} */
    const zones = AFGHANISTAN_ZONES.map((z) => {
      const agg = byZone.get(z.key);
      const scores = agg?.scores ?? [];
      const inspectionsCount = agg?.inspectionsCount ?? 0;
      const incidentCount = agg?.incidentCount ?? 0;
      const complianceAvg = inspectionsCount ? scores.reduce((s, v) => s + v, 0) / inspectionsCount : 0;
      const incidentRatePct = inspectionsCount ? (incidentCount / inspectionsCount) * 100 : 0;
 
      const quarters = ['Q1', 'Q2', 'Q3', 'Q4'];
      const quarterly = quarters.map((qk) => {
        const qa = agg?.quarterAgg.get(qk);
        const qc = qa?.inspectionsCount ?? 0;
        const qInc = qa?.incidentCount ?? 0;
        const qAvg = qc ? qa.scores.reduce((s, v) => s + v, 0) / qc : 0;
        return {
          quarterKey: qk,
          complianceAvg: Math.round(qAvg * 10) / 10,
          inspectionsCount: qc,
          incidentRatePct: qc ? Math.round(((qInc / qc) * 100) * 10) / 10 : 0,
        };
      });
      const trend = trendFromValues(quarterly.map((x) => x.complianceAvg));
      const gain = netGainPct(quarterly.map((x) => x.complianceAvg));
 
      return {
        zoneKey: z.key,
        zoneName: z.name,
        zoneAnchor: z.anchor,
        inspectionsCount,
        complianceAvg: Math.round(complianceAvg * 10) / 10,
        incidentRatePct: Math.round(incidentRatePct * 10) / 10,
        trendLabel: trend.label,
        trendUp: trend.up,
        quarterly,
        netGainLabel: gain.label,
        locations: [],
      };
    });
 
    // Top 5 cities by compliance (min 2 inspections to reduce noise).
    const topCities = [...cityAgg.values()]
      .filter((c) => c.inspectionsCount >= 2)
      .map((c) => ({
        city: c.city,
        inspectionsCount: c.inspectionsCount,
        complianceAvg: Math.round((c.scores.reduce((s, v) => s + v, 0) / c.inspectionsCount) * 10) / 10,
        incidentRatePct:
          c.inspectionsCount > 0 ? Math.round(((c.incidentCount / c.inspectionsCount) * 100) * 10) / 10 : 0,
      }))
      .sort((a, b) => b.complianceAvg - a.complianceAvg || b.inspectionsCount - a.inspectionsCount)
      .slice(0, 5);
 
    // Highest performing zone (by complianceAvg; tie-break by inspectionsCount).
    const topZone =
      [...zones]
        .slice()
        .sort((a, b) => b.complianceAvg - a.complianceAvg || b.inspectionsCount - a.inspectionsCount)[0] ?? null;
 
    return {
      range: { from: from.toISOString(), to: to.toISOString() },
      incidentThreshold: threshold,
      zones,
      topZoneKey: topZone ? topZone.zoneKey : null,
      topCities,
    };
  }
 
  /**
   * @param {import('./lib/afghanistan-zones.js').AfghanistanZoneKey} zoneKey
   * @param {{
   *   startDate?: string,
   *   endDate?: string,
   *   incidentThreshold?: number,
   * }} q
   */
  async getZoneTracking(zoneKey, q) {
    const z = zoneByKey(zoneKey);
    if (!z) return null;
 
    const from = parseIsoDate(q.startDate) ?? new Date(Date.now() - 180 * 86400000);
    const to = parseIsoDate(q.endDate) ?? new Date();
    const threshold =
      typeof q.incidentThreshold === 'number' && Number.isFinite(q.incidentThreshold)
        ? Math.max(0, Math.min(100, q.incidentThreshold))
        : 70;
 
    const rows = await InspectionAssignmentModel.find(
      {
        isDeleted: { $ne: true },
        status: InspectionAssignmentStatus.FINALIZED,
        finalizedAt: { $gte: from, $lte: to },
      },
      { finalizedAt: 1, location: 1, reporting: 1 },
    )
      .limit(25000)
      .lean();
 
    /** @type {Map<string, { city: string, scores: number[], incidentCount: number, inspectionsCount: number }>} */
    const byCity = new Map();
 
    /** @type {Map<string, { scores: number[], incidentCount: number, inspectionsCount: number }>} */
    const quarterAgg = new Map();
 
    const allScores = [];
    let incidentCount = 0;
    let inspectionsCount = 0;
 
    for (const a of rows) {
      const loc = a.location ?? null;
      const zKey = zoneKeyFromLocation(loc);
      if (zKey !== zoneKey) continue;
      const score = complianceScoreFromAssignment(a);
      if (score === null) continue;
 
      const cityToken = extractPrimaryCityToken(loc);
      if (!cityToken) continue;
 
      const dt = a.finalizedAt ? new Date(a.finalizedAt) : null;
      const qKey = dt ? quarterKeyFromDate(dt) : 'Q1';
      const incident = isIncident(score, threshold);
 
      inspectionsCount += 1;
      allScores.push(score);
      if (incident) incidentCount += 1;
 
      const c = byCity.get(cityToken) ?? { city: cityToken, scores: [], incidentCount: 0, inspectionsCount: 0 };
      c.scores.push(score);
      c.inspectionsCount += 1;
      if (incident) c.incidentCount += 1;
      byCity.set(cityToken, c);
 
      const qRow = quarterAgg.get(qKey) ?? { scores: [], incidentCount: 0, inspectionsCount: 0 };
      qRow.scores.push(score);
      qRow.inspectionsCount += 1;
      if (incident) qRow.incidentCount += 1;
      quarterAgg.set(qKey, qRow);
    }
 
    const complianceAvg = inspectionsCount ? allScores.reduce((s, v) => s + v, 0) / inspectionsCount : 0;
    const incidentRatePct = inspectionsCount ? (incidentCount / inspectionsCount) * 100 : 0;
 
    const quarters = ['Q1', 'Q2', 'Q3', 'Q4'];
    const quarterly = quarters.map((qk) => {
      const qa = quarterAgg.get(qk);
      const qc = qa?.inspectionsCount ?? 0;
      const qInc = qa?.incidentCount ?? 0;
      const qAvg = qc ? qa.scores.reduce((s, v) => s + v, 0) / qc : 0;
      return {
        quarterKey: qk,
        complianceAvg: Math.round(qAvg * 10) / 10,
        inspectionsCount: qc,
        incidentRatePct: qc ? Math.round(((qInc / qc) * 100) * 10) / 10 : 0,
      };
    });
 
    const trend = trendFromValues(quarterly.map((x) => x.complianceAvg));
    const gain = netGainPct(quarterly.map((x) => x.complianceAvg));
 
    const locations = [...byCity.values()]
      .map((c) => ({
        city: c.city,
        inspectionsCount: c.inspectionsCount,
        complianceAvg: Math.round((c.scores.reduce((s, v) => s + v, 0) / c.inspectionsCount) * 10) / 10,
        incidentRatePct:
          c.inspectionsCount > 0 ? Math.round(((c.incidentCount / c.inspectionsCount) * 100) * 10) / 10 : 0,
      }))
      .sort((a, b) => b.complianceAvg - a.complianceAvg || b.inspectionsCount - a.inspectionsCount);
 
    /** @type {ZoneTrackingDto} */
    const dto = {
      zoneKey: z.key,
      zoneName: z.name,
      zoneAnchor: z.anchor,
      inspectionsCount,
      complianceAvg: Math.round(complianceAvg * 10) / 10,
      incidentRatePct: Math.round(incidentRatePct * 10) / 10,
      trendLabel: trend.label,
      trendUp: trend.up,
      quarterly,
      netGainLabel: gain.label,
      locations,
    };
 
    return {
      range: { from: from.toISOString(), to: to.toISOString() },
      incidentThreshold: threshold,
      zone: dto,
    };
  }

  /**
   * Generate a complete PDF report for the National Implementation Matrix.
   *
   * @param {{
   *   startDate?: string,
   *   endDate?: string,
   *   incidentThreshold?: number,
   * }} q
   */
  async buildNationalImplementationMatrixPdf(q) {
    const generatedAt = new Date().toISOString();
    const summary = await this.getNationalTrackingSummary(q);
    const zones = summary.zones ?? [];

    const zoneDetails = [];
    for (const z of zones) {
      if (!z?.zoneKey) continue;
      const detail = await this.getZoneTracking(z.zoneKey, q);
      if (detail?.zone) zoneDetails.push(detail.zone);
    }

    const doc = new PDFDocument({
      size: 'A4',
      margin: 40,
      info: {
        Title: 'National Implementation Matrix',
        Author: 'Sharia Decrees',
      },
    });

    /** @type {Buffer[]} */
    const chunks = [];
    doc.on('data', (c) => chunks.push(c));
    const done = new Promise((resolve, reject) => {
      doc.on('end', () => resolve(null));
      doc.on('error', (e) => reject(e));
    });

    const green = '#0088FF';
    const gold = '#83A9FA';
    const muted = '#64748B';

    doc.fillColor(green).fontSize(20).font('Helvetica-Bold').text('National Implementation Matrix', { align: 'left' });
    doc.moveDown(0.4);
    doc.fillColor(muted).fontSize(10).font('Helvetica').text(`Generated: ${generatedAt}`);
    doc.text(`Range: ${summary.range.from.slice(0, 10)} → ${summary.range.to.slice(0, 10)}`);
    doc.text(`Incident threshold: < ${summary.incidentThreshold}% compliance`);
    doc.moveDown(0.8);

    if (Array.isArray(summary.topCities) && summary.topCities.length > 0) {
      doc.fillColor(green).fontSize(12).font('Helvetica-Bold').text('Top cities (compliance)');
      doc.moveDown(0.25);
      doc.fontSize(10).font('Helvetica').fillColor('#0F172A');
      for (const c of summary.topCities.slice(0, 5)) {
        doc.text(`• ${String(c.city)} — ${Number(c.complianceAvg).toFixed(1)}% (${c.inspectionsCount} inspections)`);
      }
      doc.moveDown(0.6);
    }

    doc.fillColor(green).fontSize(12).font('Helvetica-Bold').text('Zones');
    doc.moveDown(0.25);

    for (const z of zoneDetails) {
      doc
        .moveDown(0.6)
        .fillColor(gold)
        .fontSize(13)
        .font('Helvetica-Bold')
        .text(`${z.zoneName} (${z.zoneAnchor})`, { continued: false });

      doc.fillColor('#0F172A').fontSize(10).font('Helvetica');
      doc.text(
        `Compliance avg: ${Number(z.complianceAvg ?? 0).toFixed(1)}%   ` +
          `Incident rate: ${Number(z.incidentRatePct ?? 0).toFixed(1)}%   ` +
          `Inspections: ${Number(z.inspectionsCount ?? 0)}`,
      );
      doc.text(`Trend: ${String(z.trendLabel ?? '—')}   ${String(z.netGainLabel ?? '')}`.trim());

      // Quarterly table
      const q = Array.isArray(z.quarterly) ? z.quarterly : [];
      if (q.length) {
        doc.moveDown(0.25).fillColor(muted).fontSize(9).font('Helvetica-Bold').text('Quarterly');
        doc.fillColor('#0F172A').fontSize(9).font('Helvetica');
        const line = q
          .map(
            (row) =>
              `${String(row.quarterKey)}: ${Number(row.complianceAvg ?? 0).toFixed(1)}% (${Number(row.inspectionsCount ?? 0)})`,
          )
          .join('   ');
        doc.text(line);
      }

      // Locations (top 10)
      const locs = Array.isArray(z.locations) ? z.locations : [];
      if (locs.length) {
        doc.moveDown(0.25).fillColor(muted).fontSize(9).font('Helvetica-Bold').text('Locations (top)');
        doc.fillColor('#0F172A').fontSize(9).font('Helvetica');
        for (const row of locs.slice(0, 10)) {
          doc.text(
            `• ${String(row.city)} — ${Number(row.complianceAvg ?? 0).toFixed(1)}% compliance, ` +
              `${Number(row.incidentRatePct ?? 0).toFixed(1)}% incident rate (${Number(row.inspectionsCount ?? 0)})`,
          );
        }
      }

      // Page break guard
      if (doc.y > 720) doc.addPage();
    }

    doc.end();
    await done;
    const pdf = Buffer.concat(chunks);
    const filename = `national-implementation-matrix-${generatedAt.slice(0, 10)}.pdf`;
    return { pdf, filename, generatedAt, range: summary.range };
  }
}
 
export const inspectorAdminTrackingService = new InspectorAdminTrackingService();
 
