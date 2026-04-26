import axios from 'axios';

const BASE = process.env.REACT_APP_API_URL || '';

export const api = {
  uploadPDF: async (file) => {
    const form = new FormData();
    form.append('file', file);
    const res = await axios.post(`${BASE}/api/upload-pdf`, form);
    return res.data.text;
  },

  analyze: async (jdText, resumeText) => {
    const res = await axios.post(`${BASE}/api/analyze`, {
      jd_text: jdText,
      resume_text: resumeText,
    });
    return res.data;
  },

  startAssessment: async (sessionId, skill) => {
    const res = await axios.post(`${BASE}/api/start-assessment`, {
      session_id: sessionId,
      skill,
    });
    return res.data;
  },

  chat: async (sessionId, message) => {
    const res = await axios.post(`${BASE}/api/chat`, {
      session_id: sessionId,
      message,
    });
    return res.data;
  },

  generatePlan: async (sessionId) => {
    const res = await axios.post(`${BASE}/api/generate-plan`, {
      session_id: sessionId,
      skill: '',
    });
    return res.data;
  },
};
