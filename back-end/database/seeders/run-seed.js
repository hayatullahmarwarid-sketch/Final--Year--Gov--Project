import { seedRoles } from './role.seeder.js';

/**
 * Entry point for coordinated seed runs (extend with more seeders over time).
 */
export async function runAllSeeders() {
  const roles = await seedRoles();
  return { roles };
}
