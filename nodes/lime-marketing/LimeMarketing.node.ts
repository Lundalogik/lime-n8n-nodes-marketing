import {
    IDataObject,
    IExecuteFunctions,
    INodeExecutionData,
    INodeType,
    INodeTypeDescription,
    NodeApiError,
    NodeConnectionTypes,
    NodeOperationError,
    NodePropertyTypes,
} from 'n8n-workflow';
import {
    LIME_MARKETING_API_CREDENTIAL_KEY,
    TRANSACTIONAL_EMAIL_RESOURCE,
    TRANSACTIONAL_SMS_RESOURCE,
} from './models';
import {
    transactionMailFields,
    transactionMailOperations,
} from './resources/transactionmail';
import {
    transactionSmsFields,
    transactionSmsOperations,
} from './resources/transactionsms';
import { getTemplates, getTemplateMergeCodeMappingColumns } from './methods';
import { getBaseUrl } from './utils';

// What an OperationExecutor returns: either a raw API response object, an
// array of them, or already-wrapped n8n execution items (single or many).
// `undefined` means "no items emitted from this input".
export type OperationExecutorResult =
    | IDataObject
    | IDataObject[]
    | INodeExecutionData
    | INodeExecutionData[]
    | undefined;

// Signature for a per-item operation. Receives the item index and a
// pre-resolved baseURL so we don't re-fetch credentials on every call.
export type OperationExecutor = (
    this: IExecuteFunctions,
    i: number,
    baseURL: string
) => Promise<OperationExecutorResult>;

const OPERATIONS: Record<string, Record<string, OperationExecutor>> = {
    [TRANSACTIONAL_EMAIL_RESOURCE]: transactionMailOperations,
    [TRANSACTIONAL_SMS_RESOURCE]: transactionSmsOperations,
};

function hasJsonField(
    value: IDataObject | INodeExecutionData
): value is INodeExecutionData {
    return 'json' in value;
}

// Wrap one raw response into an n8n execution item, preserving `json` if
// already present and tagging `pairedItem`.
function toExecutionItem(
    raw: IDataObject | INodeExecutionData,
    i: number
): INodeExecutionData {
    const base = hasJsonField(raw) ? raw : { json: raw };
    return { ...base, pairedItem: { item: i } };
}

// Normalize a response (single value, array, or undefined) into an array
// of execution items.
function toExecutionItems(
    responseData: OperationExecutorResult,
    i: number
): INodeExecutionData[] {
    if (responseData === undefined) return [];
    const list = Array.isArray(responseData) ? responseData : [responseData];
    return list.map((item) => toExecutionItem(item, i));
}

// Build an error-flavored execution item for the `continueOnFail` branch,
// attaching the original NodeError when available.
function buildErrorItem(error: Error, i: number): INodeExecutionData {
    const nodeError =
        error instanceof NodeApiError || error instanceof NodeOperationError
            ? error
            : undefined;
    // n8n's executor overwrites `json` with `{ error: error.message }` whenever
    // an item has a top-level `error` field, so anything else in `json` would
    // be discarded before downstream nodes see it.
    return {
        json: { error: error.message },
        error: nodeError,
        pairedItem: { item: i },
    };
}

export class LimeMarketing implements INodeType {
    description: INodeTypeDescription = {
        displayName: 'Lime CRM Marketing',
        name: 'limeMarketing',
        icon: 'file:assets/lime-crm.svg',
        group: ['transform'],
        version: 1,
        subtitle:
            '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
        description:
            'Send transactional emails and SMS via the Lime CRM Marketing API',
        defaults: { name: 'Lime CRM Marketing' },
        inputs: [NodeConnectionTypes.Main],
        outputs: [NodeConnectionTypes.Main],
        credentials: [
            { name: LIME_MARKETING_API_CREDENTIAL_KEY, required: true },
        ],
        usableAsTool: true,
        properties: [
            {
                displayName:
                    'Tip: set On Error to "Continue (using error output)" in the Settings tab to route failed sends down a separate branch. The error output contains the API message as $json.error.',
                name: 'errorHandlingHint',
                type: 'notice',
                default: '',
            },
            {
                displayName: 'Resource',
                name: 'resource',
                type: 'options' as NodePropertyTypes,
                noDataExpression: true,
                options: [
                    {
                        name: 'Email',
                        value: TRANSACTIONAL_EMAIL_RESOURCE,
                        description: 'Send a transactional email',
                    },
                    {
                        name: 'SMS',
                        value: TRANSACTIONAL_SMS_RESOURCE,
                        description: 'Send a transactional SMS',
                    },
                ],
                default: TRANSACTIONAL_EMAIL_RESOURCE,
            },

            ...transactionMailFields,
            ...transactionSmsFields,
        ],
    };

    methods = {
        loadOptions: {
            getTemplates,
        },
        resourceMapping: {
            getTemplateMergeCodeMappingColumns,
        },
    };

    async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
        const items = this.getInputData();
        const resource = this.getNodeParameter('resource', 0) as string;
        const operation = this.getNodeParameter('operation', 0) as string;
        const executor = OPERATIONS[resource]?.[operation];
        if (!executor) return [[]];

        const baseURL = await getBaseUrl(this);
        const returnData: INodeExecutionData[] = [];
        for (let i = 0; i < items.length; i++) {
            try {
                const responseData = await executor.call(this, i, baseURL);
                returnData.push(...toExecutionItems(responseData, i));
            } catch (error_) {
                if (!this.continueOnFail()) throw error_;
                const error =
                    error_ instanceof Error
                        ? error_
                        : new Error(String(error_));
                returnData.push(buildErrorItem(error, i));
            }
        }

        return [returnData];
    }
}
