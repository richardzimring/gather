import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

import {
  getFriends,
  getFriendsSearch,
  getFriendsInviteCode,
  postFriendsRequest,
  postFriendsByFriendIdAccept,
  postFriendsByFriendIdDecline,
  deleteFriendsByFriendId,
  postFriendsByFriendIdBlock,
  deleteUsersMe,
} from '../api/client'

export const friendsKeys = {
  all: ['friends'] as const,
  list: () => [...friendsKeys.all, 'list'] as const,
  search: (query: string) => [...friendsKeys.all, 'search', query] as const,
  inviteCode: () => [...friendsKeys.all, 'invite-code'] as const,
}

/**
 * Hook to fetch all friends, pending requests, and sent requests.
 */
export function useFriends() {
  return useQuery({
    queryKey: friendsKeys.list(),
    queryFn: async () => {
      const response = await getFriends()
      if (!response.data?.success) {
        throw new Error('Failed to fetch friends')
      }
      return response.data.data
    },
  })
}

/**
 * Hook to search for users.
 */
export function useFriendsSearch(query: string) {
  return useQuery({
    queryKey: friendsKeys.search(query),
    queryFn: async () => {
      const response = await getFriendsSearch({ query: { query } })
      if (!response.data?.success) {
        throw new Error('Failed to search users')
      }
      return response.data.data.users
    },
    enabled: query.length >= 2,
  })
}

/**
 * Hook to get the user's invite code.
 */
export function useInviteCode() {
  return useQuery({
    queryKey: friendsKeys.inviteCode(),
    queryFn: async () => {
      const response = await getFriendsInviteCode()
      if (!response.data?.success) {
        throw new Error('Failed to get invite code')
      }
      return response.data.data
    },
  })
}

/**
 * Hook to send a friend request.
 */
export function useSendFriendRequest() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: { friendUserId?: string; inviteCode?: string }) => {
      const response = await postFriendsRequest({ body: data })
      if (!response.data?.success) {
        throw new Error('Failed to send friend request')
      }
      return response.data.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: friendsKeys.list() })
    },
  })
}

/**
 * Hook to accept a friend request.
 */
export function useAcceptFriendRequest() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (friendId: string) => {
      const response = await postFriendsByFriendIdAccept({ path: { friendId } })
      if (!response.data?.success) {
        throw new Error('Failed to accept friend request')
      }
      return response.data.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: friendsKeys.list() })
    },
  })
}

/**
 * Hook to decline a friend request.
 */
export function useDeclineFriendRequest() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (friendId: string) => {
      const response = await postFriendsByFriendIdDecline({ path: { friendId } })
      if (!response.data?.success) {
        throw new Error('Failed to decline friend request')
      }
      return response.data.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: friendsKeys.list() })
    },
  })
}

/**
 * Hook to remove a friend.
 */
export function useRemoveFriend() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (friendId: string) => {
      await deleteFriendsByFriendId({ path: { friendId } })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: friendsKeys.list() })
    },
  })
}

/**
 * Hook to block a user.
 */
export function useBlockFriend() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (friendId: string) => {
      const response = await postFriendsByFriendIdBlock({ path: { friendId } })
      if (!response.data?.success) {
        throw new Error('Failed to block user')
      }
      return response.data.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: friendsKeys.list() })
    },
  })
}

/**
 * Hook to delete the current user's account.
 */
export function useDeleteAccount() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      await deleteUsersMe()
    },
    onSuccess: () => {
      queryClient.clear()
    },
  })
}
