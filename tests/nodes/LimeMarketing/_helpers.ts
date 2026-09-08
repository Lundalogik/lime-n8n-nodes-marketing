// Shared test infrastructure for the lime-marketing specs:
//   - Baseline parameter fixtures (spread into a context, override only what
//     your test cares about).
//   - Mock context factories for the three n8n function shapes we exercise:
//     send-operation IExecuteFunctions, load-options ILoadOptionsFunctions,
//     and bare credential contexts.
//   - Inspection helpers for the mocked transport (lastCallBody / lastCallUrl).
//
// `transportMock` and the inspection helpers are only meaningful if the
// importing spec calls `jest.mock('.../transport', ...)` at the top of the
// file — Jest hoists those mocks above all imports, so this file picks up
// the mocked version automatically.

import { IExecuteFunctions, ILoadOptionsFunctions, INodeExecutionData } from 'n8n-workflow';
import { limeMarketingRequest } from '../../../nodes/LimeMarketing/transport';

// ── Baseline fixtures ────────────────────────────────────────────────────────

export const baselineEmailParams: Record<string, unknown> = {
	contentType: 'template',
	templateId: 42,
	fromName: 'Acme',
	fromEmail: 'noreply@acme.example',
	recipientName: 'Jane',
	recipientEmail: 'jane@example.com',
	subject: 'Hi',
	trackOpenings: false,
	trackLinkClicks: false,
	mergeCodesInputMethod: 'fields',
	templateMergeCodes: { value: {} },
	mergeCodesFreeForm: {},
	mergeCodesJson: '{}',
	htmlContent: '',
	textContent: '',
	attachments: {},
	additionalOptions: {},
};

export const baselineSmsParams: Record<string, unknown> = {
	fromNumber: 'Acme',
	destinationNumber: '+46701234567',
	text: 'Hello',
	mergeCodesInputMethod: 'fields',
	textContentTagModels: {},
	mergeCodesJson: '{}',
	additionalOptions: {},
};

// ── Context factories ────────────────────────────────────────────────────────

export function makeSendContext(params: Record<string, unknown>): IExecuteFunctions {
	return {
		getNodeParameter: jest.fn((name: string, _i: number, defaultValue?: unknown) => {
			if (name in params) return params[name];
			return defaultValue;
		}),
		getNode: jest.fn(() => ({ name: 'Test', id: 't' })),
		helpers: {
			assertBinaryData: jest.fn(),
			getBinaryDataBuffer: jest.fn(),
		},
	} as unknown as IExecuteFunctions;
}

// Context for driving the whole node's execute() (dispatch + output routing),
// not just a single operation. `params` feeds getNodeParameter (include
// `resource` and `operation`); `onError`/`continueOnFail` control how failures
// are routed.
export function makeNodeExecuteContext(
	params: Record<string, unknown>,
	overrides?: {
		onError?: string;
		continueOnFail?: boolean;
		inputItems?: INodeExecutionData[];
	},
): IExecuteFunctions {
	return {
		getInputData: jest.fn(() => overrides?.inputItems ?? [{ json: {} }]),
		getNodeParameter: jest.fn((name: string, _i: number, defaultValue?: unknown) => {
			if (name in params) return params[name];
			return defaultValue;
		}),
		continueOnFail: jest.fn(() => overrides?.continueOnFail ?? true),
		getNode: jest.fn(() => ({
			name: 'Test',
			id: 't',
			onError: overrides?.onError ?? 'continueErrorOutput',
		})),
		getCredentials: jest.fn().mockResolvedValue({ url: 'https://example.com' }),
		helpers: {
			assertBinaryData: jest.fn(),
			getBinaryDataBuffer: jest.fn(),
		},
	} as unknown as IExecuteFunctions;
}

export function makeLoadOptionsContext(templateId?: unknown): ILoadOptionsFunctions {
	return {
		getNodeParameter: jest.fn((name: string) => (name === 'templateId' ? templateId : undefined)),
		getNode: jest.fn(() => ({ name: 'Test', id: 't' })),
	} as unknown as ILoadOptionsFunctions;
}

export function makeBinaryContext(overrides?: {
	binaryData?: { data: string; fileName?: string; mimeType: string };
}): IExecuteFunctions {
	return {
		getNode: jest.fn(() => ({ name: 'Test', id: 't' })),
		helpers: {
			assertBinaryData: jest.fn(() => overrides?.binaryData),
		},
	} as unknown as IExecuteFunctions;
}

export function makeCredentialsContext(url: string): IExecuteFunctions {
	return {
		getCredentials: jest.fn().mockResolvedValue({ url }),
	} as unknown as IExecuteFunctions;
}

// ── Mock transport inspection ────────────────────────────────────────────────

// The mocked limeMarketingRequest. Use `.mockResolvedValue(...)` /
// `.mockClear()` from your spec. Only meaningful when the spec has called
// `jest.mock('.../transport', ...)` itself.
export const transportMock = limeMarketingRequest as jest.MockedFunction<
	typeof limeMarketingRequest
>;

export function lastCallBody(): Record<string, unknown> {
	const call = transportMock.mock.calls.at(-1);
	if (!call) throw new Error('limeMarketingRequest was not called');
	return (call[1] as { body: Record<string, unknown> }).body;
}

export function lastCallUrl(): string {
	const call = transportMock.mock.calls.at(-1);
	if (!call) throw new Error('limeMarketingRequest was not called');
	return (call[1] as { url: string }).url;
}
