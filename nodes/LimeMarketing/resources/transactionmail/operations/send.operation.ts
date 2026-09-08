import {
	IExecuteFunctions,
	INodeProperties,
	NodeOperationError,
	ResourceMapperValue,
} from 'n8n-workflow';
import {
	TRANSACTIONAL_EMAIL_RESOURCE,
	SendTransactionMailArgs,
	SendTransactionMailBase,
	SendTransactionMailTemplateArgs,
	TransactionMailModel,
	TagModel,
	AttachmentModel,
	CONTENT_TYPE_TEMPLATE,
	CONTENT_TYPE_CUSTOM,
	CONTENT_TYPE_TEXT,
	MERGE_CODES_INPUT_FIELDS,
	MERGE_CODES_INPUT_JSON,
	SEND_OPERATION,
	TagListInput,
	AttachmentsInput,
	AdditionalMailOptions,
} from '../../../models';
import { buildAttachment, assertValidEmail, omitEmpty } from '../../../utils';
import {
	mergeCodesInputMethodProperty,
	mergeCodesTagFieldOptions,
	parseMergeCodesJson,
	readFreeFormTagModels,
} from '../../../utils/mergeCodes';
import { limeMarketingRequest } from '../../../transport';
import { isMergeCodePlaceholder } from '../../../methods/getTemplateMergeCodeMappingColumns';

/** @public */
export const description = {
	name: 'Send',
	value: SEND_OPERATION,
	description: 'Send an email',
	action: 'Send an email',
};

