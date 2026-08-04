import { useState, useEffect, useCallback } from 'react';
import { subscriptionService } from '../services/api';

/**
 * useSubscription — loads the caller's subscription tier + feature matrix
 * from /api/subscriptions/me and exposes a clean API for gating UI.
 *
 * The cache is keyed on the current auth token — so when the user logs
 * in/out/switches accounts, the correct tier is always fetched.
 */
let _cache = null;
let _cachedToken = null;

export function useSubscription() {
  const currentToken = typeof localStorage !== 'undefined' ? localStorage.getItem('token') : null;
  const [state, setState] = useState(_cache || {
    tier: null, status: null, displayName: '', planName: '', color: '#64748b',
    monthlyPrice: 0, storageUsedMb: 0, storageLimitMb: 10,
    features: [], loading: true, can: () => true,
  });

  const fetchSub = useCallback(async () => {
    const token = typeof localStorage !== 'undefined' ? localStorage.getItem('token') : null;
    if (!token) {
      // No token → fail open (public pages have no gating).
      const emptyState = { tier: null, loading: false, can: () => true, displayName: '', features: [] };
      _cache = emptyState;
      _cachedToken = null;
      setState(emptyState);
      return;
    }
    try {
      const res = await subscriptionService.getMe();
      const d = res.data;
      const featureMap = {};
      (d.features || []).forEach(f => { featureMap[f.key] = f.enabled; });

      const nextState = {
        tier: d.tier,
        status: d.status,
        displayName: d.display_name,
        planName: d.plan_name,
        color: d.color,
        monthlyPrice: d.monthly_price,
        storageUsedMb: d.storage_used_mb,
        storageLimitMb: d.storage_limit_mb,
        features: d.features || [],
        loading: false,
        can: (key) => d.tier === 'internal' ? true : !!featureMap[key],
      };
      _cache = nextState;
      _cachedToken = token;
      setState(nextState);
    } catch {
      // On error, fail open (don't block the UI).
      const failState = { tier: null, loading: false, can: () => true, displayName: '', features: [] };
      _cache = failState;
      _cachedToken = token;
      setState(failState);
    }
  }, []);

  useEffect(() => {
    // Refetch if: no cache yet, OR the token changed (login/logout/switch).
    if (!_cache || _cachedToken !== currentToken) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      fetchSub();
    }
  }, [fetchSub, currentToken]);

  const refresh = useCallback(() => {
    _cache = null;
    _cachedToken = null;
    fetchSub();
  }, [fetchSub]);

  return { ...state, refresh };
}

// Allow manual cache invalidation from outside the hook (e.g. after payment).
export function invalidateSubscriptionCache() {
  _cache = null;
  _cachedToken = null;
}
