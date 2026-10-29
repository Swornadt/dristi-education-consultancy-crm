import { ASSIGNABLE_USERS, COUNTRIES } from './data';

const delay = (ms = 120) => new Promise((resolve) => setTimeout(resolve, ms));

export async function listCountries() {
  await delay();
  return COUNTRIES.map((c) => ({ ...c, isActive: true }));
}

export async function listAssignableUsers() {
  await delay();
  return ASSIGNABLE_USERS.map((u) => ({ ...u }));
}