/** @public */
export const properties: INodeProperties[] = [
	{
		displayName: 'Content Type',
		name: 'contentType',
		type: 'options',
		options: [
			{
				name: 'Lime Marketing Template',
				value: CONTENT_TYPE_TEMPLATE,
				description: 'Use a predefined template in Lime Marketing',
			},
			{
				name: 'Custom HTML',
				value: CONTENT_TYPE_CUSTOM,
				description: 'Provide custom HTML content for the email',
			},
			{
				name: 'Plain Text',
				value: CONTENT_TYPE_TEXT,
				description: 'Provide plain text content for the email',
			},
		],
		default: CONTENT_TYPE_TEMPLATE,
		required: true,
		displayOptions: {
			show: {
				resource: [TRANSACTIONAL_EMAIL_RESOURCE],
				operation: [SEND_OPERATION],
			},
		},
	},
	{
		displayName: 'Template Name or ID',
		name: 'templateId',
		type: 'options',
		required: true,
		default: '',
		description:
			'The Lime Marketing template to send. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
		typeOptions: {
			loadOptionsMethod: 'getTemplates',
		},
		displayOptions: {
			show: {
				resource: [TRANSACTIONAL_EMAIL_RESOURCE],
				operation: [SEND_OPERATION],
				contentType: [CONTENT_TYPE_TEMPLATE],
			},
		},
	},
	{
		displayName: 'HTML Content',
		name: 'htmlContent',
		type: 'string',
		typeOptions: { rows: 5 },
		required: true,
		default: '',
		description: 'The raw HTML body. Will be encoded as a UTF-8 byte array before sending.',
		displayOptions: {
			show: {
				resource: [TRANSACTIONAL_EMAIL_RESOURCE],
				operation: [SEND_OPERATION],
				contentType: [CONTENT_TYPE_CUSTOM],
			},
		},
	},
	{
		displayName: 'Text Content',
		name: 'textContent',
		type: 'string',
		typeOptions: { rows: 5 },
		required: true,
		default: '',
		description: 'The plain text body. Will be encoded as a UTF-8 byte array before sending.',
		displayOptions: {
			show: {
				resource: [TRANSACTIONAL_EMAIL_RESOURCE],
				operation: [SEND_OPERATION],
				contentType: [CONTENT_TYPE_TEXT],
			},
		},
	},
	{
		displayName: 'From Name',
		name: 'fromName',
		type: 'string',
		default: '',
		description: 'The name of the sender',
		displayOptions: {
			show: {
				resource: [TRANSACTIONAL_EMAIL_RESOURCE],
				operation: [SEND_OPERATION],
			},
		},
	},
	{
		displayName: 'From Email',
		name: 'fromEmail',
		type: 'string',
		default: '',
		required: true,
		placeholder: 'e.g. name@your-verified-domain.com',
		description: 'The sender email address. The domain must be verified in Lime Marketing.',
		displayOptions: {
			show: {
				resource: [TRANSACTIONAL_EMAIL_RESOURCE],
				operation: [SEND_OPERATION],
			},
		},
	},
	{
		displayName: 'Recipient Name',
		name: 'recipientName',
		type: 'string',
		default: '',
		description: 'The name of the recipient',
		displayOptions: {
			show: {
				resource: [TRANSACTIONAL_EMAIL_RESOURCE],
				operation: [SEND_OPERATION],
			},
		},
	},
	{
		displayName: 'Recipient Email',
		name: 'recipientEmail',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'e.g. name@example.com',
		description: 'The email address of the recipient',
		displayOptions: {
			show: {
				resource: [TRANSACTIONAL_EMAIL_RESOURCE],
				operation: [SEND_OPERATION],
			},
		},
	},
	{
		displayName: 'Subject',
		name: 'subject',
		type: 'string',
		default: '',
		placeholder: 'e.g. Your order has shipped',
		description: 'The subject line of the email',
		displayOptions: {
			show: {
				resource: [TRANSACTIONAL_EMAIL_RESOURCE],
				operation: [SEND_OPERATION],
			},
		},
	},
	{
		displayName: 'Track Openings',
		name: 'trackOpenings',
		type: 'boolean',
		default: false,
		description: 'Whether to track when recipients open the email',
		displayOptions: {
			show: {
				resource: [TRANSACTIONAL_EMAIL_RESOURCE],
				operation: [SEND_OPERATION],
			},
		},
	},
	{
		displayName: 'Track Link Clicks',
		name: 'trackLinkClicks',
		type: 'boolean',
		default: false,
		description: 'Whether to track when recipients click links in the email',
		displayOptions: {
			show: {
				resource: [TRANSACTIONAL_EMAIL_RESOURCE],
				operation: [SEND_OPERATION],
			},
		},
	},
	mergeCodesInputMethodProperty({
		resource: [TRANSACTIONAL_EMAIL_RESOURCE],
		operation: [SEND_OPERATION],
		contentType: [CONTENT_TYPE_TEMPLATE, CONTENT_TYPE_CUSTOM, CONTENT_TYPE_TEXT],
	}),
	{
		displayName: 'Merge Code Mapping',
		name: 'templateMergeCodes',
		type: 'resourceMapper',
		noDataExpression: true,
		default: { mappingMode: 'defineBelow', value: null },
		description:
			'Each merge code from the selected template is shown below. Provide a value for the codes you want to replace.',
		typeOptions: {
			resourceMapper: {
				resourceMapperMethod: 'getTemplateMergeCodeMappingColumns',
				mode: 'add',
				addAllFields: true,
				supportAutoMap: false,
				fieldWords: { singular: 'merge code', plural: 'merge codes' },
			},
			loadOptionsDependsOn: ['templateId'],
		},
		displayOptions: {
			show: {
				resource: [TRANSACTIONAL_EMAIL_RESOURCE],
				operation: [SEND_OPERATION],
				contentType: [CONTENT_TYPE_TEMPLATE],
				mergeCodesInputMethod: [MERGE_CODES_INPUT_FIELDS],
			},
		},
	},
	{
		displayName: 'Merge Code Mapping',
		name: 'mergeCodesFreeForm',
		type: 'fixedCollection',
		typeOptions: { multipleValues: true },
		placeholder: 'Add Merge Code',
		default: {},
		description: 'Merge codes and values to substitute into the content',
		displayOptions: {
			show: {
				resource: [TRANSACTIONAL_EMAIL_RESOURCE],
				operation: [SEND_OPERATION],
				contentType: [CONTENT_TYPE_CUSTOM, CONTENT_TYPE_TEXT],
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
		default: '{\n  "{{mergecode}}": ""\n}',
		description:
			'Object mapping each merge code (with braces) to its replacement value. Example: {"{{mergecode}}": "value"}.',
		typeOptions: {
			alwaysOpenEditWindow: true,
		},
		displayOptions: {
			show: {
				resource: [TRANSACTIONAL_EMAIL_RESOURCE],
				operation: [SEND_OPERATION],
				contentType: [CONTENT_TYPE_TEMPLATE, CONTENT_TYPE_CUSTOM, CONTENT_TYPE_TEXT],
				mergeCodesInputMethod: [MERGE_CODES_INPUT_JSON],
			},
		},
	},
	{
		displayName: 'Attachments',
		name: 'attachments',
		type: 'fixedCollection',
		typeOptions: { multipleValues: true },
		placeholder: 'Add Attachment',
		default: {},
		displayOptions: {
			show: {
				resource: [TRANSACTIONAL_EMAIL_RESOURCE],
				operation: [SEND_OPERATION],
			},
		},
		options: [
			{
				name: 'attachment',
				displayName: 'Attachment',
				values: [
					{
						displayName: 'Binary Property Name',
						name: 'binaryPropertyName',
						type: 'string',
						default: 'data',
						required: true,
						description:
							'Name of the binary property on the incoming item (e.g. "data"). The upstream node — HTTP Request, Read Binary File, etc. — attaches files under this key.',
					},
					{
						displayName: 'File Name Override',
						name: 'fileNameOverride',
						type: 'string',
						default: '',
						description:
							'Optional. If the upstream binary does not have a fileName set, provide one here (must include extension, e.g. "report.pdf").',
					},
				],
			},
		],
	},
	{
		displayName: 'Additional Options',
		name: 'additionalOptions',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: {
			show: {
				resource: [TRANSACTIONAL_EMAIL_RESOURCE],
				operation: [SEND_OPERATION],
			},
		},
		options: [
			{
				displayName: 'Sender Name',
				name: 'senderName',
				type: 'string',
				default: '',
				description: 'Display name shown as the sender',
			},
			{
				displayName: 'Sender Email',
				name: 'senderEmail',
				type: 'string',
				placeholder: 'e.g. name@example.com',
				default: '',
				description: 'Email address shown as the sender. Must be on a verified domain.',
			},
			{
				displayName: 'Reply-To',
				name: 'replyTo',
				type: 'string',
				placeholder: 'e.g. name@example.com',
				default: '',
				description: 'Email address recipients will reply to',
			},
			{
				displayName: 'Scheduled Send Date',
				name: 'scheduledSendDate',
				type: 'dateTime',
				default: '',
				description: 'When to send the email. Leave empty to send immediately.',
			},
			{
				displayName: 'External ID',
				name: 'externalId',
				type: 'string',
				default: '',
				description: 'Your own identifier for tracking this email',
			},
			{
				displayName: 'Exclude Publication Opt-Outs',
				name: 'excludePublicationOptouts',
				type: 'boolean',
				default: false,
				description: 'Whether to skip recipients who opted out of this publication',
			},
			{
				displayName: 'Exclude Total Opt-Outs',
				name: 'excludeTotalOptouts',
				type: 'boolean',
				default: false,
				description: 'Whether to skip recipients who opted out of all email',
			},
			{
				displayName: 'Exclude Previously Bounced',
				name: 'excludePreviousBounce',
				type: 'boolean',
				default: false,
				description: 'Whether to skip recipients whose previous emails bounced',
			},
			{
				displayName: 'Link Base URL',
				name: 'linkBaseUrl',
				type: 'string',
				default: '',
				placeholder: 'e.g. https://links.example.com',
				description: 'Base URL used for click-tracked links. Leave empty to use the default.',
			},
			{
				displayName: 'Include Email Data In Webhook Payload',
				name: 'includeEmailDataInWebhookPayload',
				type: 'boolean',
				default: false,
				description: 'Whether delivery webhooks should include the full email body',
			},
			{
				displayName: 'Headers',
				name: 'headers',
				type: 'fixedCollection',
				typeOptions: { multipleValues: true },
				placeholder: 'Add Header',
				default: {},
				description: 'Custom email headers to include',
				options: [
					{
						name: 'header',
						displayName: 'Header',
						values: [
							{
								displayName: 'Name',
								name: 'name',
								type: 'string',
								default: '',
								placeholder: 'e.g. X-Custom-Header',
							},
							{
								displayName: 'Value',
								name: 'value',
								type: 'string',
								default: '',
							},
						],
					},
				],
			},
		],
	},
];

// Read merge codes from whichever UI surface is active (JSON, template
// resource-mapper, or free-form fixedCollection) and return them as TagModels.
function readMergeCodes(ctx: IExecuteFunctions, i: number, contentType: string): TagModel[] {
	const method = ctx.getNodeParameter(
		'mergeCodesInputMethod',
		i,
		MERGE_CODES_INPUT_FIELDS,
	) as string;
	if (method === MERGE_CODES_INPUT_JSON) return parseMergeCodesJson(ctx, i);
	if (contentType === CONTENT_TYPE_TEMPLATE) {
		const input = ctx.getNodeParameter('templateMergeCodes', i, {}) as ResourceMapperValue;
		const value = input.value ?? {};
		// Emit only the merge codes the user kept in the resource mapper.
		// Removed rows aren't in `value`, so the API leaves their placeholder
		// literal. Blank values stay in `value` as `''` and replace with
		// empty string.
		return Object.entries(value)
			.filter(([Name]) => !isMergeCodePlaceholder(Name))
			.map(([Name, v]) => ({
				Name,
				Value: v === undefined || v === null ? '' : String(v),
			}));
	}
	return readFreeFormTagModels(ctx.getNodeParameter('mergeCodesFreeForm', i, {}) as TagListInput);
}

async function readAttachments(ctx: IExecuteFunctions, i: number): Promise<AttachmentModel[]> {
	const input = ctx.getNodeParameter('attachments', i, {}) as AttachmentsInput;
	const attachments: AttachmentModel[] = [];
	for (const row of input.attachment ?? []) {
		attachments.push(await buildAttachment(ctx, i, row.binaryPropertyName, row.fileNameOverride));
	}
	return attachments;
}

// Flatten the Headers fixedCollection rows into a name → value record,
// skipping rows with an empty name.
function buildCustomHeaders(additional: AdditionalMailOptions): Record<string, string> {
	const headers: Record<string, string> = {};
	for (const h of additional.headers?.header ?? []) {
		if (h.name) headers[h.name] = h.value;
	}
	return headers;
}

// Encode a string as the UTF-8 byte array Lime Marketing's send endpoint expects
// for HtmlContent / TextContent.
function encodeUtf8Bytes(content: string): number[] {
	return Array.from(Buffer.from(content, 'utf8'));
}

// Pick the right send endpoint and shape the request body based on the
// content type: template → /sendtemplate with TemplateId; custom HTML / plain
// text → /send with HtmlContent or TextContent as a UTF-8 byte array.
function buildContentRequest(
	ctx: IExecuteFunctions,
	i: number,
	contentType: string,
	body: SendTransactionMailBase,
): {
	url: string;
	body: SendTransactionMailArgs | SendTransactionMailTemplateArgs;
} {
	if (contentType === CONTENT_TYPE_TEMPLATE) {
		const templateIdRaw = ctx.getNodeParameter('templateId', i);
		const templateId = Number(templateIdRaw);
		if (!Number.isFinite(templateId) || templateId <= 0) {
			throw new NodeOperationError(
				ctx.getNode(),
				`Template is not a valid template id: ${String(templateIdRaw)}`,
				{
					itemIndex: i,
					description:
						'Expected a positive integer matching a template in Lime Marketing. Pick one from the Template dropdown, or ensure any upstream expression resolves to a numeric template id.',
				},
			);
		}
		const templateBody: SendTransactionMailTemplateArgs = {
			...body,
			TemplateId: templateId,
		};
		return { url: 'transactionmail/sendtemplate', body: templateBody };
	}
	const isText = contentType === CONTENT_TYPE_TEXT;
	const paramName = isText ? 'textContent' : 'htmlContent';
	const raw = ctx.getNodeParameter(paramName, i) as string;
	const content = encodeUtf8Bytes(raw);
	const customBody: SendTransactionMailArgs = isText
		? { ...body, TextContent: content }
		: { ...body, HtmlContent: content };
	return { url: 'transactionmail/send', body: customBody };
}

export async function execute(this: IExecuteFunctions, i: number, baseURL?: string) {
	const contentType = this.getNodeParameter('contentType', i) as string;
	const fromEmail = (this.getNodeParameter('fromEmail', i) as string).trim();
	if (!fromEmail) {
		throw new NodeOperationError(this.getNode(), 'From Email is required.', {
			itemIndex: i,
			description:
				'Set a verified sender address. If From Email is wired to an upstream expression, make sure it resolves to a non-empty string.',
		});
	}

	const additional = this.getNodeParameter('additionalOptions', i, {}) as AdditionalMailOptions;

	const recipientEmail = this.getNodeParameter('recipientEmail', i) as string;
	assertValidEmail(this, recipientEmail, 'Recipient Email', i);
	assertValidEmail(this, fromEmail, 'From Email', i);
	if (additional.senderEmail) assertValidEmail(this, additional.senderEmail, 'Sender Email', i);
	if (additional.replyTo) assertValidEmail(this, additional.replyTo, 'Reply-To', i);

	const tagModels = readMergeCodes(this, i, contentType);
	const tagModelsField = tagModels.length > 0 ? tagModels : undefined;
	const attachments = await readAttachments(this, i);
	const customHeaders = buildCustomHeaders(additional);

	const baseBody: SendTransactionMailBase = {
		RecipientEmail: recipientEmail,
		RecipientName: omitEmpty(this.getNodeParameter('recipientName', i) as string),
		Subject: omitEmpty(this.getNodeParameter('subject', i) as string),
		FromName: omitEmpty(this.getNodeParameter('fromName', i) as string),
		FromEmail: fromEmail,
		SenderName: omitEmpty(additional.senderName),
		SenderEmail: omitEmpty(additional.senderEmail),
		TrackLinkClicks: this.getNodeParameter('trackLinkClicks', i) as boolean,
		TrackOpenings: this.getNodeParameter('trackOpenings', i) as boolean,
		HtmlContentTagModels: tagModelsField,
		TextContentTagModels: tagModelsField,
		Attachments: attachments.length > 0 ? attachments : undefined,
		ReplyTo: omitEmpty(additional.replyTo),
		ScheduledSendDate: omitEmpty(additional.scheduledSendDate),
		ExternalId: omitEmpty(additional.externalId),
		ExcludePublicationOptouts: additional.excludePublicationOptouts,
		ExcludeTotaloptouts: additional.excludeTotalOptouts,
		ExcludePreviousBounce: additional.excludePreviousBounce,
		LinkBaseUrl: omitEmpty(additional.linkBaseUrl),
		IncludeEmailDataInWebhookPayload: additional.includeEmailDataInWebhookPayload,
		Headers: Object.keys(customHeaders).length > 0 ? customHeaders : undefined,
	};

	const { url, body } = buildContentRequest(this, i, contentType, baseBody);

	return limeMarketingRequest<TransactionMailModel>(this, {
		method: 'POST',
		url,
		body,
		json: true,
		errorContext: 'send email',
		baseURL,
	});
}
