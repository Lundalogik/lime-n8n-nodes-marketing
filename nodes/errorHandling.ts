import { NodeApiError, NodeOperationError, JsonObject, INode } from 'n8n-workflow';

/**
 * Wrapper for the error data used in Lime workflows
 */
export type WorkflowErrorContext = {
	message: string;
} & JsonObject;

/**
 * Structure for unsuccessful response used in communication layer.
 */
export type ErrorResponse = {
	success: false;
	data: { error: WorkflowErrorContext };
};

/**
 * Return the given error as an n8n node error so it renders with full context
 * in the n8n UI: {@link NodeApiError} and {@link NodeOperationError} pass
 * through unchanged, anything else is wrapped in a {@link NodeOperationError}.
 * @param node - the node the error belongs to
 * @param error - the caught error
 */
export function toNodeError(node: INode, error: unknown): NodeApiError | NodeOperationError {
	if (error instanceof NodeApiError || error instanceof NodeOperationError) {
		return error;
	}
	return new NodeOperationError(node, error instanceof Error ? error : String(error));
}
