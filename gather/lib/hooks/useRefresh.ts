import type { UseQueryResult } from '@tanstack/react-query';

/**
 * Combines multiple React Query results into a single refresh handler for pull-to-refresh.
 *
 * @example
 * const eventsQuery = useEvents()
 * const { isRefreshing, onRefresh } = useRefresh(eventsQuery)
 *
 * @example
 * // Multiple queries
 * const friendsQuery = useFriends()
 * const groupsQuery = useGroups()
 * const { isRefreshing, onRefresh } = useRefresh(friendsQuery, groupsQuery)
 */
export function useRefresh(...queries: UseQueryResult<any, any>[]) {
  // Plain derivations — `queries` is a fresh array each render, so manual
  // memoization is pointless; the React Compiler memoizes these as needed.
  const isRefreshing = queries.some((q) => q.isRefetching);

  const onRefresh = () => {
    queries.forEach((q) => q.refetch());
  };

  return { isRefreshing, onRefresh };
}
