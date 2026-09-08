import { INodeProperties } from 'n8n-workflow';
import { SEND_OPERATION, TRANSACTIONAL_SMS_RESOURCE } from '../../models';
import * as send from './operations/send.operation';

export const transactionSmsFields: INodeProperties[] = [
    {
        displayName: 'Operation',
        name: 'operation',
        type: 'options',
        noDataExpression: true,
        displayOptions: {
            show: { resource: [TRANSACTIONAL_SMS_RESOURCE] },
        },
        options: [send.description],
        default: SEND_OPERATION,
    },
    ...send.properties,
];

export const transactionSmsOperations = {
    [SEND_OPERATION]: send.execute,
};
