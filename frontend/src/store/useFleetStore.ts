import { create } from 'zustand';
import type { FleetDict } from '../types/fleet';

export type AppPage = 'fleet' | 'map' | 'missions' | 'settings';

interface FleetState {
  fleet: FleetDict;
  isConnected: boolean;
  selectedAgv: string | null;

  // UI
  activePage: AppPage;
  language: 'en' | 'ko';

  // Actions
  updateFleet: (newFleet: FleetDict) => void;
  setConnected: (status: boolean) => void;
  setSelectedAgv: (serial: string | null) => void;
  setActivePage: (page: AppPage) => void;
  setLanguage: (lang: 'en' | 'ko') => void;
}

const LS_LANGUAGE_KEY = 'mowbotfleet.language';

function loadLanguage(): 'en' | 'ko' {
  const raw = localStorage.getItem(LS_LANGUAGE_KEY);
  return raw === 'ko' ? 'ko' : 'en';
}

export const useFleetStore = create<FleetState>((set) => ({
  fleet: {},
  isConnected: false,
  selectedAgv: null,
  activePage: 'map',
  language: loadLanguage(),

  updateFleet: (newFleet) => set({ fleet: newFleet }),
  setConnected: (status) => set({ isConnected: status }),
  setSelectedAgv: (serial) => set({ selectedAgv: serial }),
  setActivePage: (page) => set({ activePage: page }),
  setLanguage: (lang) => {
    localStorage.setItem(LS_LANGUAGE_KEY, lang);
    set({ language: lang });
  },
}));
