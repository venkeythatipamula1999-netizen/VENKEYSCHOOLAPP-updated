import { reportError, reportApiError } from '../services/errorReporter';

const API_BASE = '/api';

async function handleApiCall(endpoint, method, body) {
  try {
    const options = {
      method,
      headers: { 'Content-Type': 'application/json' },
    };
    if (body) {
      options.body = JSON.stringify(body);
    }
    
    const res = await fetch(`${API_BASE}${endpoint}`, options);
    const data = await res.json();
    
    if (!res.ok) {
      const errorMsg = data.error || `HTTP ${res.status}`;
      await reportApiError(endpoint, res.status, errorMsg);
      throw new Error(errorMsg);
    }
    return data;
  } catch (err) {
    if (err.message && err.message.includes('HTTP')) {
      throw err;
    }
    await reportError({
      type: 'api_error',
      severity: 'high',
      message: `Network error on ${endpoint}: ${err.message}`,
      details: err.message,
      screen: endpoint,
      source: 'auto'
    });
    throw new Error(`Network error: ${err.message}`);
  }
}

export async function registerUser({ fullName, email, password, role, roleId }) {
  return handleApiCall('/register', 'POST', { fullName, email, password, role, roleId });
}

export async function loginUser({ email, password }) {
  return handleApiCall('/login', 'POST', { email, password });
}

export async function forgotPassword({ email }) {
  return handleApiCall('/forgot-password', 'POST', { email });
}
