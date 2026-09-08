import {
    IAllExecuteFunctions,
    IHttpRequestOptions,
    NodeApiError,
} from 'n8n-workflow';
import { LIME_MARKETING_API_CREDENTIAL_KEY } from '../models';
import { getBaseUrl } from '../utils';
import { SuccessResponse } from '../../response';
import { LimeMarketingErrorBody } from '../models';

const formatErrorDetails = (
    details: LimeMarketingErrorBody['ErrorDetails']
): string =>
    (details ?? [])
        .map((d) => [d?.Message, d?.Context].filter(Boolean).join(': '))
        .filter(Boolean)
        .join('; ');

const createErrorMessage = (error: NodeApiError): string => {
    const data = error.context.data as LimeMarketingErrorBody;
    const message = data.Message ?? '';
    const details = formatErrorDetails(data.ErrorDetails);
    return details ? `${message}: ${details}` : message;
};

export type LimeMarketingRequestOptions = Omit<
    IHttpRequestOptions,
    'baseURL'
> & {
    /**
     * Action being performed, used to prefix error messages.
     * Example: 'send email' → "Failed to send email: <api message>".
     */
    errorContext?: string;
    /**
     * Pre-resolved base URL. Pass it once at the top of execute() to avoid
     * re-fetching credentials on every per-item HTTP call.
     */
    baseURL?: string;
};

export async function limeMarketingRequest<T>(
    context: IAllExecuteFunctions,
    options: LimeMarketingRequestOptions
): Promise<SuccessResponse<T>> {
    const { baseURL: providedBaseURL, ...httpOptions } = options;
    const baseURL = providedBaseURL ?? (await getBaseUrl(context));
    try {
        const data = await context.helpers.httpRequestWithAuthentication.call(
            context,
            LIME_MARKETING_API_CREDENTIAL_KEY,
            { ...httpOptions, baseURL }
        );
        return {
            success: true,
            data: data,
        };
    } catch (error) {
        // Throw so the node's per-item try/catch routes the failure to the
        // error output (n8n's canonical pattern). Returning an error envelope
        // here would make the item look like a success.
        throw new NodeApiError(context.getNode(), {
            message: createErrorMessage(error),
        });
    }
}
