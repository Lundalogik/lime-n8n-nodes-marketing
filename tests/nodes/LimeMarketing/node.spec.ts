// End-to-end tests for the node's execute() dispatch + output routing.
// Regression cover for the bug where a server-side API error (transport
// throwing NodeApiError) must land on the ERROR output, not Success.
//
// We mock only the transport so the real operations + real node execute run.
// (Mocking the resource barrels would also drop the *Fields the node's
// `description` spreads at construction, breaking instantiation.)

jest.mock('../../../nodes/LimeMarketing/transport', () => ({
	limeMarketingRequest: jest.fn(),
}));

import { NodeApiError } from 'n8n-workflow';
import { LimeMarketing } from '../../../nodes/LimeMarketing/LimeMarketing.node';
import {
	baselineSmsParams,
	baselineEmailParams,
	makeNodeExecuteContext,
	transportMock,
} from './_helpers';

const node = { name: 'Test', id: 't' } as never;

beforeEach(() => {
	transportMock.mockReset();
});

describe('LimeMarketing execute — error output routing', () => {
	it('routes a server-side SMS error to the error output', async () => {
		const apiError = new NodeApiError(node, {
			message: "The SMS sender 'Lime' is not a verified sender ID",
		});
		transportMock.mockRejectedValue(apiError);

		const ctx = makeNodeExecuteContext({
			...baselineSmsParams,
			resource: 'sms',
			operation: 'send',
		});

		const out = await new LimeMarketing().execute.call(ctx);

		// The item carries the top-level `error` field n8n uses to route it
		// to the error output, and json.error holds the API message.
		expect(out[0][0].error).toBe(apiError);
		expect(out[0][0].json.error).toBe(apiError.message);
		expect(out[0][0].pairedItem).toEqual({ item: 0 });
	});

	it('routes a server-side email error to the error output', async () => {
		const apiError = new NodeApiError(node, {
			message: 'The sendingdomain for the e-mail address is not valid',
		});
		transportMock.mockRejectedValue(apiError);

		const ctx = makeNodeExecuteContext({
			...baselineEmailParams,
			resource: 'email',
			operation: 'send',
		});

		const out = await new LimeMarketing().execute.call(ctx);

		expect(out[0][0].error).toBe(apiError);
		expect(out[0][0].json.error).toBe(apiError.message);
	});

	it('leaves a successful send on the success output (no error field)', async () => {
		transportMock.mockResolvedValue({ success: true, data: { Id: 1 } });

		const ctx = makeNodeExecuteContext({
			...baselineSmsParams,
			resource: 'sms',
			operation: 'send',
		});

		const out = await new LimeMarketing().execute.call(ctx);

		expect(out[0][0].error).toBeUndefined();
		expect(out[0][0].json).toEqual({ success: true, data: { Id: 1 } });
	});
});
