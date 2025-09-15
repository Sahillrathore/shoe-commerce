// src/utils/api.js
import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_BACKEND_URL || "http://localhost:5000/api",
  withCredentials: true, // if you’re using cookies/auth
  headers: {
    "Content-Type": "application/json",
  },
});

export default api;
