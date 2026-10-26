export const ROUTE_PERMISSIONS: Record<string, string> = {
  '/': 'VIEW_DASHBOARD',
  '/dashboard': 'VIEW_DASHBOARD',
  '/pos': 'VIEW_POS',
  '/orders': 'VIEW_ORDERS',
  '/reports': 'VIEW_REPORTS',
  '/kds': 'VIEW_KITCHEN',
  '/lcd': 'VIEW_KITCHEN',
  '/products': 'VIEW_PRODUCTS',
  '/categories': 'VIEW_CATEGORIES',
  '/customers': 'VIEW_CUSTOMERS',
  '/tables': 'VIEW_TABLES',
  '/settings': 'VIEW_SETTINGS',
  '/permissions': 'VIEW_USERS',
  '/notifications': 'VIEW_DASHBOARD',
  '/receipt': 'VIEW_ORDERS',
}

export const ROUTE_FALLBACK_ORDER = [
  '/pos',
  '/orders',
  '/kds',
  '/dashboard',
  '/reports',
  '/products',
]
