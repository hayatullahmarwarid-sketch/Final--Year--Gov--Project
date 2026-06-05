import type { Ionicons } from '@expo/vector-icons';
import type { Href } from 'expo-router';

import type { AuthSessionRole } from '@/contexts/auth-session-context';

type TFunc = (key: string, options?: Record<string, unknown>) => string;

const SA = '/system-admin' as Href;
const SAU = '/system-admin/users' as Href;
const SAL = '/system-admin/logs' as Href;
const SAS = '/system-admin/settings' as Href;
const IA = '/inspector-admin' as Href;
const IAT = '/inspector-admin/templates' as Href;
const IAA = '/inspector-admin/assignments' as Href;
const IAS = '/inspector-admin/submissions' as Href;
const IAI = '/inspector-admin/implementation' as Href;
const IAE = '/inspector-admin/exams' as Href;
const IAQ = '/inspector-admin/questions' as Href;
const IAR = '/inspector-admin/results' as Href;
const IAC = '/inspector-admin/certificates' as Href;
const IAP = '/inspector-admin/reports' as Href;
const IAST = '/inspector-admin/settings' as Href;
const DU = '/dept-upload' as Href;
const DUD = '/dept-upload/decrees' as Href;
const DUS = '/dept-upload/settings' as Href;
const DUR = '/dept-upload/reports' as Href;
const DUH = '/dept-upload/help' as Href;

export type RoleNavItem = {
  key: string;
  label: string;
  href: Href;
  icon: keyof typeof Ionicons.glyphMap;
};

export type RoleNavSection = {
  key: string;
  /** Uppercase group label (e.g. "INSPECTIONS"). Omit for a titleless lead group. */
  title?: string;
  items: RoleNavItem[];
};

export type RoleDrawerBrand = {
  /** Primary brand line (shown bold). e.g. "INSPECTOR" */
  title: string;
  /** Accented brand line (gold). e.g. "OPERATIONS" */
  subtitle: string;
  /** Icon shown inside the circular brand chip. */
  icon: keyof typeof Ionicons.glyphMap;
};

const publicNav: RoleNavItem[] = [
  { key: 'pub-home', label: 'Home', href: '/(tabs)', icon: 'home-outline' },
  { key: 'pub-decrees', label: 'Decrees', href: '/(tabs)/decrees', icon: 'book-outline' },
  { key: 'pub-exams', label: 'Exams', href: '/(tabs)/exams', icon: 'school-outline' },
  { key: 'pub-certificates', label: 'Certificates', href: '/(tabs)/certificates', icon: 'ribbon-outline' },
  { key: 'pub-profile', label: 'Profile', href: '/(tabs)/profile', icon: 'person-outline' },
];

const inspectorNav: RoleNavItem[] = [
  { key: 'insp-home', label: 'Tasks', href: '/inspector', icon: 'clipboard-outline' },
  { key: 'insp-list', label: 'Task list', href: '/inspector/tasks', icon: 'list-outline' },
  { key: 'insp-sync', label: 'Sync queue', href: '/inspector/sync', icon: 'cloud-upload-outline' },
  { key: 'insp-profile', label: 'Inspector profile', href: '/inspector/profile', icon: 'person-circle-outline' },
];

function deptUploadSections(t: TFunc): RoleNavSection[] {
  return [
    {
      key: 'dept-main',
      items: [
        { key: 'dept-dash', label: t('dashLabelDashboard'), href: DU, icon: 'grid-outline' },
        { key: 'dept-decrees', label: t('deptDrawerDecreeManagement'), href: DUD, icon: 'document-text-outline' },
        { key: 'dept-rep', label: t('dashLabelReports'), href: DUR, icon: 'bar-chart-outline' },
        { key: 'dept-set', label: t('dashLabelSettings'), href: DUS, icon: 'settings-outline' },
        { key: 'dept-help', label: t('deptAccountMenuHelp'), href: DUH, icon: 'help-circle-outline' },
      ],
    },
  ];
}

const systemAdminNav: RoleNavItem[] = [
  { key: 'sys-overview', label: 'Dashboard', href: SA, icon: 'grid-outline' },
  { key: 'sys-users', label: 'Users & Roles', href: SAU, icon: 'people-outline' },
  { key: 'sys-logs', label: 'System Logs', href: SAL, icon: 'shield-outline' },
  { key: 'sys-settings', label: 'Settings', href: SAS, icon: 'settings-outline' },
];

function systemAdminSections(t: TFunc): RoleNavSection[] {
  return [
    {
      key: 'sys-main',
      items: [
        { key: 'sys-overview', label: t('saNavDashboard'), href: SA, icon: 'grid-outline' },
        { key: 'sys-users', label: t('saNavUsersRoles'), href: SAU, icon: 'people-outline' },
        { key: 'sys-logs', label: t('saNavSystemLogs'), href: SAL, icon: 'shield-outline' },
        { key: 'sys-settings', label: t('saNavSettings'), href: SAS, icon: 'settings-outline' },
      ],
    },
  ];
}

