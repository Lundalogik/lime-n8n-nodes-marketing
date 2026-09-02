# @limetech/n8n-nodes-lime-marketing

This is an n8n community node. It lets you use Lime Marketing in your n8n workflows.

[Lime Marketing](https://www.lime-technologies.com/en/products/lime-marketing/) is a marketing automation platform from Lime Technologies. This node lets you send transactional email and SMS through your Lime Marketing instance.

[n8n](https://n8n.io/) is a [fair-code licensed](https://docs.n8n.io/sustainable-use-license/) workflow automation platform.

[Installation](#installation)
[Operations](#operations)
[Credentials](#credentials)
[Compatibility](#compatibility)
[Resources](#resources)

## Installation

Follow the [installation guide](https://docs.n8n.io/integrations/community-nodes/installation/) in the n8n community nodes documentation.

## Operations

<!-- TODO: complete when the node implementation is added -->

- **Transactional email**: send a transactional email based on a Lime Marketing template.
- **Transactional SMS**: send a transactional SMS based on a Lime Marketing template.

## Credentials

To use this node you need a Lime Marketing account and an API key.

1. In Lime Marketing, generate an API key for the REST API.
2. In n8n, create a **Lime Marketing API** credential with:
   - **API URL**: the URL of your Lime Marketing instance API, for example `https://app.bwz.se/bedrock/CUSTOMERNAME/api/`
   - **API Key**: the API key obtained from Lime Marketing

The credential is verified against the `/ping/version` endpoint of your instance when you save it.

## Compatibility

<!-- TODO: state minimum and tested n8n versions before submitting for verification -->

## Resources

- [n8n community nodes documentation](https://docs.n8n.io/integrations/#community-nodes)
- [Lime Marketing](https://www.lime-technologies.com/en/products/lime-marketing/)

## License

[MIT](LICENSE)
