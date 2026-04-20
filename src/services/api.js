import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000';

const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

export const explainStudent = async (studentId) => {
    try {
        const response = await api.post('/explain', { student_id: studentId });
        return response.data;
    } catch (error) {
        console.error('Explanation error:', error);
        throw error;
    }
};