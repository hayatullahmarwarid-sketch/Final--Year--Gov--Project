import mongoose from 'mongoose';
import { NotFoundError } from '../shared/http/index.js';
import { storedFileRepository } from '../../../database/repositories/stored-file.repository.js';
import { serializeStoredFile } from './serializers/stored-file.serializer.js';
import { toOffsetLimit } from '../shared/query/pagination.js';

function toOid(id) {
  return typeof id === 'string' ? new mongoose.Types.ObjectId(id) : id;
}

export class FilesMetadataService {
  /**
   * @param {{ files?: import('../../../database/repositories/stored-file.repository.js').StoredFileRepository }} [deps]
   */
  constructor(deps = {}) {
    this.files = deps.files ?? storedFileRepository;
  }

  /**
   * @param {import('zod').infer<typeof import('./files.validation.js').createStoredFileBodySchema>} body
   * @param {{ actorUserId?: string | null }} [opts]
   */
  async createMetadata(body, opts = {}) {
    const uploadedBy = body.uploadedBy ?? opts.actorUserId ?? null;
    const doc = {
      originalName: body.originalName.trim(),
      mimeType: body.mimeType.trim(),
      size: body.size,
      provider: body.provider.trim().toLowerCase(),
      providerFileId: body.providerFileId.trim(),
      url: body.url?.trim() || null,
      folder: body.folder?.trim() || null,
      purpose: body.purpose,
      linkedEntityType: body.linkedEntityType ?? null,
      linkedEntityId: body.linkedEntityId ? toOid(body.linkedEntityId) : null,
      tenantId: body.tenantId ?? null,
      uploadedBy: uploadedBy ? toOid(uploadedBy) : null,
    };

    const created = await this.files.createWithSession(doc, undefined);
    return serializeStoredFile(created);
  }

  /**
   * @param {import('zod').infer<typeof import('./files.validation.js').listStoredFilesQuerySchema>} query
   */
  async listMetadata(query) {
    const { skip, limit } = toOffsetLimit(query);
    const { items, total } = await this.files.findPage({
      skip,
      limit,
      sort: query.sort,
      search: query.search,
      from: query.from,
      to: query.to,
      tenantId: query.tenantId,
      provider: query.provider,
      purpose: query.purpose,
      folder: query.folder,
      linkedEntityType: query.linkedEntityType,
      linkedEntityId: query.linkedEntityId,
      uploadedBy: query.uploadedBy,
    });

    return {
      items: items.map((r) => serializeStoredFile(r)),
      page: query.page,
      limit: query.limit,
      total,
    };
  }

  /**
   * @param {string} id
   */
  async getMetadataById(id) {
    const row = await this.files.findByIdLean(id);
    if (!row) throw new NotFoundError('File metadata not found');
    return serializeStoredFile(row);
  }

  /**
   * @param {string} id
   */
  async deleteMetadata(id) {
    const res = await this.files.softDeleteByIdLean(id, undefined);
    if (!res.modifiedCount) throw new NotFoundError('File metadata not found');
    return { ok: true };
  }
}

export const filesMetadataService = new FilesMetadataService();
