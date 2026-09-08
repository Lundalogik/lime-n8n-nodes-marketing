// Guards the credential test definition. n8n treats any 2xx response as a
// passing credential test unless a `rules` entry says otherwise, so a wrong
// URL that hits a catch-all 2xx page would falsely validate. These tests pin
// the body-validation rule that distinguishes the real /ping/version
// (VersionModel with a `Version` field) from anything else.

import { LimeMarketingApi } from '../../credentials/LimeMarketingApi.credentials';
import type { IAuthenticateRuleResponseSuccessBody } from 'n8n-workflow';

describe('LimeMarketingApi credential test', () => {
	const credential = new LimeMarketingApi();

	it('verifies against GET /ping/version with the apikey header', () => {
		const { request } = credential.test;
		expect(request.url).toBe('/ping/version');
		expect(request.method).toBe('GET');
		expect(request.headers).toMatchObject({
			apikey: '={{$credentials?.apiKey}}',
		});
	});

	it('strips a trailing slash from the configured base URL', () => {
		expect(credential.test.request.baseURL).toContain('replace(new RegExp("/+$")');
	});

	it('fails the test when the response body has no Version field', () => {
		const rules = credential.test.rules ?? [];
		const versionRule = rules.find(
			(rule): rule is IAuthenticateRuleResponseSuccessBody =>
				rule.type === 'responseSuccessBody' && rule.properties.key === 'Version',
		);

		expect(versionRule).toBeDefined();
		// n8n errors when get(body, key) === value; a missing Version is
		// undefined, so value must be undefined for the absence check to fire.
		expect(versionRule!.properties.value).toBeUndefined();
		expect(typeof versionRule!.properties.message).toBe('string');
		expect(versionRule!.properties.message.length).toBeGreaterThan(0);
	});
});
