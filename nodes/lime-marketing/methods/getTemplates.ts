import { ILoadOptionsFunctions, INodePropertyOptions, LoggerProxy as Logger } from 'n8n-workflow';
import { MailTemplate } from '../models';
import { limeMarketingRequest } from '../transport';

// loadOptions handler: fetch all mail templates and return them sorted by name
// for the Template dropdown on the email send operation.
export async function getTemplates(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
	let templates;
	try {
		templates = await limeMarketingRequest<MailTemplate[]>(this, {
			method: 'GET',
			url: 'mailtemplate',
			json: true,
			errorContext: 'load templates',
		});
	} catch (error) {
		Logger.error(`There was an error with fetching templates: ${error}`);
		return [];
	}

	return templates.data
		.map((t) => ({
			name: `${t.Name} (ID: ${t.Id})`,
			value: t.Id,
		}))
		.sort((a, b) => a.name.localeCompare(b.name));
}
