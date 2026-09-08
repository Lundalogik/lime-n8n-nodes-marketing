// Types used by the lime-marketing transport's error pipeline.

export type LimeMarketingErrorBody = {
    Message?: string;
    ErrorDetails?: { Context?: string; Message?: string }[];
};
