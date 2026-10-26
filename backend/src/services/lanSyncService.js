/**
 * No-op LAN Sync Service Stub
 * LAN Sync has been completely removed.
 */
export const lanSyncService = {
  _log: () => {},
  broadcastOrder: () => {},
  broadcastCatalogUpdate: () => {},
  startBackgroundRetries: () => {},
  stopBackgroundRetries: () => {}
};

export default lanSyncService;
