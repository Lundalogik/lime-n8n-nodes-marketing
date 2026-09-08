// Named types for the shapes n8n's `getNodeParameter` returns for our
// fixedCollection / collection inputs. The shapes are dictated by the
// `properties[]` definitions in each send.operation.ts; lifting them here
// gives us one source of truth and lets call sites avoid inline `as { ... }`
// structures.

export type TagListInput = {
    tag?: { name: string; value?: string }[];
};

export type AttachmentsInput = {
    attachment?: {
        binaryPropertyName: string;
        fileNameOverride?: string;
    }[];
};

export type HeadersInput = {
    header?: { name: string; value: string }[];
};

export type AdditionalMailOptions = {
    senderName?: string;
    senderEmail?: string;
    replyTo?: string;
    scheduledSendDate?: string;
    externalId?: string;
    excludePublicationOptouts?: boolean;
    excludeTotalOptouts?: boolean;
    excludePreviousBounce?: boolean;
    linkBaseUrl?: string;
    includeEmailDataInWebhookPayload?: boolean;
    headers?: HeadersInput;
};

export type AdditionalSmsOptions = {
    maxParts?: number | null;
    deliveryTimeoutHours?: number | null;
    scheduledSendDate?: string;
};
