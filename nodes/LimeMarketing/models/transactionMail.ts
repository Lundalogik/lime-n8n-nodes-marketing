export type AttachmentModel = {
	FileData: string;
	FileNameWithExtension: string;
	MimeType: string;
};

export type TagModel = {
	Name: string;
	Value?: string;
};

export type SendTransactionMailBase = {
	RecipientEmail: string;
	RecipientName?: string;
	SenderName?: string;
	SenderEmail?: string;
	FromName?: string;
	FromEmail?: string;
	ReplyTo?: string;
	Subject?: string;
	ScheduledSendDate?: string;
	ExternalId?: string;
	Attachments?: AttachmentModel[];
	TrackOpenings?: boolean;
	ExcludePublicationOptouts?: boolean;
	ExcludeTotaloptouts?: boolean;
	ExcludePreviousBounce?: boolean;
	TrackLinkClicks?: boolean;
	LinkBaseUrl?: string;
	HtmlContentTagModels?: TagModel[];
	TextContentTagModels?: TagModel[];
	Headers?: Record<string, string>;
	IncludeEmailDataInWebhookPayload?: boolean;
};

export type SendTransactionMailArgs = SendTransactionMailBase & {
	HtmlContent?: number[];
	TextContent?: number[];
};

export type SendTransactionMailTemplateArgs = SendTransactionMailBase & {
	TemplateId: number;
};

export type TransactionMailModel = {
	TransactionMailId: number;
	RecipientName: string;
	RecipientEmail: string;
	SenderName: string;
	SenderEmail: string;
	FromName: string;
	FromEmail: string;
	ReplyTo: string;
	Subject: string;
	TrackOpenings: boolean;
	TrackLinkClicks: boolean;
	LinkBaseUrl: string;
	ExternalId: string;
	ExcludeTotalOptouts: boolean;
	ExcludePublicationOptouts: boolean;
	ExcludePreviousBounce: boolean;
	IsInternalMail: boolean;
	CreationDate: string;
	IncludeEmailDataInWebhookPayload: boolean;
};
