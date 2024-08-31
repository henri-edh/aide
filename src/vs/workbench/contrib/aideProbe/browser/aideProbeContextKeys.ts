/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { localize } from 'vs/nls';
import { RawContextKey } from 'vs/platform/contextkey/common/contextkey';
import { AideProbeMode, AideProbeStatus, IAideProbeMode, IAideProbeStatus } from 'vs/workbench/contrib/aideProbe/common/aideProbe';

export const CONTEXT_PROBE_MODE = new RawContextKey<IAideProbeMode>('aideProbeMode', AideProbeMode.AGENTIC, { type: 'string', description: localize('aideProbeMode', "Either explore, agentic editing or anchored editing") });
export const CONTEXT_PROBE_CONTEXT_TYPE = new RawContextKey<'specific' | 'codebase'>('aideProbeContext', 'specific', { type: 'string', description: localize('aideProbeContext', "Type of context used for probing.") });

export const CONTEXT_PROBE_HAS_SELECTION = new RawContextKey<boolean>('aideProbeHasSelection', false, { type: 'boolean', description: localize('aideProbeHasSelection', "True when the AI agent has a selection.") });
export const CONTEXT_PROBE_ARE_CONTROLS_ACTIVE = new RawContextKey<boolean>('aideProbeAreControlsActive', false, { type: 'boolean', description: localize('aideProbeAreControlsActive', "True when the AI agent's controls are active.") });

export const CONTEXT_PROBE_INPUT_HAS_TEXT = new RawContextKey<boolean>('aideProbeInputHasText', false, { type: 'boolean', description: localize('aideProbeInputHasText', "True when the AI search input has text.") });
export const CONTEXT_PROBE_INPUT_HAS_FOCUS = new RawContextKey<boolean>('aideProbeInputHasFocus', false, { type: 'boolean', description: localize('aideProbeInputHasFocus', "True when the AI search input has focus.") });

export const CONTEXT_PROBE_CONTEXT_LIST_HAS_FOCUS = new RawContextKey<boolean>('aideProbeContextListHasFocus', false, { type: 'boolean', description: localize('aideProbeContextListHasFocus', "True when the context list has focus.") });
export const CONTEXT_PROBE_REQUEST_STATUS = new RawContextKey<IAideProbeStatus>('aideProbeRequestStatus', AideProbeStatus.INACTIVE, { type: 'string', description: localize('aideProbeStatus', "Status of the AI agent's active probing or edit request.") });



// Deprecated
export const CONTEXT_IN_PROBE_INPUT = new RawContextKey<boolean>('inAideProbeInput', false, { type: 'boolean', description: localize('inAideProbeInput', "True when focus is in the AI search input, false otherwise.") });
export const CONTEXT_PALETTE_IS_VISIBLE = new RawContextKey<boolean>('aideProbePaletteIsVisible', false, { type: 'boolean', description: localize('aideProbePaletteIsVisible', "True when the command palette is visible.") });