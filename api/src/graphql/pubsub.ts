import { PubSub } from 'graphql-subscriptions';

export const pubsub = new PubSub();

export const EVENTS = {
  BATCH_EVENT: 'BATCH_EVENT',
  RECALL_ISSUED: 'RECALL_ISSUED',
};
