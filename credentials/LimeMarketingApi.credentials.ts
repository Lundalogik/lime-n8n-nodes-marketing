import {
    ICredentialType,
    INodeProperties,
    IHttpRequestMethods,
    IAuthenticate,
    ICredentialTestRequest,
    IAuthenticateRuleResponseSuccessBody,
} from 'n8n-workflow';
import { LIME_MARKETING_API_CREDENTIAL_KEY } from '../nodes/lime-marketing/models';

/**
 * Credential for the Lime Marketing REST API.
 *
 * Authenticates by sending the user's API key in the `apikey` header on
 * every request. The base URL is the customer's Lime Marketing instance
 * URL (e.g. `https://app.bwz.se/bedrock/CUSTOMERNAME/api/`); a trailing
 * slash is stripped before use so callers can pass paths starting with
 * or without one.
 *
 * The credential is verified at save time via a `GET /ping/version`
 * request to the configured base URL. A 2xx status alone is not trusted:
 * a misconfigured URL can hit a catch-all page that also returns 2xx, so
 * the test additionally asserts that the response body is a real Lime
 * Marketing `VersionModel` (it carries a `Version` field). Without that
 * body check the test would pass for any host that answers 2xx.
 *
 * @public
 */
export class LimeMarketingApi implements ICredentialType {
    name = LIME_MARKETING_API_CREDENTIAL_KEY;
    displayName = 'Lime CRM Marketing API';
    icon = 'file:assets/lime-crm.svg' as const;
    properties: INodeProperties[] = [
        {
            displayName: 'Lime CRM Marketing API URL',
            name: 'url',
            type: 'string',
            default: '',
            placeholder: 'e.g. https://app.bwz.se/bedrock/CUSTOMERNAME/api/',
            required: true,
            description:
                'The URL of your Lime Marketing instance, for example https://app.bwz.se/bedrock/CUSTOMERNAME/api/',
        },
        {
            displayName: 'API Key',
            name: 'apiKey',
            type: 'string',
            typeOptions: {
                password: true,
            },
            default: '',
            required: true,
            description: 'The API key obtained from Lime Marketing',
        },
    ];

    authenticate: IAuthenticate = {
        type: 'generic',
        properties: {
            headers: {
                apikey: '={{$credentials.apiKey}}',
            },
        },
    };

    test: ICredentialTestRequest = {
        request: {
            baseURL: '={{$credentials?.url?.replace(new RegExp("/+$"), "")}}',
            url: '/ping/version',
            method: 'GET' as IHttpRequestMethods,
            headers: {
                apikey: '={{$credentials?.apiKey}}',
                Accept: 'application/json',
            },
        },
        // `responseSuccessBody` fails the test when body[key] === value. The
        // real /ping/version returns a VersionModel with a `Version` field, so
        // a missing `Version` (=== undefined) means we hit something other than
        // the Lime Marketing API (e.g. a catch-all page) and the URL is wrong.
        rules: [
            {
                type: 'responseSuccessBody',
                properties: {
                    key: 'Version',
                    value: undefined,
                    message:
                        'The URL does not point to a Lime Marketing API. Check it matches https://app.bwz.se/bedrock/CUSTOMERNAME/api/.',
                },
            } as IAuthenticateRuleResponseSuccessBody,
        ],
    };
}
