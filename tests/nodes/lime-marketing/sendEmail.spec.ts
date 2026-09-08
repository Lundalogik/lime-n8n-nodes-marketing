// Tests for the email send operation. Mocks the HTTP transport so we can
// assert what URL the operation hits and what request body it builds for
// each combination of UI inputs.

jest.mock('../../../nodes/lime-marketing/transport', () => ({
	limeMarketingRequest: jest.fn().mockResolvedValue({}),
	getBaseUrl: jest.fn(),
}));

import { NodeOperationError } from 'n8n-workflow';
import { execute } from '../../../nodes/lime-marketing/resources/transactionmail/operations/send.operation';
import {
	baselineEmailParams,
	lastCallBody,
	lastCallUrl,
	makeSendContext,
	transportMock,
} from './_helpers';

beforeEach(() => {
	transportMock.mockClear();
});

describe('email send — template content', () => {
	it('Resource Mapper: sends every code in the value object', async () => {
		const ctx = makeSendContext({
			...baselineEmailParams,
			mergeCodesInputMethod: 'fields',
			templateMergeCodes: {
				value: {
					'{{firstname}}': 'John',
					'{{order_id}}': '12345',
				},
			},
		});

		await execute.call(ctx, 0);

		expect(lastCallUrl()).toBe('transactionmail/sendtemplate');
		const body = lastCallBody();
		expect(body.TemplateId).toBe(42);
		expect(body.HtmlContentTagModels).toEqual([
			{ Name: '{{firstname}}', Value: 'John' },
			{ Name: '{{order_id}}', Value: '12345' },
		]);
		expect(body.TextContentTagModels).toEqual(body.HtmlContentTagModels);
	});

	it('JSON Object: parses literal JSON string', async () => {
		const ctx = makeSendContext({
			...baselineEmailParams,
			mergeCodesInputMethod: 'json',
			mergeCodesJson: '{"{{firstname}}": "John"}',
		});

		await execute.call(ctx, 0);

		expect(lastCallBody().HtmlContentTagModels).toEqual([{ Name: '{{firstname}}', Value: 'John' }]);
	});

	it('JSON Object: coerces null and undefined values to "" (matches mapper path)', async () => {
		// Without normalisation, JSON.stringify {a: null, b: undefined}
		// would drop b and stringify a as the literal "null". The
		// template-mapper path coerces both to "" — JSON should match.
		const ctx = makeSendContext({
			...baselineEmailParams,
			mergeCodesInputMethod: 'json',
			mergeCodesJson: '{"{{firstname}}": null, "{{order_id}}": "12345"}',
		});

		await execute.call(ctx, 0);

		expect(lastCallBody().HtmlContentTagModels).toEqual([
			{ Name: '{{firstname}}', Value: '' },
			{ Name: '{{order_id}}', Value: '12345' },
		]);
	});

	it('Resource Mapper: row with empty string value produces "" (still sent)', async () => {
		// User kept the row visible in the resource mapper but left the input
		// blank → API replaces the placeholder with an empty string.
		const ctx = makeSendContext({
			...baselineEmailParams,
			mergeCodesInputMethod: 'fields',
			templateMergeCodes: {
				value: { '{{firstname}}': '' },
			},
		});

		await execute.call(ctx, 0);

		expect(lastCallBody().HtmlContentTagModels).toEqual([{ Name: '{{firstname}}', Value: '' }]);
	});

	it('Resource Mapper: row with null value coerces to "" (still sent)', async () => {
		const ctx = makeSendContext({
			...baselineEmailParams,
			mergeCodesInputMethod: 'fields',
			templateMergeCodes: {
				value: { '{{firstname}}': null },
			},
		});

		await execute.call(ctx, 0);

		expect(lastCallBody().HtmlContentTagModels).toEqual([{ Name: '{{firstname}}', Value: '' }]);
	});

	it('Resource Mapper: omits TagModels entirely when the user removed all rows', async () => {
		// No rows in the resource mapper UI → n8n sends `value: {}` → we
		// emit no merge codes → API leaves the placeholder literal in the
		// rendered email.
		const ctx = makeSendContext({
			...baselineEmailParams,
			mergeCodesInputMethod: 'fields',
			templateMergeCodes: { value: {} },
		});

		await execute.call(ctx, 0);

		const body = lastCallBody();
		expect(body.HtmlContentTagModels).toBeUndefined();
		expect(body.TextContentTagModels).toBeUndefined();
	});

	it('Resource Mapper: filters out the synthetic placeholder id', async () => {
		// When the template has no merge codes, getTemplateMergeCodeMappingColumns
		// returns a placeholder field. Production code must not send it.
		const ctx = makeSendContext({
			...baselineEmailParams,
			mergeCodesInputMethod: 'fields',
			templateMergeCodes: {
				value: { __noMergeCodes__: '' },
			},
		});

		await execute.call(ctx, 0);

		const body = lastCallBody();
		expect(body.HtmlContentTagModels).toBeUndefined();
		expect(body.TextContentTagModels).toBeUndefined();
	});
});

