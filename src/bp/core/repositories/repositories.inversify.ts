import { ContainerModule, interfaces } from 'inversify'

import { TYPES } from '../types'

import {
  EventRepository,
  KnexEventRepository,
  KnexNotificationsRepository,
  KnexSessionRepository,
  KnexUserRepository,
  NotificationsRepository,
  SessionRepository,
  UserRepository,
  WorkspaceInviteCodesRepository
} from '.'
import { KnexLogsRepository, LogsRepository } from './logs'
import { StrategyUsersRepository } from './strategy_users'
import { TasksRepository } from './tasks'
import { TelemetryRepository } from './telemetry'
import { WorkspaceUsersRepository } from './workspace_users'
import { KnexMessageRepository, MessageRepository } from './messages'
import { ConversationRepository, KnexConversationRepository } from './conversations'

const RepositoriesContainerModule = new ContainerModule((bind: interfaces.Bind) => {
  bind<SessionRepository>(TYPES.SessionRepository)
    .to(KnexSessionRepository)
    .inSingletonScope()

  bind<UserRepository>(TYPES.UserRepository)
    .to(KnexUserRepository)
    .inSingletonScope()

  bind<LogsRepository>(TYPES.LogsRepository)
    .to(KnexLogsRepository)
    .inSingletonScope()

  bind<NotificationsRepository>(TYPES.NotificationsRepository)
    .to(KnexNotificationsRepository)
    .inSingletonScope()

  bind<EventRepository>(TYPES.EventRepository)
    .to(KnexEventRepository)
    .inSingletonScope()

  bind<StrategyUsersRepository>(TYPES.StrategyUsersRepository)
    .to(StrategyUsersRepository)
    .inSingletonScope()

  bind<TelemetryRepository>(TYPES.TelemetryRepository)
    .to(TelemetryRepository)
    .inSingletonScope()

  bind<WorkspaceUsersRepository>(TYPES.WorkspaceUsersRepository)
    .to(WorkspaceUsersRepository)
    .inSingletonScope()

  bind<WorkspaceInviteCodesRepository>(TYPES.WorkspaceInviteCodesRepository)
    .to(WorkspaceInviteCodesRepository)
    .inSingletonScope()

  bind<TasksRepository>(TYPES.TasksRepository)
    .to(TasksRepository)
    .inSingletonScope()

  bind<MessageRepository>(TYPES.MessageRepository)
    .to(KnexMessageRepository)
    .inSingletonScope()

  bind<ConversationRepository>(TYPES.ConversationRepository)
    .to(KnexConversationRepository)
    .inSingletonScope()
})

export const RepositoriesContainerModules = [RepositoriesContainerModule]
