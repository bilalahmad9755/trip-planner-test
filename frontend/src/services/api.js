import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

export const planTrip = async (tripData) => {
  try {
    const response = await api.post('/plan-trip/', tripData);
    return response.data;
  } catch (error) {
    const message = error.response?.data 
      ? JSON.stringify(error.response.data) 
      : error.message;
    console.error('API Error:', message);
    throw new Error(message, { cause: error });
  }
};

export default api;
