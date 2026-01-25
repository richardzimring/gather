// Export all model classes
export { User, UserSchema, CreateUserInput, UpdateUserInput } from './User';
export type { UserData, CreateUserData, UpdateUserData } from './User';

export {
  Friendship,
  FriendshipSchema,
  FriendshipStatusSchema,
} from './Friendship';
export type {
  FriendshipData,
  FriendshipStatus,
  FriendshipWithUser,
} from './Friendship';

export {
  Group,
  GroupSchema,
  CreateGroupInput,
  UpdateGroupInput,
} from './Group';
export type { GroupData, CreateGroupData, UpdateGroupData } from './Group';

export {
  Activity,
  ActivitySchema,
  CreateActivityInput,
  UpdateActivityInput,
} from './Activity';
export type {
  ActivityData,
  CreateActivityData,
  UpdateActivityData,
} from './Activity';

export {
  AvailabilityWindow,
  AvailabilityWindowSchema,
  CreateAvailabilityInput,
  UpdateAvailabilityInput,
  RecurringSchema,
  RecurringPatternSchema,
  VisibilitySchema,
  VisibilityTypeSchema,
} from './AvailabilityWindow';
export type {
  AvailabilityWindowData,
  CreateAvailabilityData,
  UpdateAvailabilityData,
  Recurring,
  RecurringPattern,
  Visibility,
  VisibilityType,
} from './AvailabilityWindow';

export {
  Event,
  EventSchema,
  CreateEventInput,
  UpdateEventInput,
  EventResponseInput,
  EventInviteeSchema,
  InviteeStatusSchema,
  EventStatusSchema,
  CounterProposalSchema,
} from './Event';
export type {
  EventData,
  CreateEventData,
  UpdateEventData,
  EventResponseData,
  EventInvitee,
  InviteeStatus,
  EventStatus,
  CounterProposal,
} from './Event';

// Export base utilities
export { BaseModel, stripDynamoKeys, db } from './base';
