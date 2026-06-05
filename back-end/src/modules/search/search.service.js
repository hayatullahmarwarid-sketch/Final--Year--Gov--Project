import mongoose from 'mongoose';
import { decreeRepository } from '../../../database/repositories/decree.repository.js';
import { examRepository } from '../../../database/repositories/exam.repository.js';
import { DecreeModel } from '../../../database/models/decree.model.js';
import { DecreeVersionModel } from '../../../database/models/decree-version.model.js';
import { ExamModel } from '../../../database/models/exam.model.js';
import { DecreeLifecycle } from '../shared/enums/decree-lifecycle.js';
import { ExamLifecycle } from '../shared/enums/exam-lifecycle.js';
import { buildDecreeNumberLabel } from '../decree-upload/serializers/decree.serializer.js';

/**
 * @param {string} s
 */
function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Strip characters that commonly break MongoDB `$text` parsing.
 * @param {string} raw
 */
function textSearchClause(raw) {
  const s = raw
    .trim()
    .replace(/["\\]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return s.length >= 2 ? s : '';
}

export class SearchService {
  /**
   * @param {import('zod').infer<typeof import('./search.validation.js').unifiedSearchQuerySchema>} query
   */
  async unifiedSearch(query) {
    const q = query.q.trim();
    const limit = query.limit ?? 20;
    const type = query.type ?? 'all';

    /** @type {{ decrees: Array<Record<string, unknown>>, exams: Array<Record<string, unknown>> }} */
    const out = { decrees: [], exams: [] };

    if (type === 'all' || type === 'decrees') {
      const { items } = await decreeRepository.findPublicCatalogPage({
        skip: 0,
        limit,
        keyword: q,
        sort: 'publishedAt',
      });
      const byId = new Map();

      const ts = textSearchClause(q);
      if (ts) {
        try {
          const textRows = await DecreeModel.find(
            {
              $text: { $search: ts },
              isDeleted: { $ne: true },
              visibility: 'public',
              status: { $in: [DecreeLifecycle.ACTIVE, DecreeLifecycle.ARCHIVED] },
            },
            { score: { $meta: 'textScore' } },
          )
            .sort({ score: { $meta: 'textScore' } })
            .limit(limit)
            .lean();
          for (const d of textRows) {
            byId.set(String(d._id), d);
          }
        } catch {
          /* Missing text index or invalid $text query — fall back to catalog only. */
        }
      }

      for (const d of items) {
        if (byId.size >= limit) break;
        byId.set(String(d._id), d);
      }

      if (q.length >= 2) {
        const rx = new RegExp(escapeRegex(q), 'i');
        const extraIds = await DecreeVersionModel.distinct('decreeId', {
          isDeleted: { $ne: true },
          publicationStatus: 'published',
          $or: [
            { localizedContent: { $elemMatch: { bodyPlain: rx } } },
            { localizedContent: { $elemMatch: { bodyRich: rx } } },
            { localizedContent: { $elemMatch: { title: rx } } },
          ],
        });
        const need = Math.max(0, limit - byId.size);
        if (need > 0 && extraIds.length) {
          const oids = extraIds
            .filter((id) => id && !byId.has(String(id)))
            .slice(0, need)
            .map((id) => new mongoose.Types.ObjectId(String(id)));
          if (oids.length) {
            const extraRows = await decreeRepository.model
              .find({
                _id: { $in: oids },
                isDeleted: { $ne: true },
                visibility: 'public',
                status: { $in: [DecreeLifecycle.ACTIVE, DecreeLifecycle.ARCHIVED] },
              })
              .limit(need)
              .lean();
            for (const d of extraRows) {
              byId.set(String(d._id), d);
            }
          }
        }
      }

      out.decrees = [...byId.values()].slice(0, limit).map((d) => ({
        kind: 'decree',
        id: String(d._id),
        decreeNumber: d.decreeNumber,
        decreeNumberLabel: buildDecreeNumberLabel(d),
        titleSummary: d.titleSummary,
        status: d.status,
        publishedAt: d.publishedAt ?? null,
        viewCount: typeof d.viewCount === 'number' ? d.viewCount : 0,
      }));
    }

    if (type === 'all' || type === 'exams') {
      const { items } = await examRepository.findPublicCatalogPage({
        skip: 0,
        limit,
        search: q,
      });
      const examById = new Map();
      const tsEx = textSearchClause(q);
      if (tsEx) {
        try {
          const textExams = await ExamModel.find(
            {
              $text: { $search: tsEx },
              isDeleted: { $ne: true },
              status: { $in: [ExamLifecycle.SCHEDULED, ExamLifecycle.OPEN, ExamLifecycle.PUBLISHED] },
            },
            { score: { $meta: 'textScore' } },
          )
            .sort({ score: { $meta: 'textScore' } })
            .limit(limit)
            .lean();
          for (const e of textExams) {
            examById.set(String(e._id), e);
          }
        } catch {
          /* no text index or bad query */
        }
      }
      for (const e of items) {
        if (examById.size >= limit) break;
        examById.set(String(e._id), e);
      }
      out.exams = [...examById.values()].slice(0, limit).map((e) => ({
        kind: 'exam',
        id: String(e._id),
        title: e.title,
        status: e.status,
        scheduledOpensAt: e.scheduledOpensAt ?? null,
        scheduledClosesAt: e.scheduledClosesAt ?? null,
      }));
    }

    return { q, type, limit, ...out };
  }
}

export const searchService = new SearchService();
