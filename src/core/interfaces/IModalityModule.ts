/**
 * Interface for modality modules
 */
import { IModule } from './IModule';
import { ModalityDefinition } from '../models/ModalityDefinition';
import { ModalityInput } from '../models/ModalityInput';
import { ProcessedInput } from '../models/ModalityInput';
import { ValidationResult } from '../models/ValidationResult';
import { OutputContent } from '../models/OutputContent';
import { OutputOptions } from '../models/OutputContent';
import { ModalityOutput } from '../models/ModalityOutput';
import { ModalityData } from '../models/ModalityOutput';
import { DeviceCapabilities } from '../models/DeviceCapabilities';
import { CompatibilityResult } from '../models/DeviceCapabilities';

export interface IModalityModule extends IModule {
  // Modality Definition
  getModalityDefinition(): ModalityDefinition;

  // Input Processing
  processInput(input: ModalityInput): Promise<ProcessedInput>;
  validateInput(input: ModalityInput): Promise<ValidationResult>;

  // Output Generation
  generateOutput(content: OutputContent, options: OutputOptions): Promise<ModalityOutput>;

  // Translation
  translateToModality(input: any, targetModality: string): Promise<ModalityData>;
  translateFromModality(modalityData: ModalityData): Promise<any>;

  // Capability Detection
  detectDeviceCapabilities(): Promise<DeviceCapabilities>;
  checkCompatibility(capabilities: DeviceCapabilities): Promise<CompatibilityResult>;
}
