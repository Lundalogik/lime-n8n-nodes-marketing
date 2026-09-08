import { TagModel } from './transactionMail';

export type SendTransactionSmsArgs = {
	Text: string;
	FromNumber: string;
	DestinationNumber: string;
	MaxParts?: number;
	DeliveryTimeoutHours?: number;
	ScheduledSendDate?: string;
	TextContentTagModels?: TagModel[];
};

export type TransactionSmsModel = {
	TransactionSmsId: number;
	DestinationNumber: string;
	FromNumber: string;
	MaxParts: number | null;
	ScheduledSendTime: string | null;
	Text: string;
	DeliveryTimeoutHours: number;
	CreationDate: string;
};
