import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { reportError, reportApiError } from '../services/errorReporter';

const PRODUCTION_URL = 'https://venkeyschoolapp-updated.replit.app';
const API_BASE = Platform.OS === 'web' ? '/api' : `${PRODUCTION_URL}/api`;

const RETRY_COUNT = 2;
const RETRY_DELAY = 1500;
const REQUEST_TIMEOUT = 15000;

function fetchWithTimeout(url, options, timeout = REQUEST_TIMEOUT) {
  return Promise.race([
    fetch(url, options),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Request timed out. Please check your internet connection.')), timeout)
    ),
  ]);
}

async function fetchWithRetry(url, options, retries = RETRY_COUNT) {
  let lastError;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetchWithTimeout(url, options);
      return res;
    } catch (err) {
      lastError = err;
      if (attempt < retries) {
        await new Promise(r => setTimeout(r, RETRY_DELAY * (attempt + 1)));
      }
    }
  }
  throw lastError;
}

export async function apiFetch(path, options = {}) {
  const token = await AsyncStorage.getItem('authToken');
  const isFormData = options.body instanceof FormData;

  const headers = {
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const res = await fetchWithRetry(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  if (res.status === 401) {
    await AsyncStorage.multiRemove(['authToken', 'schoolId', 'userData']);
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
    
    const res = await fetchWithRetry(`${API_BASE}${endpoint}`, options);
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

export async function registerUser({ fullName, email, password, role, roleId, schoolId }) {
  return handleApiCall('/register', 'POST', { fullName, email, password, role, roleId, schoolId });
}

export async function loginUser({ email, password }) {
  return handleApiCall('/login', 'POST', { email, password });
}

export async function forgotPassword({ email }) {
  return handleApiCall('/forgot-password', 'POST', { email });
}
