import { IAllExecuteFunctions, IExecuteFunctions, NodeOperationError } from 'n8n-workflow';
import { LIME_MARKETING_API_CREDENTIAL_KEY, AttachmentModel } from '../models';

/**
 * Matches the server-side Lime Marketing email regex so we fail fast in the
 * node rather than round-tripping an obviously bad address to the API.
 *
 * Source:
 *   EmailUsernamePartRegex = @"([a-zA-Z0-9_\-\.'\+\!\#\$\%\&\?\=\^\{\}\|\~\*]+)"
 *   EmailRegexPattern = "^" + username + "@((\[ipv4\])|(([a-zA-Z0-9-_]+\.)*([a-zA-Z0-9-]+)\.[a-zA-Z0-9]{2,15}))$"
 */
const LIME_MARKETING_EMAIL_REGEX =
	/^([a-zA-Z0-9_\-.'+!#$%&?=^{}|~*]+)@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z0-9\-_]+\.)*([a-zA-Z0-9-]+)\.[a-zA-Z0-9]{2,15}))$/;

export function assertValidEmail(
	context: IExecuteFunctions,
	email: string,
	fieldLabel: string,
	itemIndex: number,
): void {
	if (LIME_MARKETING_EMAIL_REGEX.test(email)) return;
	throw new NodeOperationError(
		context.getNode(),
		`${fieldLabel} is not a valid email address: ${email}`,
		{
			itemIndex,
			description:
				'Expected a format like name@example.com. Lime Marketing rejects addresses that do not match its email pattern.',
		},
	);
}

/**
 * Destination phone number regex from the /transactionsms/send schema:
 *   ^([+]+[1-9]{2})+\d{5,20}$
 * Expects an E.164-style number starting with "+" and a non-zero country code.
 */
const LIME_MARKETING_SMS_DESTINATION_REGEX = /^([+]+[1-9]{2})+\d{5,20}$/;

/**
 * Sender (FromNumber) regex from the /transactionsms/send schema — alphanumeric
 * sender ID, 2–11 chars, Nordic letters + digits + _ - allowed, spaces allowed
 * but not as first/last character:
 *   ^[a-zA-ZåäöÅÄÖæÆøØüÜ_\-\d][a-zA-ZåäöÅÄÖæÆøØüÜ_\-\d\s]{0,9}[a-zA-ZåäöÅÄÖæÆøØüÜ_\-\d]$
 */
const LIME_MARKETING_SMS_FROM_NUMBER_REGEX =
	/^[a-zA-ZåäöÅÄÖæÆøØüÜ_\-\d][a-zA-ZåäöÅÄÖæÆøØüÜ_\-\d\s]{0,9}[a-zA-ZåäöÅÄÖæÆøØüÜ_\-\d]$/;

export function assertValidSmsDestinationNumber(
	context: IExecuteFunctions,
	value: string,
	fieldLabel: string,
	itemIndex: number,
): void {
	if (LIME_MARKETING_SMS_DESTINATION_REGEX.test(value)) return;
	throw new NodeOperationError(
		context.getNode(),
		`${fieldLabel} is not a valid phone number: ${value}`,
		{
			itemIndex,
			description: 'Expected an international format starting with "+", e.g. +46701234567.',
		},
	);
}

export function assertValidSmsFromNumber(
	context: IExecuteFunctions,
	value: string,
	fieldLabel: string,
	itemIndex: number,
): void {
	if (LIME_MARKETING_SMS_FROM_NUMBER_REGEX.test(value)) return;
	throw new NodeOperationError(
		context.getNode(),
		`${fieldLabel} is not a valid sender ID: ${value}`,
		{
			itemIndex,
			description:
				'Expected 2–11 characters: letters, digits, underscores, hyphens, or spaces (spaces not allowed at start/end).',
		},
	);
}

type LimeMarketingCredentials = {
	url: string;
	apiKey: string;
};

export async function getBaseUrl(context: IAllExecuteFunctions): Promise<string> {
	const credentials = (await context.getCredentials(
		LIME_MARKETING_API_CREDENTIAL_KEY,
	)) as unknown as LimeMarketingCredentials;
	let url = credentials.url;
	while (url.endsWith('/')) url = url.slice(0, -1);
	return url;
}

/**
 * Coerces empty/null values to undefined so the property is dropped from the
 * outbound JSON payload rather than sent as "" or null.
 *
 * n8n's `collection` UI defaults to '' for string fields and null for number
 * fields with `default: null`; we treat both as "user did not set this".
 *
 * @param value - The value to normalize.
 */
export function omitEmpty<T>(value: T | '' | null | undefined): T | undefined {
	if (value === '' || value === null || value === undefined) return undefined;
	return value;
}

export async function buildAttachment(
	context: IExecuteFunctions,
	i: number,
	binaryPropertyName: string,
	fileNameOverride?: string,
): Promise<AttachmentModel> {
	const binaryData = context.helpers.assertBinaryData(i, binaryPropertyName);
	const fileName = fileNameOverride || binaryData.fileName;
	if (!fileName) {
		throw new NodeOperationError(
			context.getNode(),
			`Attachment "${binaryPropertyName}" is missing a file name. Set one via "File Name Override" or ensure the upstream node sets it.`,
		);
	}
	return {
		FileData: binaryData.data,
		FileNameWithExtension: fileName,
		MimeType: binaryData.mimeType,
	};
}
