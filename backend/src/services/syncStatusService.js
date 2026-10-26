/**
 * No-op Sync Status Service Stub
 * Cloud Sync has been completely removed.
 */
export const syncStatusService = {
  getOrderSyncStatus: () => ({ status: 'LOCAL_ONLY', isSynced: true }),
  getSyncHealth: () => ({ isHealthy: true }),
  getStatus: () => ({ status: 'IDLE' })
};

export default syncStatusService;
