// Tests for the lime-marketing utility helpers — the validation guards that
// fail fast before any HTTP call, the credential URL normalizer, and the
// binary-data → AttachmentModel shaper.

import { NodeOperationError } from 'n8n-workflow';
import {
	assertValidEmail,
	assertValidSmsDestinationNumber,
	assertValidSmsFromNumber,
	buildAttachment,
	getBaseUrl,
} from '../../../nodes/LimeMarketing/utils';
import { makeBinaryContext, makeCredentialsContext } from './_helpers';

describe('assertValidEmail', () => {
	const ctx = makeBinaryContext();

	it.each([
		'name@example.com',
		'first.last@sub.example.co.uk',
		'user+tag@example.com',
		'a@[127.0.0.1]',
		"weird!#$%&?=^{}|~*'name@example.org",
	])('accepts %s', (email) => {
		expect(() => assertValidEmail(ctx, email, 'Field', 0)).not.toThrow();
	});

	it.each([
		'',
		'no-at-sign',
		'no@tld',
		'@example.com',
		'spaces in@example.com',
		'name@example',
		'name@.com',
	])('rejects %s', (email) => {
		expect(() => assertValidEmail(ctx, email, 'Field', 0)).toThrow(NodeOperationError);
	});

	it('includes the field label and the bad value in the message', () => {
		expect(() => assertValidEmail(ctx, 'bad', 'Recipient Email', 0)).toThrow(
			/Recipient Email is not a valid email address: bad/,
		);
	});
});

describe('assertValidSmsDestinationNumber', () => {
	const ctx = makeBinaryContext();

	it.each(['+46701234567', '+1234567890', '+999987654321098'])('accepts %s', (value) => {
		expect(() => assertValidSmsDestinationNumber(ctx, value, 'Field', 0)).not.toThrow();
	});

	it.each([
		'',
		'46701234567', // missing leading +
		'+0123456789', // leading zero in country code
		'+46', // too short
		'+46-70-1234567', // dashes
		'not a number',
	])('rejects %s', (value) => {
		expect(() => assertValidSmsDestinationNumber(ctx, value, 'Field', 0)).toThrow(
			NodeOperationError,
		);
	});
});

describe('assertValidSmsFromNumber', () => {
	const ctx = makeBinaryContext();

	it.each([
		'Acme',
		'AB',
		'company_1',
		'Acme-Co',
		'Acme Co',
		'ABCDEFGHIJK', // 11 chars (max)
		'Åäö_1',
	])('accepts %s', (value) => {
		expect(() => assertValidSmsFromNumber(ctx, value, 'Field', 0)).not.toThrow();
	});

	it.each([
		'',
		' Acme', // leading space
		'Acme ', // trailing space
		'A', // too short
		'ABCDEFGHIJKL', // 12 chars (over max)
		'has.dot',
		'has!bang',
	])('rejects %s', (value) => {
		expect(() => assertValidSmsFromNumber(ctx, value, 'Field', 0)).toThrow(NodeOperationError);
	});
});

describe('getBaseUrl', () => {
	it('returns the credential URL unchanged when there is no trailing slash', async () => {
		const ctx = makeCredentialsContext('https://api.example.com');
		expect(await getBaseUrl(ctx)).toBe('https://api.example.com');
	});

	it('strips a single trailing slash', async () => {
		const ctx = makeCredentialsContext('https://api.example.com/');
		expect(await getBaseUrl(ctx)).toBe('https://api.example.com');
	});

	it('strips multiple trailing slashes', async () => {
		const ctx = makeCredentialsContext('https://api.example.com///');
		expect(await getBaseUrl(ctx)).toBe('https://api.example.com');
	});

	it('preserves path segments before stripping the trailing slash', async () => {
		const ctx = makeCredentialsContext('https://app.bwz.se/bedrock/customer/api/');
		expect(await getBaseUrl(ctx)).toBe('https://app.bwz.se/bedrock/customer/api');
	});
});

describe('buildAttachment', () => {
	it('shapes the binary data into FileData/FileNameWithExtension/MimeType', async () => {
		const ctx = makeBinaryContext({
			binaryData: {
				data: 'BASE64DATA',
				fileName: 'report.pdf',
				mimeType: 'application/pdf',
			},
		});

		const result = await buildAttachment(ctx, 0, 'data');

		expect(result).toEqual({
			FileData: 'BASE64DATA',
			FileNameWithExtension: 'report.pdf',
			MimeType: 'application/pdf',
		});
	});

	it('lets the override take precedence over the upstream filename', async () => {
		const ctx = makeBinaryContext({
			binaryData: {
				data: 'X',
				fileName: 'upstream.bin',
				mimeType: 'application/octet-stream',
			},
		});

		const result = await buildAttachment(ctx, 0, 'data', 'override.pdf');

		expect(result.FileNameWithExtension).toBe('override.pdf');
	});

	it('uses the upstream filename when no override is given', async () => {
		const ctx = makeBinaryContext({
			binaryData: {
				data: 'X',
				fileName: 'upstream.bin',
				mimeType: 'application/octet-stream',
			},
		});

		const result = await buildAttachment(ctx, 0, 'data');

		expect(result.FileNameWithExtension).toBe('upstream.bin');
	});

	it('throws when neither override nor upstream filename is set', async () => {
		const ctx = makeBinaryContext({
			binaryData: {
				data: 'X',
				fileName: undefined,
				mimeType: 'application/octet-stream',
			},
		});

		await expect(buildAttachment(ctx, 0, 'data')).rejects.toBeInstanceOf(NodeOperationError);
		await expect(buildAttachment(ctx, 0, 'data')).rejects.toThrow(/missing a file name/);
	});
});
