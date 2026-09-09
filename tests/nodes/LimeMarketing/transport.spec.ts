// Tests for the lime-marketing HTTP transport. Mocks getBaseUrl (so we
// don't read credentials) and stubs the n8n http helper, then exercises
// limeMarketingRequest against happy responses and the NodeApiError that
// httpRequestWithAuthentication throws on failure — verifying we enrich its
// message from the Lime body at `error.context.data` and rethrow in place.

import { IAllExecuteFunctions, NodeApiError } from 'n8n-workflow';
import { limeMarketingRequest } from '../../../nodes/LimeMarketing/transport';

jest.mock('../../../nodes/LimeMarketing/utils', () => ({
	getBaseUrl: jest.fn().mockResolvedValue('https://api.example.com'),
}));

import { getBaseUrl } from '../../../nodes/LimeMarketing/utils';

const mockedGetBaseUrl = getBaseUrl as jest.MockedFunction<typeof getBaseUrl>;

type MockTransportContext = IAllExecuteFunctions & {
	helpers: {
		httpRequestWithAuthentication: { call: jest.Mock };
	};
};

function makeTransportContext(httpResult: {
	resolve?: unknown;
	reject?: unknown;
}): MockTransportContext {
	const call = jest.fn();
	if (httpResult.reject === undefined) {
		call.mockResolvedValue(httpResult.resolve);
	} else {
		call.mockRejectedValue(httpResult.reject);
	}
	return {
		helpers: { httpRequestWithAuthentication: { call } },
		getNode: jest.fn(() => ({
			id: '1',
			name: 'LimeMarketing',
			type: 'limeMarketing',
		})),
	} as unknown as MockTransportContext;
}

// Options that the most recent http call received as its third argument.
function lastHttpOptions(ctx: MockTransportContext): Record<string, unknown> | undefined {
	return ctx.helpers.httpRequestWithAuthentication.call.mock.calls.at(-1)?.[2];
}

// Build a NodeApiError the way n8n's http helper does: a generic status-code
// message, with the upstream JSON body stashed at `error.context.data`.
function makeNodeApiError(message: string, body?: unknown): NodeApiError {
	const err = new NodeApiError(
		{ id: '1', name: 'LimeMarketing', type: 'limeMarketing' } as never,
		{ code: '500' } as never,
		{ message },
	);
	if (body !== undefined) {
		(err as unknown as { context: { data: unknown } }).context.data = body;
	}
	return err;
}

beforeEach(() => {
	mockedGetBaseUrl.mockClear();
	mockedGetBaseUrl.mockResolvedValue('https://api.example.com');
});

describe('limeMarketingRequest — happy path', () => {
	it('wraps the response body in a success envelope', async () => {
		const ctx = makeTransportContext({ resolve: { ok: true } });

		const result = await limeMarketingRequest(ctx, {
			method: 'GET',
			url: 'ping/version',
		});

		expect(result).toEqual({ success: true, data: { ok: true } });
	});

	it('passes the resolved baseURL into the http call', async () => {
		const ctx = makeTransportContext({ resolve: {} });

		await limeMarketingRequest(ctx, {
			method: 'GET',
			url: 'ping/version',
		});

		expect(lastHttpOptions(ctx)).toMatchObject({
			method: 'GET',
			url: 'ping/version',
			baseURL: 'https://api.example.com',
		});
	});

	it('uses the provided baseURL and skips getBaseUrl when one is passed', async () => {
		const ctx = makeTransportContext({ resolve: {} });

		await limeMarketingRequest(ctx, {
			method: 'POST',
			url: 'transactionmail/send',
			baseURL: 'https://provided.example.com',
		});

		expect(mockedGetBaseUrl).not.toHaveBeenCalled();
		expect(lastHttpOptions(ctx)).toMatchObject({
			baseURL: 'https://provided.example.com',
		});
	});

	it('falls back to getBaseUrl when no baseURL is provided', async () => {
		const ctx = makeTransportContext({ resolve: {} });

		await limeMarketingRequest(ctx, { method: 'GET', url: 'mailtemplate' });

		expect(mockedGetBaseUrl).toHaveBeenCalledTimes(1);
	});
});

