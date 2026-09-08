// Tests for the loadOptions / resourceMapping handlers used by the email
// send operation: getTemplates (template dropdown) and
// getTemplateMergeCodeMappingColumns (resource mapper). Mocks the HTTP
// transport so we can stub API responses and inspect the handlers' shaping
// of the returned fields.

jest.mock('../../../nodes/lime-marketing/transport', () => ({
	limeMarketingRequest: jest.fn(),
}));

import { getTemplates } from '../../../nodes/lime-marketing/methods/getTemplates';
import {
	getTemplateMergeCodeMappingColumns,
	isMergeCodePlaceholder,
} from '../../../nodes/lime-marketing/methods/getTemplateMergeCodeMappingColumns';
import { makeLoadOptionsContext, transportMock } from './_helpers';

beforeEach(() => {
	transportMock.mockReset();
});

describe('getTemplates', () => {
	it('formats each template as "Name (ID: id)" and sorts alphabetically', async () => {
		transportMock.mockResolvedValue({
			success: true,
			data: [
				{ Id: 1, Name: 'Welcome' },
				{ Id: 2, Name: 'Abandoned cart' },
				{ Id: 3, Name: 'Newsletter' },
			],
		});

		const ctx = makeLoadOptionsContext();
		const result = await getTemplates.call(ctx);

		expect(result).toEqual([
			{ name: 'Abandoned cart (ID: 2)', value: 2 },
			{ name: 'Newsletter (ID: 3)', value: 3 },
			{ name: 'Welcome (ID: 1)', value: 1 },
		]);
	});

	it('returns an empty list when no templates exist', async () => {
		transportMock.mockResolvedValue({ success: true, data: [] });

		const result = await getTemplates.call(makeLoadOptionsContext());

		expect(result).toEqual([]);
	});

	it('calls the API at the mailtemplate endpoint', async () => {
		transportMock.mockResolvedValue({ success: true, data: [] });

		await getTemplates.call(makeLoadOptionsContext());

		expect(transportMock).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({
				method: 'GET',
				url: 'mailtemplate',
			}),
		);
	});

	it('returns an empty list when the request throws', async () => {
		transportMock.mockRejectedValue(new Error('boom'));

		const result = await getTemplates.call(makeLoadOptionsContext());

		expect(result).toEqual([]);
	});
});

describe('getTemplateMergeCodeMappingColumns', () => {
	it('returns the placeholder field when no templateId is selected', async () => {
		const ctx = makeLoadOptionsContext(undefined);

		const result = await getTemplateMergeCodeMappingColumns.call(ctx);

		expect(result.fields).toHaveLength(1);
		expect(result.fields[0].id).toBe('__noMergeCodes__');
		expect(result.fields[0].readOnly).toBe(true);
		expect(transportMock).not.toHaveBeenCalled();
	});

	it('returns the placeholder field when templateId is 0', async () => {
		const ctx = makeLoadOptionsContext(0);

		const result = await getTemplateMergeCodeMappingColumns.call(ctx);

		expect(result.fields).toHaveLength(1);
		expect(result.fields[0].id).toBe('__noMergeCodes__');
	});

	it('maps each CustomVariable RawValue to a string field', async () => {
		transportMock.mockResolvedValue({
			success: true,
			data: {
				CustomVariables: [
					{ Property: 'firstname', RawValue: '{{firstname}}' },
					{ Property: 'order_id', RawValue: '{{order_id}}' },
				],
			},
		});

		const ctx = makeLoadOptionsContext(42);
		const result = await getTemplateMergeCodeMappingColumns.call(ctx);

		expect(result.fields).toEqual([
			{
				id: '{{firstname}}',
				displayName: '{{firstname}}',
				required: false,
				defaultMatch: false,
				display: true,
				type: 'string',
				canBeUsedToMatch: false,
			},
			{
				id: '{{order_id}}',
				displayName: '{{order_id}}',
				required: false,
				defaultMatch: false,
				display: true,
				type: 'string',
				canBeUsedToMatch: false,
			},
		]);
	});

	it('hits the per-template variables endpoint with the right templateId', async () => {
		transportMock.mockResolvedValue({
			success: true,
			data: { CustomVariables: [] },
		});

		await getTemplateMergeCodeMappingColumns.call(makeLoadOptionsContext(42));

		expect(transportMock).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({
				method: 'GET',
				url: 'mailtemplate/42/variables',
			}),
		);
	});

	it('falls back to the placeholder when CustomVariables is empty', async () => {
		transportMock.mockResolvedValue({
			success: true,
			data: { CustomVariables: [] },
		});

		const result = await getTemplateMergeCodeMappingColumns.call(makeLoadOptionsContext(42));

		expect(result.fields).toHaveLength(1);
		expect(result.fields[0].id).toBe('__noMergeCodes__');
	});

	it('falls back to the placeholder when CustomVariables is missing', async () => {
		transportMock.mockResolvedValue({ success: true, data: {} });

		const result = await getTemplateMergeCodeMappingColumns.call(makeLoadOptionsContext(42));

		expect(result.fields).toHaveLength(1);
		expect(result.fields[0].id).toBe('__noMergeCodes__');
	});

	it('filters out variables with empty/null RawValue', async () => {
		// The API has been observed returning null / '' for RawValue on
		// partially-configured templates; defensively filter them out so
		// they don't surface as broken fields in the resource mapper.
		transportMock.mockResolvedValue({
			success: true,
			data: {
				CustomVariables: [
					{ Property: 'a', RawValue: '{{a}}' },
					{ Property: 'b', RawValue: '' },
					{ Property: 'c', RawValue: null as unknown as string },
					{ Property: 'd', RawValue: '{{d}}' },
				],
			},
		});

		const result = await getTemplateMergeCodeMappingColumns.call(makeLoadOptionsContext(42));

		expect(result.fields).toHaveLength(2);
		expect(result.fields.map((f) => f.id)).toEqual(['{{a}}', '{{d}}']);
	});

	it('returns an empty field list when the request throws', async () => {
		transportMock.mockRejectedValue(new Error('boom'));

		const result = await getTemplateMergeCodeMappingColumns.call(makeLoadOptionsContext(42));

		expect(result.fields).toEqual([]);
	});
});

describe('isMergeCodePlaceholder', () => {
	it('is true for the sentinel id', () => {
		expect(isMergeCodePlaceholder('__noMergeCodes__')).toBe(true);
	});

	it('is false for a real merge code', () => {
		expect(isMergeCodePlaceholder('{{firstname}}')).toBe(false);
	});

	it('is false for empty string', () => {
		expect(isMergeCodePlaceholder('')).toBe(false);
	});
});
