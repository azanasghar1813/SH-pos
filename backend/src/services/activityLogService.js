/**
 * No-op Activity Log Service Stub
 * Activity logs have been completely removed.
 * All logging operations do nothing and take zero database space.
 */
export const activityLogService = {
  logActivity: () => {},
  getLogs: () => []
};

export default activityLogService;