function inspectorAdminSections(t: TFunc): RoleNavSection[] {
  return [
    {
      key: 'ia-lead',
      items: [
        { key: 'ia-dash', label: t('dashLabelDashboard'), href: IA, icon: 'grid-outline' },
      ],
    },
    {
      key: 'ia-inspections',
      title: t('dashSectionInspections'),
      items: [
        { key: 'ia-tpl', label: t('dashLabelTemplates'), href: IAT, icon: 'clipboard-outline' },
        { key: 'ia-assign', label: t('dashLabelAssignments'), href: IAA, icon: 'person-add-outline' },
        { key: 'ia-subs', label: t('dashLabelSubmissions'), href: IAS, icon: 'checkbox-outline' },
      ],
    },
    {
      key: 'ia-implementation',
      title: t('dashSectionImplementation'),
      items: [{ key: 'ia-impl', label: t('dashLabelTracking'), href: IAI, icon: 'bar-chart-outline' }],
    },
    {
      key: 'ia-learning',
      title: t('dashSectionLearning'),
      items: [
        { key: 'ia-exams', label: t('dashLabelManageExams'), href: IAE, icon: 'school-outline' },
        { key: 'ia-qbank', label: t('dashLabelQuestionBank'), href: IAQ, icon: 'server-outline' },
        { key: 'ia-res', label: t('dashLabelExamResults'), href: IAR, icon: 'document-text-outline' },
      ],
    },
    {
      key: 'ia-certificates',
      title: t('dashSectionCertificates'),
      items: [{ key: 'ia-cert', label: t('dashLabelCertificates'), href: IAC, icon: 'ribbon-outline' }],
    },
    {
      key: 'ia-analytics',
      title: t('dashSectionAnalytics'),
      items: [{ key: 'ia-rep', label: t('dashLabelReports'), href: IAP, icon: 'document-outline' }],
    },
    {
      key: 'ia-system',
      title: t('dashSectionSystem'),
      items: [{ key: 'ia-settings', label: t('dashLabelSettings'), href: IAST, icon: 'settings-outline' }],
    },
  ];
}

/**
 * Sections for the drawer, grouped by category.
 * For inspector_admin the groups reflect the production IA dashboard
 * (Inspections / Implementation / Learning / Certificates / Analytics / System).
 * For other roles the existing flat nav is returned as a single untitled section.
 */
export function navSectionsForRole(role: AuthSessionRole, t: TFunc): RoleNavSection[] {
  switch (role) {
    case 'inspector_admin':
      return inspectorAdminSections(t);
    case 'public':
      return [{ key: 'public-main', items: publicNav }];
    case 'inspector':
      return [{ key: 'insp-main', items: inspectorNav }];
    case 'dept_upload':
      return deptUploadSections(t);
    case 'system_admin':
      return systemAdminSections(t);
    default:
      return [];
  }
}

/** Flattened list of nav items — kept for compatibility with legacy callers. */
export function navItemsForRole(role: AuthSessionRole): RoleNavItem[] {
  switch (role) {
    case 'public':
      return publicNav;
    case 'inspector':
      return inspectorNav;
    case 'dept_upload':
      return deptUploadSections((k) => k).flatMap((s) => s.items);
    case 'system_admin':
      return systemAdminNav;
    case 'inspector_admin':
      return inspectorAdminSections((k) => k).flatMap((s) => s.items);
    default:
      return [];
  }
}

export function drawerBrandingForRole(role: AuthSessionRole, t: TFunc): RoleDrawerBrand {
  switch (role) {
    case 'inspector_admin':
      return {
        title: t('dashBrandInspectorTitle'),
        subtitle: t('dashBrandInspectorSubtitle'),
        icon: 'shield-checkmark',
      };
    case 'system_admin':
      return { title: t('saBrandTitle'), subtitle: t('saBrandSubtitle'), icon: 'flash' };
    case 'dept_upload':
      return { title: t('deptShellTitle'), subtitle: t('deptDrawerSubtitle'), icon: 'document-text' };
    case 'inspector':
      return { title: 'FIELD', subtitle: 'INSPECTOR', icon: 'clipboard' };
    case 'public':
    default:
      return { title: 'SHARIA', subtitle: 'DECREES', icon: 'book' };
  }
}

export function organizationLabelForRole(role: AuthSessionRole, t: TFunc): string {
  switch (role) {
    case 'inspector_admin':
    case 'system_admin':
    case 'dept_upload':
      return t('dashOrgMainHeadquarters');
    case 'inspector':
      return 'FIELD OPERATIONS';
    case 'public':
    default:
      return 'CITIZEN ACCOUNT';
  }
}

export function defaultTitleForRole(role: AuthSessionRole): string {
  switch (role) {
    case 'public':
      return 'Sharia Decrees';
    case 'inspector':
      return 'Field Inspector';
    case 'dept_upload':
      return 'Decree upload';
    case 'system_admin':
      return 'System administration';
    case 'inspector_admin':
      return 'Inspector administration';
  }
}

/** Green top-bar title for Super Admin routes (mobile shell). */
export function systemAdminHeaderTitleForPath(pathname: string, t: TFunc): string {
  const p = pathname.replace(/\/$/, '') || '/';
  if (p.includes('users')) return t('saNavUsersRoles');
  if (p.includes('logs')) return t('saNavSystemLogs');
  if (p.includes('settings')) return t('saNavSettings');
  return t('saNavDashboard');
}
