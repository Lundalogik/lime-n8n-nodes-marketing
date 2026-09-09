export {
	LIME_MARKETING_API_CREDENTIAL_KEY,
	TRANSACTIONAL_EMAIL_RESOURCE,
	TRANSACTIONAL_SMS_RESOURCE,
	CONTENT_TYPE_TEMPLATE,
	CONTENT_TYPE_CUSTOM,
	CONTENT_TYPE_TEXT,
	MERGE_CODES_INPUT_FIELDS,
	MERGE_CODES_INPUT_JSON,
	SEND_OPERATION,
} from './constants';
export type { MailTemplate } from './template';
export type {
	AttachmentModel,
	TagModel,
	SendTransactionMailArgs,
	SendTransactionMailBase,
	SendTransactionMailTemplateArgs,
	TransactionMailModel,
} from './transactionMail';
export type { SendTransactionSmsArgs, TransactionSmsModel } from './transactionSms';
export type {
	TagListInput,
	AttachmentsInput,
	HeadersInput,
	AdditionalMailOptions,
	AdditionalSmsOptions,
} from './operationInputs';
export type { LimeMarketingErrorBody } from './transportError';
