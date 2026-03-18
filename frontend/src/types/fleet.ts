// src/types/fleet.ts

export interface ErrorInfo {
    timestamp: string;
    type: string;
    description: string;
    severity: string; // "WARNING" or "FATAL"
  }
  
  export interface AGVInfo {
    serial: string;
    manufacturer: string;
    connection: string;
    battery: number;
    operating_mode: string;
    position: [number, number]; // [longitude, latitude]
    theta: number;
    last_update: string;
    connect_timestamp: number;
    current_order: string | null;
    errors: ErrorInfo[];
    sensor_status: Record<string, string> | null;
  }
  
  export type FleetDict = Record<string, AGVInfo>;