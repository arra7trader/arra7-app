'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { usePathname } from 'next/navigation';

export interface PicaDeviceState {
  deviceId: string;
  tier: 'BASIC' | 'PRO' | 'VVIP';
  tierExpiresAt: string | null;
  daysLeft: number;
  isExpired: boolean;
  isLoading: boolean;
  isVvip: boolean;
  isPro: boolean;
  isActivationOpen: boolean;
  openActivation: () => void;
  closeActivation: () => void;
  redeemKey: (code: string) => Promise<{ success: boolean; message: string; tier?: string }>;
  refreshStatus: () => Promise<void>;
}

const PicaDeviceContext = createContext<PicaDeviceState | null>(null);

function getOrCreateDeviceId(): string {
  if (typeof window === 'undefined') return '';

  const storageKey = 'pica_device_id';
  let id = localStorage.getItem(storageKey);

  if (!id) {
    // Generate persistent UUID
    const randomPart = Math.random().toString(36).substring(2, 10) + Math.random().toString(36).substring(2, 10);
    id = `pica_dev_${randomPart}`;
    try {
      localStorage.setItem(storageKey, id);
      document.cookie = `pica_device_id=${id}; path=/; max-age=315360000; SameSite=Lax`;
    } catch (e) {
      console.warn('Storage quota or private mode', e);
    }
  }

  return id;
}

export function PicaDeviceProvider({ children }: { children: ReactNode }) {
  const [deviceId, setDeviceId] = useState<string>('');
  const [tier, setTier] = useState<'BASIC' | 'PRO' | 'VVIP'>('BASIC');
  const [tierExpiresAt, setTierExpiresAt] = useState<string | null>(null);
  const [daysLeft, setDaysLeft] = useState<number>(0);
  const [isExpired, setIsExpired] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isActivationOpen, setIsActivationOpen] = useState<boolean>(false);

  const pathname = usePathname();

  // 1. Initialize Device ID & fetch status
  const fetchStatus = useCallback(async (devId: string) => {
    if (!devId) return;
    try {
      const res = await fetch(`/api/license/status?deviceId=${encodeURIComponent(devId)}`);
      const json = await res.json();
      if (json.status === 'success' && json.data) {
        setTier(json.data.tier || 'BASIC');
        setTierExpiresAt(json.data.tierExpiresAt || null);
        setDaysLeft(json.data.daysLeft || 0);
        setIsExpired(json.data.isExpired || false);
      }
    } catch (err) {
      console.warn('Failed to fetch device status:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const id = getOrCreateDeviceId();
    setDeviceId(id);
    fetchStatus(id);
  }, [fetchStatus]);

  // 2. Background telemetry tracking on route changes
  useEffect(() => {
    if (!deviceId) return;
    try {
      fetch('/api/tracking/device', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deviceId,
          path: pathname || '/',
          action: 'NAVIGATE',
        }),
      }).catch(() => {});
    } catch (_) {}
  }, [deviceId, pathname]);

  // 3. Redeem license key
  const redeemKey = async (code: string) => {
    if (!deviceId) {
      return { success: false, message: 'ID Perangkat tidak siap. Refresh halaman.' };
    }

    try {
      const res = await fetch('/api/license/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: code.trim(), deviceId }),
      });
      const data = await res.json();

      if (data.status === 'success') {
        await fetchStatus(deviceId);
        return {
          success: true,
          message: data.message,
          tier: data.data?.tier,
        };
      } else {
        return {
          success: false,
          message: data.message || 'Kode lisensi gagal divalidasi.',
        };
      }
    } catch (err: any) {
      return {
        success: false,
        message: err?.message || 'Terjadi kesalahan jaringan saat aktivasi.',
      };
    }
  };

  const openActivation = () => setIsActivationOpen(true);
  const closeActivation = () => setIsActivationOpen(false);

  const value: PicaDeviceState = {
    deviceId,
    tier,
    tierExpiresAt,
    daysLeft,
    isExpired,
    isLoading,
    isVvip: tier === 'VVIP',
    isPro: tier === 'PRO' || tier === 'VVIP',
    isActivationOpen,
    openActivation,
    closeActivation,
    redeemKey,
    refreshStatus: () => fetchStatus(deviceId),
  };

  return (
    <PicaDeviceContext.Provider value={value}>
      {children}
    </PicaDeviceContext.Provider>
  );
}

export function usePicaDevice(): PicaDeviceState {
  const context = useContext(PicaDeviceContext);
  if (!context) {
    throw new Error('usePicaDevice must be used within a PicaDeviceProvider');
  }
  return context;
}
