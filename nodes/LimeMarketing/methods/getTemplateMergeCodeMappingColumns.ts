import { ILoadOptionsFunctions, ResourceMapperFields, LoggerProxy as Logger } from 'n8n-workflow';
import { limeMarketingRequest } from '../transport';

type TemplateVariablesResponse = {
	RecipientVariables?: { Property: string; RawValue: string }[];
	CustomVariables?: { Property: string; RawValue: string }[];
};

const PLACEHOLDER_ID = '__noMergeCodes__';

// True if `name` is the synthetic "no merge codes" sentinel produced for
// templates without merge codes — must be filtered out before sending.
export function isMergeCodePlaceholder(name: string): boolean {
	return name === PLACEHOLDER_ID;
}

const noMergeCodesPlaceholder = {
	id: PLACEHOLDER_ID,
	displayName: 'No merge codes in this template',
	required: false,
	defaultMatch: false,
	display: true,
	type: 'string' as const,
	canBeUsedToMatch: false,
	readOnly: true,
};

// resourceMapping handler: fetch the merge codes (CustomVariables) for the
// currently-selected template and expose each as a mappable field. Returns a
// readOnly placeholder field when the template has none, since n8n's resource
// mapper requires at least one field to render.
export async function getTemplateMergeCodeMappingColumns(
	this: ILoadOptionsFunctions,
): Promise<ResourceMapperFields> {
	const templateId = Number(this.getNodeParameter('templateId', 0));
	if (!templateId) return { fields: [noMergeCodesPlaceholder] };

	let tagsResponse;
	try {
		tagsResponse = await limeMarketingRequest<TemplateVariablesResponse>(this, {
			method: 'GET',
			url: `mailtemplate/${templateId}/variables`,
			json: true,
			errorContext: 'load template merge codes',
		});
	} catch (error) {
		Logger.error(`There was an error with fetching merge codes: ${error}`);
		return { fields: [] };
	}

	const fields = (tagsResponse?.data.CustomVariables ?? [])
		.map((v) => v?.RawValue)
		.filter(Boolean)
		.map((code) => ({
			id: code,
			displayName: code,
			required: false,
			defaultMatch: false,
			display: true,
			type: 'string' as const,
			canBeUsedToMatch: false,
		}));

	if (fields.length === 0) return { fields: [noMergeCodesPlaceholder] };
	return { fields };
}
