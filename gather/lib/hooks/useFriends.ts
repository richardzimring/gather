import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import {
  getFriends,
  getFriendsSearch,
  getFriendsInviteCode,
  postFriendsRequest,
  postFriendsMatchContacts,
  postFriendsByFriendIdAccept,
  postFriendsByFriendIdDecline,
  deleteFriendsByFriendId,
  postFriendsByFriendIdBlock,
  postFriendsByFriendIdReport,
  deleteUsersMe,
} from '../api/client';

export const friendsKeys = {
  all: ['friends'] as const,
  list: () => [...friendsKeys.all, 'list'] as const,
  search: (query: string) => [...friendsKeys.all, 'search', query] as const,
  friendCode: () => [...friendsKeys.all, 'friend-code'] as const,
};

/**
 * Hook to fetch all friends, pending requests, and sent requests.
 */
export function useFriends() {
  return useQuery({
    queryKey: friendsKeys.list(),
    queryFn: async () => {
      const { data } = await getFriends();
      return data.data;
    },
  });
}

/**
 * Hook to search for users.
 */
export function useFriendsSearch(query: string) {
  return useQuery({
    queryKey: friendsKeys.search(query),
    queryFn: async () => {
      const { data } = await getFriendsSearch({ query: { query } });
      return data.data.users;
    },
    enabled: query.length >= 2,
  });
}

/**
 * Hook to get the user's friend code.
 */
export function useFriendCode() {
  return useQuery({
    queryKey: friendsKeys.friendCode(),
    queryFn: async () => {
      const { data } = await getFriendsInviteCode();
      return data.data;
    },
  });
}

/**
 * Hook to match device contacts against Gather users by phone number.
 */
const MAX_CONTACT_PHONES = 10000;

export function useMatchContacts() {
  return useMutation({
    mutationFn: async (phones: string[]) => {
      const { data } = await postFriendsMatchContacts({
        body: { phones: phones.slice(0, MAX_CONTACT_PHONES) },
      });
      return data.data.users;
    },
  });
}

/**
 * Hook to send a friend request.
 */
export function useSendFriendRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      friendUserId?: string;
      inviteCode?: string;
    }) => {
      const { data: res } = await postFriendsRequest({ body: data });
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: friendsKeys.list() });
    },
  });
}

/**
 * Hook to accept a friend request.
 */
export function useAcceptFriendRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (friendId: string) => {
      const { data } = await postFriendsByFriendIdAccept({
        path: { friendId },
      });
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: friendsKeys.list() });
    },
  });
}

/**
 * Hook to decline a friend request.
 */
export function useDeclineFriendRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (friendId: string) => {
      const { data } = await postFriendsByFriendIdDecline({
        path: { friendId },
      });
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: friendsKeys.list() });
    },
  });
}

/**
 * Hook to remove a friend.
 */
export function useRemoveFriend() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (friendId: string) => {
      await deleteFriendsByFriendId({ path: { friendId } });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: friendsKeys.list() });
    },
  });
}

/**
 * Hook to block a user.
 */
export function useBlockFriend() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (friendId: string) => {
      const { data } = await postFriendsByFriendIdBlock({ path: { friendId } });
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: friendsKeys.list() });
    },
  });
}

/**
 * Hook to report a user.
 */
export function useReportUser() {
  return useMutation({
    mutationFn: async (friendId: string) => {
      const { data } = await postFriendsByFriendIdReport({
        path: { friendId },
      });
      return data.data;
    },
  });
}

/**
 * Hook to delete the current user's account.
 */
export function useDeleteAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      await deleteUsersMe();
    },
    onSuccess: () => {
      queryClient.clear();
    },
  });
}
