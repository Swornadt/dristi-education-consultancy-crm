import { COUNTRIES } from './data';
import { getAssignableUsers } from './users';

const delay = (ms = 120) => new Promise((resolve) => setTimeout(resolve, ms));

export async function listCountries() {
  await delay();
  return COUNTRIES.map((c) => ({ ...c, isActive: true }));
}

export async function listAssignableUsers() {
  await delay();
  return getAssignableUsers();
}
