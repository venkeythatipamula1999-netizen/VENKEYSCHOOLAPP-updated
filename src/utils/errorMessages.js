export function getFriendlyError(error, fallback = 'Something went wrong. Please try again.') {
  if (!error) return fallback;

  const msg = typeof error === 'string'
    ? error.toLowerCase()
    : (error.message || '').toLowerCase();

  if (msg.includes('network') || msg.includes('fetch') || msg.includes('failed to fetch')) {
    return 'No internet connection. Please check your network and try again.';
  }
  if (msg.includes('timeout')) {
    return 'Request timed out. Please try again.';
  }

  if (msg.includes('unauthorized') || msg.includes('401')) {
    return 'Your session has expired. Please log in again.';
  }
  if (msg.includes('forbidden') || msg.includes('403')) {
    return 'You don\'t have permission to do this.';
  }

  if (msg.includes('not found') || msg.includes('404')) {
    return 'The requested information was not found.';
  }
  if (msg.includes('already exists') || msg.includes('duplicate')) {
    return 'This record already exists.';
  }

  if (msg.includes('500') || msg.includes('server error')) {
    return 'Server error. Please try again in a moment.';
  }

  if (msg.includes('required') || msg.includes('invalid') || msg.includes('must be')) {
    return error.message || error;
  }

  return fallback;
}
