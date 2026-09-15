import type { Signal } from '../domain/types.js';
import type { DetectorContext, SignalDefinition } from './types.js';

import { productionLogicChanged } from './detectors/productionLogicChanged.js';
import { testsAdded } from './detectors/testsAdded.js';
import { testsModified } from './detectors/testsModified.js';
import { testsDeleted } from './detectors/testsDeleted.js';
import { productionWithoutTests } from './detectors/productionWithoutTests.js';
import { assertionsRemoved } from './detectors/assertionsRemoved.js';
import { testsSkipped } from './detectors/testsSkipped.js';
import { criticalPathChanged } from './detectors/criticalPathChanged.js';
import { authenticationChanged } from './detectors/authenticationChanged.js';
import { authorizationChanged } from './detectors/authorizationChanged.js';
import { paymentLogicChanged } from './detectors/paymentLogicChanged.js';
import { apiEndpointChanged } from './detectors/apiEndpointChanged.js';
import { apiContractChanged } from './detectors/apiContractChanged.js';
import { databaseMigrationChanged } from './detectors/databaseMigrationChanged.js';
import { validationLogicChanged } from './detectors/validationLogicChanged.js';
import { errorHandlingChanged } from './detectors/errorHandlingChanged.js';
import { configurationChanged } from './detectors/configurationChanged.js';
import { dependenciesChanged } from './detectors/dependenciesChanged.js';
import { sharedCoreChanged } from './detectors/sharedCoreChanged.js';
import { permissionRoleChanged } from './detectors/permissionRoleChanged.js';
import { datetimeLogicChanged } from './detectors/datetimeLogicChanged.js';
import { largeChangeSurface } from './detectors/largeChangeSurface.js';
import { multiAreaChange } from './detectors/multiAreaChange.js';

/**
 * Every signal ReleaseLens knows about, in a stable order used for both
 * detection and documentation. Adding a new signal means adding one entry
 * here - see CONTRIBUTING.md for the full walkthrough.
 */
export const SIGNAL_DEFINITIONS: SignalDefinition[] = [
  productionLogicChanged,
  testsAdded,
  testsModified,
  testsDeleted,
  productionWithoutTests,
  assertionsRemoved,
  testsSkipped,
  criticalPathChanged,
  authenticationChanged,
  authorizationChanged,
  paymentLogicChanged,
  apiEndpointChanged,
  apiContractChanged,
  databaseMigrationChanged,
  validationLogicChanged,
  errorHandlingChanged,
  configurationChanged,
  dependenciesChanged,
  sharedCoreChanged,
  permissionRoleChanged,
  datetimeLogicChanged,
  largeChangeSurface,
  multiAreaChange,
];

export function findSignalDefinition(id: string): SignalDefinition | undefined {
  return SIGNAL_DEFINITIONS.find((definition) => definition.id === id);
}

export function detectSignals(ctx: DetectorContext): Signal[] {
  return SIGNAL_DEFINITIONS.flatMap((definition) => definition.detect(ctx));
}
