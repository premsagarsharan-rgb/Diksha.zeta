// lib/validate.js
import { ObjectId } from "mongodb";

export function isValidObjectId(id) {
  if (!id || typeof id !== "string") return false;
  return ObjectId.isValid(id) && new ObjectId(id).toString() === id;
}

export function validateIds(ids, { maxCount = 100 } = {}) {
  if (!ids || !Array.isArray(ids)) {
    return { valid: false, ids: [], error: "IDs must be an array" };
  }
  if (ids.length === 0) {
    return { valid: false, ids: [], error: "At least one ID required" };
  }
  if (ids.length > maxCount) {
    return { valid: false, ids: [], error: `Maximum ${maxCount} IDs allowed` };
  }

  const unique = [...new Set(ids)];
  const invalid = unique.filter((id) => !isValidObjectId(id));
  if (invalid.length > 0) {
    return { valid: false, ids: [], error: `Invalid ID(s): ${invalid.slice(0, 3).join(", ")}` };
  }

  return { valid: true, ids: unique };
}

export async function parseBody(req) {
  try {
    const text = await req.text();
    if (!text) return { data: null, error: "Empty request body" };
    const data = JSON.parse(text);
    return { data, error: null };
  } catch {
    return { data: null, error: "Invalid JSON body" };
  }
}
