export type TaskStatus =
  | 'assigned'
  | 'in-progress'
  | 'overdue'
  | 'draft'
  | 'completed'
  | 'returned';

export type TaskPriority = 'high' | 'medium' | 'low';

/** Single-decree vs whole-category assignment from Inspector Admin. */
export type InspectionTaskScope = 'single-decree' | 'category';

export type InspectorTask = {
  id: string;
  title: string;
  /** When `status` is `returned`, populated from admin review (`returnReason`). */
  returnReason?: string;
  /** Optional admin notes from assignment record. */
  notes?: string;
  /**
   * Inspector-facing target label from admin assignment:
   * - Single decree: `Category-Decree No. XX` (e.g. Economy-Decree No. 34)
   * - Category sweep: `Category(All)` (e.g. Economy(All))
   */
  decreeTitle: string;
  inspectionScope: InspectionTaskScope;
  categoryName: string;
  /** Present when `inspectionScope` is `single-decree` (digits as assigned, e.g. 34, 09). */
  decreeNumber?: string;
  region: string;
  deadline: string;
  status: TaskStatus;
  priority: TaskPriority;
  instructions: string;
  requirements: string[];
};

export function formatInspectorTaskTargetLabel(task: Pick<InspectorTask, 'inspectionScope' | 'categoryName' | 'decreeNumber'>): string {
  if (task.inspectionScope === 'category') {
    return `${task.categoryName}(All)`;
  }
  return `${task.categoryName}-Decree No. ${task.decreeNumber ?? ''}`;
}

const DEFAULT_REQ = [
  'Photo of merchant permit',
  'Checklist of basic price controls',
  'GPS location capture',
  'Digital signature of merchant (optional)',
  'Digital signature of inspector',
];

type TaskSeed =
  | (Omit<InspectorTask, 'decreeTitle' | 'instructions' | 'requirements'> & {
      inspectionScope: 'single-decree';
      decreeNumber: string;
      instructions?: string;
      requirements?: string[];
    })
  | (Omit<InspectorTask, 'decreeTitle' | 'decreeNumber' | 'instructions' | 'requirements'> & {
      inspectionScope: 'category';
      instructions?: string;
      requirements?: string[];
    });

function task(partial: TaskSeed): InspectorTask {
  const decreeTitle = formatInspectorTaskTargetLabel(partial);
  const { instructions: instrPartial, requirements: reqPartial, ...rest } = partial;
  return {
    ...rest,
    decreeTitle,
    instructions:
      instrPartial ??
      'Complete the inspection per operational handbook. Document all findings with photos and GPS where required.',
    requirements: reqPartial ?? DEFAULT_REQ,
  };
}

/**
 * Inspector tasks — intentionally empty. Real assignments come from the API via
 * `GET /api/v1/inspectors/assignments` and are normalized by the workspace context.
 * The `task()` helper is retained so future seeding (e.g. for storybook) stays consistent.
 */
export const INSPECTOR_TASKS: InspectorTask[] = [];

/** First four tasks shown on dashboard cards — derived from INSPECTOR_TASKS, so now empty. */
export const INSPECTOR_DASHBOARD_TASKS: InspectorTask[] = [];

export function getInspectorTaskById(id: string): InspectorTask | undefined {
  return INSPECTOR_TASKS.find((t) => t.id === id);
}

/** Detail route payload: returns the matching task when present, otherwise `undefined`. */
export function getInspectorTaskDetailPayload(id: string): InspectorTask | undefined {
  return getInspectorTaskById(id.trim());
}

export type InspectorTaskStats = {
  assigned: number;
  inProgress: number;
  overdue: number;
  draft: number;
  completed: number;
  returned: number;
};

export function getInspectorTaskStats(tasks: InspectorTask[]): InspectorTaskStats {
  const out: InspectorTaskStats = {
    assigned: 0,
    inProgress: 0,
    overdue: 0,
    draft: 0,
    completed: 0,
    returned: 0,
  };
  for (const t of tasks) {
    switch (t.status) {
      case 'assigned':
        out.assigned += 1;
        break;
      case 'in-progress':
        out.inProgress += 1;
        break;
      case 'overdue':
        out.overdue += 1;
        break;
      case 'draft':
        out.draft += 1;
        break;
      case 'completed':
        out.completed += 1;
        break;
      case 'returned':
        out.returned += 1;
        break;
      default:
        break;
    }
  }
  return out;
}
