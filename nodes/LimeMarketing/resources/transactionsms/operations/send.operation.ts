import { IExecuteFunctions, INodeProperties } from 'n8n-workflow';
import {
	TRANSACTIONAL_SMS_RESOURCE,
	SendTransactionSmsArgs,
	TagModel,
	TransactionSmsModel,
	MERGE_CODES_INPUT_FIELDS,
	MERGE_CODES_INPUT_JSON,
	SEND_OPERATION,
	TagListInput,
	AdditionalSmsOptions,
} from '../../../models';
import {
	assertValidSmsDestinationNumber,
	assertValidSmsFromNumber,
	omitEmpty,
} from '../../../utils';
import {
	mergeCodesInputMethodProperty,
	mergeCodesTagFieldOptions,
	parseMergeCodesJson,
	readFreeFormTagModels,
} from '../../../utils/mergeCodes';
import { limeMarketingRequest } from '../../../transport';

/** @public */
export const description = {
	name: 'Send',
	value: SEND_OPERATION,
	description: 'Send an SMS',
	action: 'Send an SMS',
};

/** @public */
export const properties: INodeProperties[] = [
	{
		displayName: 'From Number',
		name: 'fromNumber',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'e.g. MyCompany',
		description: 'The alphanumeric sender ID shown to the recipient (2–11 characters)',
		displayOptions: {
			show: {
				resource: [TRANSACTIONAL_SMS_RESOURCE],
				operation: [SEND_OPERATION],
			},
		},
	},
	{
		displayName: 'Destination Number',
		name: 'destinationNumber',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'e.g. +46701234567',
		description: 'The recipient phone number in international format, starting with "+"',
		displayOptions: {
			show: {
				resource: [TRANSACTIONAL_SMS_RESOURCE],
				operation: [SEND_OPERATION],
			},
		},
	},
	{
		displayName: 'Text',
		name: 'text',
		type: 'string',
		typeOptions: { rows: 4 },
		required: true,
		default: '',
		description:
			'The SMS body. Use merge codes like {{firstname}} and provide values in Merge Code Mapping below.',
		displayOptions: {
			show: {
				resource: [TRANSACTIONAL_SMS_RESOURCE],
				operation: [SEND_OPERATION],
			},
		},
	},
	mergeCodesInputMethodProperty({
		resource: [TRANSACTIONAL_SMS_RESOURCE],
		operation: [SEND_OPERATION],
	}),
	{
		displayName: 'Merge Code Mapping',
		name: 'textContentTagModels',
		type: 'fixedCollection',
		typeOptions: { multipleValues: true },
		placeholder: 'Add Merge Code',
		default: {},
		description: 'Merge codes and values to substitute into the SMS text',
		displayOptions: {
			show: {
				resource: [TRANSACTIONAL_SMS_RESOURCE],
				operation: [SEND_OPERATION],
				mergeCodesInputMethod: [MERGE_CODES_INPUT_FIELDS],
			},
		},
		options: mergeCodesTagFieldOptions,
	},
	{
		displayName: 'Merge Codes (JSON)',
		name: 'mergeCodesJson',
		type: 'json',
		required: true,
		default: '{\n  "{{firstname}}": "John"\n}',
		description: 'Object mapping each merge code (with braces) to its replacement value',
		typeOptions: {
			alwaysOpenEditWindow: true,
		},
		displayOptions: {
			show: {
				resource: [TRANSACTIONAL_SMS_RESOURCE],
				operation: [SEND_OPERATION],
				mergeCodesInputMethod: [MERGE_CODES_INPUT_JSON],
			},
		},
	},
	{
		displayName: 'Additional Options',
		name: 'additionalOptions',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: {
			show: {
				resource: [TRANSACTIONAL_SMS_RESOURCE],
				operation: [SEND_OPERATION],
			},
		},
		options: [
			{
				displayName: 'Delivery Timeout Hours',
				name: 'deliveryTimeoutHours',
				type: 'number',
				typeOptions: { minValue: 0, maxValue: 168 },
				default: null,
				description:
					'How long (in hours, 0–168) the provider should keep retrying delivery before giving up',
			},
			{
				displayName: 'Max Parts',
				name: 'maxParts',
				type: 'number',
				typeOptions: { minValue: 1 },
				default: null,
				description: 'Maximum number of SMS segments the message is allowed to split into',
			},
			{
				displayName: 'Scheduled Send Date',
				name: 'scheduledSendDate',
				type: 'dateTime',
				default: '',
				description: 'When to send the SMS. Leave empty to send immediately.',
			},
		],
	},
];

// Read merge codes from whichever UI surface is active (JSON or free-form
// fixedCollection) and return them as TagModels.
function readMergeCodes(ctx: IExecuteFunctions, i: number): TagModel[] {
	const method = ctx.getNodeParameter(
		'mergeCodesInputMethod',
		i,
		MERGE_CODES_INPUT_FIELDS,
	) as string;
	if (method === MERGE_CODES_INPUT_JSON) return parseMergeCodesJson(ctx, i);
	return readFreeFormTagModels(ctx.getNodeParameter('textContentTagModels', i, {}) as TagListInput);
}

export async function execute(this: IExecuteFunctions, i: number, baseURL?: string) {
	const fromNumber = this.getNodeParameter('fromNumber', i) as string;
	const destinationNumber = this.getNodeParameter('destinationNumber', i) as string;
	const text = this.getNodeParameter('text', i) as string;

	assertValidSmsFromNumber(this, fromNumber, 'From Number', i);
	assertValidSmsDestinationNumber(this, destinationNumber, 'Destination Number', i);

	const additional = this.getNodeParameter('additionalOptions', i, {}) as AdditionalSmsOptions;

	const textContentTagModels = readMergeCodes(this, i);

	const body: SendTransactionSmsArgs = {
		Text: text,
		FromNumber: fromNumber,
		DestinationNumber: destinationNumber,
		MaxParts: omitEmpty(additional.maxParts),
		DeliveryTimeoutHours: omitEmpty(additional.deliveryTimeoutHours),
		ScheduledSendDate: omitEmpty(additional.scheduledSendDate),
		TextContentTagModels: textContentTagModels.length > 0 ? textContentTagModels : undefined,
	};

	return limeMarketingRequest<TransactionSmsModel>(this, {
		method: 'POST',
		url: 'transactionsms/send',
		body,
		json: true,
		errorContext: 'send SMS',
		baseURL,
	});
}
