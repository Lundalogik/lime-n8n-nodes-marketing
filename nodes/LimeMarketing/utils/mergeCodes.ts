import {
	IDisplayOptions,
	IExecuteFunctions,
	INodeProperties,
	NodeOperationError,
} from 'n8n-workflow';
import {
	MERGE_CODES_INPUT_FIELDS,
	MERGE_CODES_INPUT_JSON,
	TagListInput,
	TagModel,
} from '../models';

// Read the "Merge Codes (JSON)" parameter (already-parsed object or string)
// and turn it into TagModels. Throws NodeOperationError with item context on
// invalid JSON or non-object roots.
export function parseMergeCodesJson(ctx: IExecuteFunctions, i: number): TagModel[] {
	const jsonInput = ctx.getNodeParameter('mergeCodesJson', i) as string | Record<string, string>;
	let parsed: Record<string, unknown>;
	try {
		parsed = typeof jsonInput === 'string' ? JSON.parse(jsonInput) : jsonInput;
	} catch (error_) {
		const message = error_ instanceof Error ? error_.message : String(error_);
		throw new NodeOperationError(
			ctx.getNode(),
			`Merge Codes (JSON) is not valid JSON: ${message}`,
			{
				itemIndex: i,
				description: 'Enter a valid JSON object, for example: { "{{firstname}}": "John" }',
			},
		);
	}
	if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
		throw new NodeOperationError(
			ctx.getNode(),
			'Merge Codes (JSON) must be a JSON object of { mergeCode: value } pairs.',
			{
				itemIndex: i,
				description: 'Example: { "{{firstname}}": "John", "{{custom}}": "value" }',
			},
		);
	}
	// Match the template-mapper path: send "" rather than the literal
	// strings "null" / "undefined" when the user supplied either.
	return Object.entries(parsed).map(([Name, Value]) => ({
		Name,
		Value: Value === null || Value === undefined ? '' : String(Value),
	}));
}

export function readFreeFormTagModels(input: TagListInput | undefined): TagModel[] {
	return (input?.tag ?? []).map((t) => ({ Name: t.name, Value: t.value }));
}

// Build the "Merge Codes Input Method" UI dropdown (Form vs JSON Object) for
// the given displayOptions.show selector. Reused by both email and SMS sends.
export function mergeCodesInputMethodProperty(
	displayOptionsShow: NonNullable<IDisplayOptions['show']>,
): INodeProperties {
	return {
		displayName: 'Merge Codes Input Method',
		name: 'mergeCodesInputMethod',
		type: 'options',
		options: [
			{
				name: 'Form',
				value: MERGE_CODES_INPUT_FIELDS,
				description: 'Provide merge codes and values using the UI',
			},
			{
				name: 'JSON Object',
				value: MERGE_CODES_INPUT_JSON,
				description: 'Provide merge codes and values as a JSON object',
			},
		],
		default: MERGE_CODES_INPUT_FIELDS,
		description: 'Form: fill in merge codes and values. JSON: provide them as an object.',
		displayOptions: { show: displayOptionsShow },
	};
}

export const mergeCodesTagFieldOptions = [
	{
		name: 'tag',
		displayName: 'Merge Code',
		values: [
			{
				displayName: 'Name',
				name: 'name',
				type: 'string' as const,
				default: '',
				required: true,
				placeholder: 'e.g. {{firstname}}',
				description: 'The full merge code including braces, e.g. {{firstname}}',
			},
			{
				displayName: 'Value',
				name: 'value',
				type: 'string' as const,
				default: '',
			},
		],
	},
];
