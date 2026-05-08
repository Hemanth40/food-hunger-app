/**
 * Converts any backend error (Pydantic validation array, plain string, or network error)
 * into a safe, readable string for display in the UI.
 */
export function extractError(err, fallback = 'Something went wrong. Please try again.') {
  if (!err) return fallback;

  // Network timeout
  if (err.code === 'ECONNABORTED' || err.message?.includes('timeout')) {
    return 'Connection timed out. Make sure your phone and laptop are on the same Wi-Fi.';
  }

  // No response at all — server unreachable
  if (!err.response) {
    return `Cannot reach server. Is the backend running? (${err.message})`;
  }

  const detail = err.response?.data?.detail;
  if (!detail) return fallback;

  // Plain string
  if (typeof detail === 'string') return detail;

  // Pydantic validation error — array of { loc, msg, type, ... }
  if (Array.isArray(detail)) {
    return detail
      .map((d) => {
        const field = d.loc?.slice(-1)[0] ?? 'field';
        return `${field}: ${d.msg}`;
      })
      .join('\n');
  }

  // Fallback: stringify whatever is there
  return JSON.stringify(detail);
}
