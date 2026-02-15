import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";

import { postBusyTimes } from "../api/client";
import type { BusyTimeInterval } from "../api/generated/types.gen";
import {
  computeCommonFreeTimeSlots,
  type CommonFreeTimeSlot,
} from "../utils/availability";

export const busyTimesKeys = {
  all: ["busy-times"] as const,
  query: (userIds: string[], startDate: string, endDate: string) =>
    [...busyTimesKeys.all, ...userIds.sort(), startDate, endDate] as const,
};

/**
 * Hook to query busy times for specific users, then compute
 * common free time slots client-side.
 *
 * Fetches per-user busy intervals from POST /busy-times,
 * then uses `computeCommonFreeTimeSlots` to generate the
 * snapped 30-minute slot suggestions (identical output shape
 * to the old useFreeTime hook).
 *
 * Returns:
 * - `query`: the raw React Query result (pass to useRefresh)
 * - `data`: computed CommonFreeTimeSlot[] (or undefined if not yet loaded)
 */
export function useBusyTimes(
  userIds: string[],
  startDate: string,
  endDate: string,
  durationMinutes: number,
  enabled = true,
) {
  const query = useQuery<Record<string, BusyTimeInterval[]>>({
    queryKey: busyTimesKeys.query(userIds, startDate, endDate),
    queryFn: async () => {
      const response = await postBusyTimes({
        body: { userIds, startDate, endDate },
      });
      if (!response.data?.success) {
        throw new Error("Failed to fetch busy times");
      }
      return response.data.data.busyTimes;
    },
    enabled: enabled && userIds.length > 0 && !!startDate && !!endDate,
  });

  // Compute slots client-side from the busy times
  const slots = useMemo<CommonFreeTimeSlot[]>(() => {
    if (!query.data) return [];
    return computeCommonFreeTimeSlots(
      query.data,
      startDate,
      endDate,
      durationMinutes,
    );
  }, [query.data, startDate, endDate, durationMinutes]);

  return {
    query,
    data: query.data ? slots : undefined,
  };
}
