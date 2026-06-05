/**
 * Adds multi-tenant + soft-delete fields when missing, and a common list index.
 * Does not add `tenantId` if the schema already defines it (avoids duplicate path errors).
 *
 * @param {import('mongoose').Schema} schema
 * @param {{ withTenant?: boolean }} [options]
 */
export function standardDomainPlugin(schema, options = {}) {
  const withTenant = options.withTenant !== false;

  if (withTenant && !schema.paths.tenantId) {
    schema.add({
      tenantId: { type: String, trim: true, default: null, index: true, sparse: true },
    });
  }

  if (!schema.paths.isDeleted) {
    schema.add({
      isDeleted: { type: Boolean, default: false, index: true },
    });
  }

  if (!schema.paths.deletedAt) {
    schema.add({
      deletedAt: { type: Date, default: null, index: true },
    });
  }
}
