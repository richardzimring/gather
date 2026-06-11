import * as Contacts from 'expo-contacts';

export class ContactsPermissionError extends Error {
  constructor() {
    super('Contacts permission was not granted');
    this.name = 'ContactsPermissionError';
  }
}

export interface DeviceContact {
  name: string;
  phone: string;
}

/** Derive up to two initials from a contact display name. */
export function getContactInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

async function loadContacts(
  fields: Contacts.FieldType[],
): Promise<Contacts.Contact[]> {
  const { status } = await Contacts.requestPermissionsAsync();
  if (status !== 'granted') {
    throw new ContactsPermissionError();
  }

  const { data } = await Contacts.getContactsAsync({ fields });
  return data;
}

/**
 * Requests contacts permission and returns a de-duplicated list of phone
 * numbers from the device address book. Throws ContactsPermissionError if the
 * user denies access.
 */
export async function getContactPhones(): Promise<string[]> {
  const data = await loadContacts([Contacts.Fields.PhoneNumbers]);

  const phones = new Set<string>();
  for (const contact of data) {
    for (const entry of contact.phoneNumbers ?? []) {
      if (entry.number) phones.add(entry.number);
    }
  }
  return [...phones];
}

/**
 * Requests contacts permission and returns contacts that have at least one
 * phone number, flattened to one entry per number. Used for inviting people who
 * are not yet on Gather.
 */
export async function getContactsWithPhones(): Promise<DeviceContact[]> {
  const data = await loadContacts([
    Contacts.Fields.PhoneNumbers,
    Contacts.Fields.Name,
  ]);

  const results: DeviceContact[] = [];
  const seen = new Set<string>();
  for (const contact of data) {
    const name = contact.name?.trim() || 'Unknown';
    for (const entry of contact.phoneNumbers ?? []) {
      if (entry.number && !seen.has(entry.number)) {
        seen.add(entry.number);
        results.push({ name, phone: entry.number });
      }
    }
  }
  return results.sort((a, b) => a.name.localeCompare(b.name));
}
