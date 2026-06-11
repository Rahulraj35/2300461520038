const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://4.224.186.213/evaluation-service';

export async function authenticate({
  email,
  name,
  rollNo,
  clientID,
  clientSecret,
  accessCode
}) {
  try {
    const response = await fetch(`${API_BASE_URL}/auth`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email,
        name,
        rollNo,
        clientID,
        clientSecret,
        accessCode
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.message || 
        (errorData.errors && JSON.stringify(errorData.errors)) || 
        `Authentication failed with status ${response.status}`
      );
    }

    const data = await response.json();
    // Save token to localStorage for persistence
    localStorage.setItem('affordmed_token', data.access_token);
    localStorage.setItem('affordmed_token_expiry', Date.now() + (data.expires_in * 1000));
    return data;
  } catch (error) {
    console.error('Authentication Error:', error);
    throw error;
  }
}

export async function fetchNotifications(customToken = null) {
  const token = customToken || localStorage.getItem('affordmed_token');
  if (!token) {
    throw new Error('No authorization token available. Please authenticate first.');
  }

  try {
    const response = await fetch(`${API_BASE_URL}/notifications`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      if (response.status === 401) {
        // Clear expired/invalid token
        localStorage.removeItem('affordmed_token');
        localStorage.removeItem('affordmed_token_expiry');
      }
      throw new Error(`Failed to fetch notifications: ${response.statusText} (${response.status})`);
    }

    const data = await response.json();
    return data.notifications || [];
  } catch (error) {
    console.error('Fetch Notifications Error:', error);
    throw error;
  }
}

export function isTokenValid() {
  const token = localStorage.getItem('affordmed_token');
  const expiry = localStorage.getItem('affordmed_token_expiry');
  if (!token || !expiry) return false;
  return Date.now() < parseInt(expiry, 10);
}

export function logout() {
  localStorage.removeItem('affordmed_token');
  localStorage.removeItem('affordmed_token_expiry');
}