describe('email send — custom HTML / plain text', () => {
	it('custom HTML hits transactionmail/send and encodes HtmlContent as UTF-8 bytes', async () => {
		const ctx = makeSendContext({
			...baselineEmailParams,
			contentType: 'html',
			htmlContent: '<p>Hi</p>',
		});

		await execute.call(ctx, 0);

		expect(lastCallUrl()).toBe('transactionmail/send');
		const body = lastCallBody();
		expect(body.HtmlContent).toEqual(Array.from(Buffer.from('<p>Hi</p>', 'utf8')));
		expect(body.TemplateId).toBeUndefined();
	});

	it('plain text hits transactionmail/send and encodes TextContent as UTF-8 bytes', async () => {
		const ctx = makeSendContext({
			...baselineEmailParams,
			contentType: 'text',
			textContent: 'Hi Jane',
		});

		await execute.call(ctx, 0);

		expect(lastCallUrl()).toBe('transactionmail/send');
		const body = lastCallBody();
		expect(body.TextContent).toEqual(Array.from(Buffer.from('Hi Jane', 'utf8')));
		expect(body.HtmlContent).toBeUndefined();
		expect(body.TemplateId).toBeUndefined();
	});
});

describe('email send — additional options', () => {
	it('passes every additional option through to the request body', async () => {
		const ctx = makeSendContext({
			...baselineEmailParams,
			additionalOptions: {
				senderName: 'Sender',
				senderEmail: 'sender@example.com',
				replyTo: 'reply@example.com',
				scheduledSendDate: '2026-01-01T10:00:00.000Z',
				externalId: 'ext-1',
				excludePublicationOptouts: true,
				excludeTotalOptouts: false,
				excludePreviousBounce: true,
				linkBaseUrl: 'https://links.example.com',
				includeEmailDataInWebhookPayload: true,
				headers: {
					header: [
						{ name: 'X-Foo', value: 'bar' },
						{ name: 'X-Baz', value: 'qux' },
					],
				},
			},
		});

		await execute.call(ctx, 0);

		const body = lastCallBody();
		expect(body.SenderName).toBe('Sender');
		expect(body.SenderEmail).toBe('sender@example.com');
		expect(body.ReplyTo).toBe('reply@example.com');
		expect(body.ScheduledSendDate).toBe('2026-01-01T10:00:00.000Z');
		expect(body.ExternalId).toBe('ext-1');
		expect(body.ExcludePublicationOptouts).toBe(true);
		// Note: lowercase "o" in "Totaloptouts" matches Lime's API spelling — not a typo.
		expect(body.ExcludeTotaloptouts).toBe(false);
		expect(body.ExcludePreviousBounce).toBe(true);
		expect(body.LinkBaseUrl).toBe('https://links.example.com');
		expect(body.IncludeEmailDataInWebhookPayload).toBe(true);
		expect(body.Headers).toEqual({ 'X-Foo': 'bar', 'X-Baz': 'qux' });
	});

	it('omits RecipientName, Subject, and FromName when blank', async () => {
		const ctx = makeSendContext({
			...baselineEmailParams,
			recipientName: '',
			subject: '',
			fromName: '',
		});

		await execute.call(ctx, 0);

		const body = lastCallBody();
		expect(body.RecipientName).toBeUndefined();
		expect(body.Subject).toBeUndefined();
		expect(body.FromName).toBeUndefined();
	});

	it('omits LinkBaseUrl when linkBaseUrl is empty', async () => {
		const ctx = makeSendContext({
			...baselineEmailParams,
			additionalOptions: { linkBaseUrl: '' },
		});

		await execute.call(ctx, 0);

		expect(lastCallBody().LinkBaseUrl).toBeUndefined();
	});
});

describe('email send — validation', () => {
	it('throws on invalid recipientEmail', async () => {
		const ctx = makeSendContext({
			...baselineEmailParams,
			recipientEmail: 'not-an-email',
		});

		await expect(execute.call(ctx, 0)).rejects.toThrow(/Recipient Email/i);
		await expect(execute.call(ctx, 0)).rejects.toBeInstanceOf(NodeOperationError);
	});

	it('throws on invalid fromEmail', async () => {
		const ctx = makeSendContext({
			...baselineEmailParams,
			fromEmail: 'foo@',
		});

		await expect(execute.call(ctx, 0)).rejects.toThrow(/From Email/i);
	});

	it('throws when fromEmail is empty (e.g. expression resolved to "")', async () => {
		const ctx = makeSendContext({
			...baselineEmailParams,
			fromEmail: '',
		});

		await expect(execute.call(ctx, 0)).rejects.toThrow(/From Email is required/i);
		await expect(execute.call(ctx, 0)).rejects.toBeInstanceOf(NodeOperationError);
	});

	it('throws when templateId is not a valid positive number', async () => {
		const ctx = makeSendContext({
			...baselineEmailParams,
			contentType: 'template',
			templateId: '',
		});

		await expect(execute.call(ctx, 0)).rejects.toThrow(/Template is not a valid template id/i);
		await expect(execute.call(ctx, 0)).rejects.toBeInstanceOf(NodeOperationError);
	});

	it('throws when templateId resolves to a non-numeric string', async () => {
		const ctx = makeSendContext({
			...baselineEmailParams,
			contentType: 'template',
			templateId: 'abc',
		});

		await expect(execute.call(ctx, 0)).rejects.toThrow(/Template is not a valid template id/i);
	});

	it('throws on invalid additionalOptions.senderEmail', async () => {
		const ctx = makeSendContext({
			...baselineEmailParams,
			additionalOptions: { senderEmail: 'broken' },
		});

		await expect(execute.call(ctx, 0)).rejects.toThrow(/Sender Email/i);
	});

	it('throws on invalid mergeCodesJson', async () => {
		const ctx = makeSendContext({
			...baselineEmailParams,
			mergeCodesInputMethod: 'json',
			mergeCodesJson: '{not json',
		});

		await expect(execute.call(ctx, 0)).rejects.toThrow(/Merge Codes \(JSON\) is not valid JSON/i);
	});
});
