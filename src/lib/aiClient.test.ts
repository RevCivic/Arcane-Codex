import assert from 'node:assert/strict'
import test from 'node:test'

import { resolveGatewayEndpoint } from './aiClient'

test('resolveGatewayEndpoint accepts an origin, v1 base, or complete endpoint', () => {
  assert.equal(resolveGatewayEndpoint('http://ai-gateway:4000'), 'http://ai-gateway:4000/v1/chat/completions')
  assert.equal(resolveGatewayEndpoint('http://ai-gateway:4000/v1/'), 'http://ai-gateway:4000/v1/chat/completions')
  assert.equal(
    resolveGatewayEndpoint('https://gateway.example/v1/chat/completions'),
    'https://gateway.example/v1/chat/completions',
  )
})

test('resolveGatewayEndpoint rejects an empty gateway URL', () => {
  assert.throws(() => resolveGatewayEndpoint('  '), /AI_GATEWAY_URL is not configured/)
})
