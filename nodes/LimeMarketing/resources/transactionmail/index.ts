import { INodeProperties } from 'n8n-workflow';
import { SEND_OPERATION, TRANSACTIONAL_EMAIL_RESOURCE } from '../../models';
import * as send from './operations/send.operation';

export const transactionMailFields: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: { resource: [TRANSACTIONAL_EMAIL_RESOURCE] },
		},
		options: [send.description],
		default: SEND_OPERATION,
	},
	...send.properties,
];

export const transactionMailOperations = {
	[SEND_OPERATION]: send.execute,
};
