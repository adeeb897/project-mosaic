/**
 * Interface for agent modules
 */
import { IModule } from './IModule';
import { AgentDefinition } from '../models/AgentDefinition';
import { ConnectionResult } from '../models/ConnectionResult';
import { AgentTask } from '../models/AgentTask';
import { Task } from '../models/Task';
import { TaskStatus } from '../models/Task';
import { A2AAgentCard } from '../models/A2AAgentCard';
import { A2AMessage } from '../models/A2AMessage';
import { A2AResponse } from '../models/A2AMessage';
import { AgentCapability } from '../models/AgentCapability';
import { CapabilityResult } from '../models/CapabilityResult';

export interface IAgentModule extends IModule {
  // Agent Definition
  getAgentDefinition(): AgentDefinition;

  // Communication
  connect(): Promise<ConnectionResult>;
  disconnect(): Promise<void>;

  // Task Management
  createTask(task: AgentTask): Promise<Task>;
  getTaskStatus(taskId: string): Promise<TaskStatus>;
  cancelTask(taskId: string): Promise<boolean>;

  // A2A Integration
  getA2ACard(): A2AAgentCard;
  handleA2AMessage(message: A2AMessage): Promise<A2AResponse>;

  // Capability Management
  discoverCapabilities(): Promise<AgentCapability[]>;
  invokeCapability(capabilityId: string, params: any): Promise<CapabilityResult>;
}
