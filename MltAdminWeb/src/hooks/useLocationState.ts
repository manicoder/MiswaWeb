import { useMemo } from 'react';

export interface LocationState<T> {
  data: T;
  hasMore: boolean;
  cursor?: string;
  isLoaded: boolean;
}

export interface LocationStateMap<T> {
  inventoryByLocation: Record<string, T[]>;
  hasMoreByLocation: Record<string, boolean>;
  cursorsByLocation: Record<string, string>;
  loadedLocations: Set<string>;
}

/**
 * Custom hook for managing location-based state with type safety
 * @param locationId The current location ID
 * @param state The location state map containing all locations' data
 * @param defaultValue Default value to return when location is not found
 * @returns LocationState object containing the data and metadata for the location
 */
export function useLocationState<T>(
  locationId: string | null,
  state: LocationStateMap<T>,
  defaultValue: T[] = [],
): LocationState<T[]> {
  return useMemo(() => {
    if (!locationId) {
      return {
        data: defaultValue,
        hasMore: false,
        cursor: undefined,
        isLoaded: false,
      };
    }

    return {
      data: state.inventoryByLocation[locationId] || defaultValue,
      hasMore: state.hasMoreByLocation[locationId] || false,
      cursor: state.cursorsByLocation[locationId],
      isLoaded: state.loadedLocations.has(locationId),
    };
  }, [locationId, state, defaultValue]);
}

/**
 * Helper function to create initial location state
 * @returns Empty location state map
 */
export function createInitialLocationState<T>(): LocationStateMap<T> {
  return {
    inventoryByLocation: {},
    hasMoreByLocation: {},
    cursorsByLocation: {},
    loadedLocations: new Set(),
  };
}

/**
 * Helper function to update location state
 * @param state Current location state map
 * @param locationId Location ID to update
 * @param data New data for the location
 * @param metadata Additional metadata for the location
 * @returns Updated location state map
 */
export function updateLocationState<T>(
  state: LocationStateMap<T>,
  locationId: string,
  data: T[],
  metadata: {
    loadMore?: boolean;
    hasMore?: boolean;
    cursor?: string;
  } = {},
): LocationStateMap<T> {
  const { loadMore = false, hasMore = false, cursor } = metadata;

  return {
    inventoryByLocation: {
      ...state.inventoryByLocation,
      [locationId]: loadMore ? [...(state.inventoryByLocation[locationId] || []), ...data] : data,
    },
    hasMoreByLocation: {
      ...state.hasMoreByLocation,
      [locationId]: hasMore,
    },
    cursorsByLocation: {
      ...state.cursorsByLocation,
      [locationId]: cursor || state.cursorsByLocation[locationId],
    },
    loadedLocations: new Set([...state.loadedLocations, locationId]),
  };
}
