/**
 * Validate handle format (3–20 chars, lowercase letters, numbers, underscore only).
 * Pure function; no DOM or storage.
 */
export function validateHandle(handle: string): { valid: boolean; error?: string } {
  const trimmed = handle.trim();

  if (trimmed.length < 3) {
    return { valid: false, error: 'Handle must be at least 3 characters' };
  }

  if (trimmed.length > 20) {
    return { valid: false, error: 'Handle must be at most 20 characters' };
  }

  if (!/^[a-z0-9_]+$/.test(trimmed)) {
    return { valid: false, error: 'Handle can only contain lowercase letters, numbers, and underscores' };
  }

  return { valid: true };
}
