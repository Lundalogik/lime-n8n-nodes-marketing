# @limetech/n8n-nodes-lime-marketing

This is an n8n community node. It lets you use Lime Marketing in your n8n workflows.

[Lime Marketing](https://www.lime-technologies.com/en/products/lime-marketing/) is a marketing automation platform from Lime Technologies. This node lets you send transactional email and SMS through your Lime Marketing instance.

[n8n](https://n8n.io/) is a [fair-code licensed](https://docs.n8n.io/sustainable-use-license/) workflow automation platform.

[Installation](#installation)
[Operations](#operations)
[Credentials](#credentials)
[Compatibility](#compatibility)
[Resources](#resources)
[Development](#development)

## Installation

Follow the [installation guide](https://docs.n8n.io/integrations/community-nodes/installation/) in the n8n community nodes documentation and install `@limetech/n8n-nodes-lime-marketing`.

## Operations

### Lime CRM Marketing

- **Email → Send**: send a transactional email, either from a Lime Marketing template (with merge-code mapping) or with custom HTML/text content, including attachments, scheduling, tracking and header options.
- **SMS → Send**: send a transactional SMS from a Lime Marketing template with merge-code support.

Failed sends can be routed to the node's error output by setting **On Error** to "Continue (using error output)" in the node settings.

## Credentials

To use this node you need a Lime Marketing account and an API key.

1. In Lime Marketing, generate an API key for the REST API.
2. In n8n, create a **Lime CRM Marketing API** credential with:

| Field                      | Description                                                                                      |
| -------------------------- | ------------------------------------------------------------------------------------------------ |
| Lime CRM Marketing API URL | The API URL of your Lime Marketing instance, e.g. `https://app.bwz.se/bedrock/CUSTOMERNAME/api/` |
| API Key                    | The API key obtained from Lime Marketing                                                         |

Requests are authenticated with the `apikey` header, which n8n adds automatically. The credential is verified against the `/ping/version` endpoint of your instance when you save it.

## Compatibility

Requires n8n with `n8n-workflow` 2.9 or later. Node.js 24 is used for local development.

## Resources

- [Lime CRM node reference](https://platform.docs.lime-crm.com/en/latest/workflows-and-integrations/node-reference/)
- [n8n community nodes documentation](https://docs.n8n.io/integrations/#community-nodes)
- [Lime Marketing](https://www.lime-technologies.com/en/products/lime-marketing/)

## Development

```bash
npm ci
npm run build   # compile to dist/
npm test        # jest unit tests
npm run lint    # n8n community node lint rules
npm run knip    # dead code check
```

## License

[MIT](LICENSE)
