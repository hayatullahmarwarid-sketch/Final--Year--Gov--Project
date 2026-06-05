/**
 * Generic data-access base. Domain repositories extend this and add queries.
 * @template {import('mongoose').Model} M
 */
export class BaseRepository {
  /**
   * @param {M} model
   */
  constructor(model) {
    this.model = model;
  }

  /**
   * @param {string} id
   */
  async findById(id) {
    return this.model.findById(id).lean();
  }

  /** Alias for callers that prefer explicit lean naming. */
  async findByIdLean(id) {
    return this.findById(id);
  }

  /**
   * @param {import('mongoose').FilterQuery<InstanceType<M>>} filter
   */
  async findOne(filter) {
    return this.model.findOne(filter).lean();
  }

  /**
   * @param {import('mongoose').FilterQuery<InstanceType<M>>} filter
   */
  async countDocuments(filter = {}) {
    return this.model.countDocuments(filter);
  }

  /**
   * @param {Partial<InstanceType<M>>} doc
   */
  async create(doc) {
    const created = await this.model.create(doc);
    return created.toObject();
  }
}
