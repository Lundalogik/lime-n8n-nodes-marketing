// Tests for the SMS send operation. Mocks the HTTP transport so we can
// assert what URL the operation hits and what request body it builds for
// each combination of UI inputs.

jest.mock('../../../nodes/lime-marketing/transport', () => ({
    limeMarketingRequest: jest.fn().mockResolvedValue({}),
    getBaseUrl: jest.fn(),
}));

import { NodeOperationError } from 'n8n-workflow';
import { execute } from '../../../nodes/lime-marketing/resources/transactionsms/operations/send.operation';
import {
    baselineSmsParams,
    lastCallBody,
    lastCallUrl,
    makeSendContext,
    transportMock,
} from './_helpers';

beforeEach(() => {
    transportMock.mockClear();
});

describe('SMS send — happy paths', () => {
    it('Form (fields): builds expected payload', async () => {
        const ctx = makeSendContext({
            ...baselineSmsParams,
            mergeCodesInputMethod: 'fields',
            textContentTagModels: {
                tag: [{ name: '{{firstname}}', value: 'John' }],
            },
            additionalOptions: {
                maxParts: 3,
                deliveryTimeoutHours: 12,
                scheduledSendDate: '2026-01-01T08:00:00.000Z',
            },
        });

        await execute.call(ctx, 0);

        expect(lastCallUrl()).toBe('transactionsms/send');
        const body = lastCallBody();
        expect(body.FromNumber).toBe('Acme');
        expect(body.DestinationNumber).toBe('+46701234567');
        expect(body.Text).toBe('Hello');
        expect(body.MaxParts).toBe(3);
        expect(body.DeliveryTimeoutHours).toBe(12);
        expect(body.ScheduledSendDate).toBe('2026-01-01T08:00:00.000Z');
        expect(body.TextContentTagModels).toEqual([
            { Name: '{{firstname}}', Value: 'John' },
        ]);
    });

    it('JSON: parses mergeCodesJson into TagModels', async () => {
        const ctx = makeSendContext({
            ...baselineSmsParams,
            mergeCodesInputMethod: 'json',
            mergeCodesJson: '{"{{firstname}}": "Jane"}',
        });

        await execute.call(ctx, 0);

        expect(lastCallBody().TextContentTagModels).toEqual([
            { Name: '{{firstname}}', Value: 'Jane' },
        ]);
    });

    it('omits TextContentTagModels when no merge codes', async () => {
        const ctx = makeSendContext({
            ...baselineSmsParams,
            mergeCodesInputMethod: 'fields',
            textContentTagModels: {},
        });

        await execute.call(ctx, 0);

        expect(lastCallBody().TextContentTagModels).toBeUndefined();
    });
});

describe('SMS send — validation', () => {
    it('throws on invalid destinationNumber (missing "+")', async () => {
        const ctx = makeSendContext({
            ...baselineSmsParams,
            destinationNumber: '12345',
        });

        await expect(execute.call(ctx, 0)).rejects.toThrow(
            /Destination Number/i
        );
        await expect(execute.call(ctx, 0)).rejects.toBeInstanceOf(
            NodeOperationError
        );
    });

    it('throws on invalid fromNumber (whitespace only)', async () => {
        const ctx = makeSendContext({
            ...baselineSmsParams,
            fromNumber: ' ',
        });

        await expect(execute.call(ctx, 0)).rejects.toThrow(/From Number/i);
    });

    it('throws on invalid mergeCodesJson', async () => {
        const ctx = makeSendContext({
            ...baselineSmsParams,
            mergeCodesInputMethod: 'json',
            mergeCodesJson: '{broken',
        });

        await expect(execute.call(ctx, 0)).rejects.toThrow(
            /Merge Codes \(JSON\) is not valid JSON/i
        );
    });
});
