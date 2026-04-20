import axios from 'axios';

const API = axios.create({
  baseURL: 'http://localhost:8000/api',
});

// ============================================
// INTERVENTION API
// ============================================

export const getInterventions = async () => {
  try {
    const response = await API.get('/interventions');
    return response.data;
  } catch (error) {
    console.error('Error fetching interventions:', error);
    return { interventions: [] };
  }
};

export const createIntervention = async (data) => {
  try {
    const response = await API.post('/interventions', data);
    return response.data;
  } catch (error) {
    console.error('Error creating intervention:', error);
    throw error;
  }
};

export const updateIntervention = async (id, data) => {
  try {
    const response = await API.put(`/interventions/${id}`, data);
    return response.data;
  } catch (error) {
    console.error('Error updating intervention:', error);
    throw error;
  }
};

export const deleteIntervention = async (id) => {
  try {
    const response = await API.delete(`/interventions/${id}`);
    return response.data;
  } catch (error) {
    console.error('Error deleting intervention:', error);
    throw error;
  }
};

export const getStats = async () => {
  try {
    const response = await API.get('/interventions/stats/summary');
    return response.data;
  } catch (error) {
    console.error('Error fetching stats:', error);
    return { stats: { total: 0, open: 0, completed: 0, high_priority: 0 } };
  }
};

// ============================================
// STUDENT API
// ============================================

export const getStudents = async () => {
  try {
    const response = await API.get('/students');
    return response.data;
  } catch (error) {
    console.error('Error fetching students:', error);
    return { students: [] };
  }
};

export const getPredictions = async (studentId) => {
  try {
    const response = await API.get(`/predictions/${studentId}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching predictions:', error);
    return { predictions: [] };
  }
};

export default API;