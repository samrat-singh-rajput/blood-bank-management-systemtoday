
/**
 * DB Service
 * Utilizing LocalStorage for persistence across the application.
 */
export const DB = {
  init: () => {
    console.log("Local Storage Persistence Active.");
  },

  // Helper for fast UI retrieval of current user metadata
  getSessionUser: () => {
    const saved = localStorage.getItem('lifeflow_current_user');
    return saved ? JSON.parse(saved) : null;
  },

  clearSession: () => {
    localStorage.removeItem('lifeflow_current_user');
  }
};
