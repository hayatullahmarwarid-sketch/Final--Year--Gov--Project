import { Brand } from '@/constants/brand';

export type CertificateLevel = 'advanced' | 'intermediate' | 'basic';

export type CertificateListItem = {
  id: string;
  /** e.g. "Economy Category" */
  categoryTitle: string;
  level: CertificateLevel;
  /** Display date */
  dateLabel: string;
  /** Official certificate id for QR / PDF */
  certificateId: string;
  /** Shown on completion page, e.g. "Economy (4 degrees)" */
  categoryBadge: string;
  /** Score on third carousel face */
  scorePct: number;
  /** Footer expiry line */
  expiresLabel: string;
  /** Data URL from server (`QRCode.toDataURL`) when issued via API */
  verifyQrDataUrl?: string;
  /** Resolved PDF download URL when available */
  pdfUrl?: string;
};

export type CertificateFilterTab = 'all' | CertificateLevel;

export const CERTIFICATE_FILTER_TABS: { key: CertificateFilterTab; label: string; dot: string }[] = [
  { key: 'all', label: 'All', dot: Brand.green },
  { key: 'advanced', label: 'Advanced', dot: '#F1B434' },
  { key: 'intermediate', label: 'Intermediate', dot: '#1B7340' },
  { key: 'basic', label: 'Basic', dot: '#5B9AFF' },
];

export function countCertificatesByFilter(
  items: CertificateListItem[],
  tab: CertificateFilterTab,
): number {
  if (tab === 'all') return items.length;
  return items.filter((c) => c.level === tab).length;
}
