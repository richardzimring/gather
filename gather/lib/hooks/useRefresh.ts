import { useCallback, useMemo } from 'react'
import type { UseQueryResult } from '@tanstack/react-query'

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
  const isRefreshing = useMemo(
    () => queries.some((q) => q.isRefetching),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [queries.map((q) => q.isRefetching).join(',')]
  )

  const onRefresh = useCallback(() => {
    queries.forEach((q) => q.refetch())
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queries.length])

  return { isRefreshing, onRefresh }
}
