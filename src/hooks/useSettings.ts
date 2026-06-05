'use client';

import { useState, useEffect } from 'react';
import type { ViewMode, FontSizePreset } from '@/types';

interface Settings {
  fontSize: FontSizePreset;
  viewMode: ViewMode;
}

const DEFAULT_SETTINGS: Settings = {
  fontSize: 'md',
  viewMode: 'chords_and_lyrics',
};

const fontSizes: FontSizePreset[] = ['sm', 'md', 'lg', 'xl', '2xl'];

export function useSettings() {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    try {
      const stored = localStorage.getItem('@ipi-worship:settings');
      if (stored) {
        setSettings(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  }, []);

  const updateSettings = (updates: Partial<Settings>) => {
    setSettings((prev) => {
      const newSettings = { ...prev, ...updates };
      try {
        localStorage.setItem('@ipi-worship:settings', JSON.stringify(newSettings));
      } catch (error) {
        console.error('Failed to save settings:', error);
      }
      return newSettings;
    });
  };

  const increaseFontSize = () => {
    setSettings((prev) => {
      const currentIndex = fontSizes.indexOf(prev.fontSize);
      if (currentIndex < fontSizes.length - 1) {
        const newSettings = { ...prev, fontSize: fontSizes[currentIndex + 1] };
        localStorage.setItem('@ipi-worship:settings', JSON.stringify(newSettings));
        return newSettings;
      }
      return prev;
    });
  };

  const decreaseFontSize = () => {
    setSettings((prev) => {
      const currentIndex = fontSizes.indexOf(prev.fontSize);
      if (currentIndex > 0) {
        const newSettings = { ...prev, fontSize: fontSizes[currentIndex - 1] };
        localStorage.setItem('@ipi-worship:settings', JSON.stringify(newSettings));
        return newSettings;
      }
      return prev;
    });
  };

  const setViewMode = (mode: ViewMode) => {
    updateSettings({ viewMode: mode });
  };
  
  const setFontSize = (size: FontSizePreset) => {
    updateSettings({ fontSize: size });
  };

  return {
    ...settings,
    mounted,
    increaseFontSize,
    decreaseFontSize,
    setViewMode,
    setFontSize,
  };
}
