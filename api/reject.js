// api/reject.js
// POST /api/reject
// Re-export rejectHandler dari publish.js
import { rejectHandler } from './publish.js';

export default async function handler(req, res) {
  return rejectHandler(req, res);
}
