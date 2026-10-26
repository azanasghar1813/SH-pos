/**
 * No-op Sync Service Stub
 * Cloud & LAN Sync have been completely removed.
 * Calls to queueSyncEvent or syncService do nothing.
 */
export const syncService = {
  queueSyncEvent: () => {},
  purgeAllSyncQueue: () => {},
  getSyncQueueStatus: () => ({ pendingCount: 0, failedCount: 0 }),
  triggerSync: async () => ({ success: true, processed: 0 })
};

export default syncService;
