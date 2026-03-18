// src/store/useFleetStore.ts
import { create } from 'zustand';
import { AGVInfo, FleetDict } from '../types/fleet';

interface FleetState {
  fleet: FleetDict;
  isConnected: boolean;
  selectedAgv: string | null;
  
  // Actions
  updateFleet: (newFleet: FleetDict) => void;
  setConnected: (status: boolean) => void;
  setSelectedAgv: (serial: string | null) => void;
}

export const useFleetStore = create<FleetState>((set, get) => ({
  fleet: {},
  isConnected: false,
  selectedAgv: null,

  updateFleet: (newFleet) => set({ fleet: newFleet }),
  setConnected: (status) => set({ isConnected: status }),
  setSelectedAgv: (serial) => set({ selectedAgv: serial }),
}));