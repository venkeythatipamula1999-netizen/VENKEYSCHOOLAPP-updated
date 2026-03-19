import AsyncStorage from '@react-native-async-storage/async-storage';
import { reportError, reportApiError } from '../services/errorReporter';

const API_BASE = 'https://venkeyschoolapp-updated-production.up.railway.app/api';

export async function apiFetch(path, options = {}) {
  const token = await AsyncStorage.getItem('authToken');
  const isFormData = options.body instanceof FormData;

  const headers = {
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  if (res.status === 401) {
    await AsyncStorage.removeItem('authToken');
    await AsyncStorage.removeItem('schoolId');
    if (typeof global.__onAuthExpired === 'function') {
      global.__onAuthExpired();
    }
  }

  return res;
}

async function handleApiCall(endpoint, method, body) {
  try {
    const token = await AsyncStorage.getItem('authToken');
    const headers = {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    };
    const options = { method, headers };
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
