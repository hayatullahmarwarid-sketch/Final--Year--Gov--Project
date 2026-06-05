import { API_VERSION } from '../shared/constants/api.js';

export class SuperAdminService {
  getModuleMeta() {
    return {
      module: 'super-admin',
      apiVersion: API_VERSION,
      description: 'System administration operations (roles, audits, global settings).',
    };
  }
}

export const superAdminService = new SuperAdminService();
