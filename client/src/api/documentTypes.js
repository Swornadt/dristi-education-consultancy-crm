import api from './client';
import { unwrapList } from './helpers';
import { USE_MOCK } from './mode';
import * as mock from '../mocks/documentTypes';

// GET leads/document-types -> [{ id, name, inDefaultChecklist }]
export const listDocumentTypes = () =>
  USE_MOCK ? mock.listDocumentTypes() : api.get('leads/document-types').then((r) => unwrapList(r.data));
