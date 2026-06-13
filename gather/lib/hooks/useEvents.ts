import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import {
  getEvents,
  getEventsByEventId,
  postEvents,
  patchEventsByEventId,
  deleteEventsByEventId,
  postEventsByEventIdRespond,
  type CreateEvent,
  type UpdateEvent,
  type EventResponse,
} from '../api/client';

export const eventsKeys = {
  all: ['events'] as const,
  list: () => [...eventsKeys.all, 'list'] as const,
  detail: (id: string) => [...eventsKeys.all, 'detail', id] as const,
};

/**
 * Hook to fetch all events for the current user.
 */
export function useEvents() {
  return useQuery({
    queryKey: eventsKeys.list(),
    queryFn: async () => {
      const { data } = await getEvents();
      return data.data.events;
    },
  });
}

/**
 * Hook to fetch a specific event by ID.
 */
export function useEvent(eventId: string) {
  return useQuery({
    queryKey: eventsKeys.detail(eventId),
    queryFn: async () => {
      const { data } = await getEventsByEventId({ path: { eventId } });
      return data.data.event;
    },
    enabled: !!eventId,
  });
}

/**
 * Hook to create a new event.
 */
export function useCreateEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateEvent) => {
      const { data: res } = await postEvents({ body: data });
      return res.data.event;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: eventsKeys.list() });
    },
  });
}

/**
 * Hook to update an event.
 */
export function useUpdateEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      eventId,
      data,
    }: {
      eventId: string;
      data: UpdateEvent;
    }) => {
      const { data: res } = await patchEventsByEventId({
        path: { eventId },
        body: data,
      });
      return res.data.event;
    },
    onSuccess: (_, { eventId }) => {
      queryClient.invalidateQueries({ queryKey: eventsKeys.list() });
      queryClient.invalidateQueries({ queryKey: eventsKeys.detail(eventId) });
    },
  });
}

/**
 * Hook to cancel/delete an event.
 */
export function useCancelEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (eventId: string) => {
      await deleteEventsByEventId({ path: { eventId } });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: eventsKeys.list() });
    },
  });
}

/**
 * Hook to respond to an event invitation.
 */
export function useRespondToEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      eventId,
      response,
    }: {
      eventId: string;
      response: EventResponse;
    }) => {
      const { data } = await postEventsByEventIdRespond({
        path: { eventId },
        body: response,
      });
      return data.data.event;
    },
    onSuccess: (_, { eventId }) => {
      queryClient.invalidateQueries({ queryKey: eventsKeys.list() });
      queryClient.invalidateQueries({ queryKey: eventsKeys.detail(eventId) });
    },
  });
}
