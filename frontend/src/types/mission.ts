export type Waypoint = [number, number]; // [longitude, latitude]

export interface MissionRoute {
  id: number;
  name: string;
  description: string;
  waypoints: Waypoint[];
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface MissionRouteCreate {
  name: string;
  description: string;
  waypoints: Waypoint[];
}