describe('limeMarketingRequest — Lime error formatting', () => {
	function expectMessage(body: unknown, expected: string) {
		const ctx = makeTransportContext({
			reject: makeNodeApiError('500 Internal Server Error', body),
		});
		return expect(
			limeMarketingRequest(ctx, {
				method: 'POST',
				url: 'transactionmail/send',
				errorContext: 'send email',
			}),
		).rejects.toMatchObject({ message: expected });
	}

	it('uses just Message when ErrorDetails is missing', async () => {
		await expectMessage({ Message: 'No details here' }, 'No details here');
	});

	it('joins ErrorDetails as "Message: Context" pairs', async () => {
		await expectMessage(
			{
				Message: 'Validation failed',
				ErrorDetails: [
					{ Context: 'RecipientEmail', Message: 'is required' },
					{ Context: 'FromEmail', Message: 'invalid format' },
				],
			},
			'Validation failed: is required: RecipientEmail; invalid format: FromEmail',
		);
	});

	it('falls back to Context only when Message is missing on a detail', async () => {
		await expectMessage(
			{
				Message: 'Validation failed',
				ErrorDetails: [{ Context: 'RecipientEmail' }],
			},
			'Validation failed: RecipientEmail',
		);
	});

	it('falls back to Message only when Context is missing on a detail', async () => {
		await expectMessage(
			{
				Message: 'Validation failed',
				ErrorDetails: [{ Message: 'something exploded' }],
			},
			'Validation failed: something exploded',
		);
	});

	it('drops fully-empty detail entries but keeps whitespace-only ones', async () => {
		// NOTE: whitespace-only Context/Message are not trimmed, so they leak
		// through as "   :    ". Pins current behavior.
		await expectMessage(
			{
				Message: 'Validation failed',
				ErrorDetails: [{}, { Context: 'A', Message: 'a' }, { Context: '   ', Message: '   ' }],
			},
			'Validation failed: a: A;    :    ',
		);
	});

	it('uses an empty base message when the body has no Message', async () => {
		await expectMessage({ ErrorDetails: [{ Context: 'A' }] }, ': A');
	});

	it('surfaces the Lime body whether or not errorContext is supplied', async () => {
		const ctx = makeTransportContext({
			reject: makeNodeApiError('500 Internal Server Error', {
				Message: 'Recipient required',
			}),
		});

		await expect(
			limeMarketingRequest(ctx, {
				method: 'POST',
				url: 'transactionmail/send',
			}),
		).rejects.toMatchObject({ message: 'Recipient required' });
	});
});

describe('limeMarketingRequest — failures without a Lime body', () => {
	// REGRESSION: createErrorMessage reads error.context.data unconditionally,
	// so any failure that is not a NodeApiError carrying a Lime JSON body now
	// throws a TypeError instead of producing a readable message. These tests
	// pin the current behavior; the fix belongs in transport/index.ts.
	it('throws when the NodeApiError has no body', async () => {
		const ctx = makeTransportContext({
			reject: makeNodeApiError('500 Internal Server Error'),
		});

		await expect(
			limeMarketingRequest(ctx, {
				method: 'POST',
				url: 'transactionmail/send',
			}),
		).rejects.toThrow();
	});

	it('throws on a plain Error', async () => {
		const ctx = makeTransportContext({ reject: new Error('network down') });

		await expect(
			limeMarketingRequest(ctx, {
				method: 'POST',
				url: 'transactionmail/send',
			}),
		).rejects.toThrow();
	});

	it('throws on a non-Error throwable', async () => {
		const ctx = makeTransportContext({ reject: 'just a string' });

		await expect(
			limeMarketingRequest(ctx, {
				method: 'POST',
				url: 'transactionmail/send',
			}),
		).rejects.toThrow();
	});
});
