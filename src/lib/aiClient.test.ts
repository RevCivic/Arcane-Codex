import assert from 'node:assert/strict'
import test from 'node:test'

import {
  extractGatewayContent,
  formatGatewayResponseForLog,
  resolveGatewayEndpoint,
  resolveGatewayHeaders,
  resolveGatewayModel,
  resolveGatewayUrl,
} from './aiClient'

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

test('resolveGatewayUrl prefers a complete URL when configured', () => {
  assert.equal(resolveGatewayUrl({ AI_GATEWAY_URL: ' https://gateway.example/v1 ' }), 'https://gateway.example/v1')
})

test('resolveGatewayUrl builds an HTTP URL from a host and port', () => {
  assert.equal(
    resolveGatewayUrl({ AI_GATEWAY_HOST: '192.168.1.20', AI_GATEWAY_PORT: '4000' }),
    'http://192.168.1.20:4000',
  )
  assert.equal(
    resolveGatewayUrl({ AI_GATEWAY_HOST: 'gateway.internal', AI_GATEWAY_PORT: '443', AI_GATEWAY_PROTOCOL: 'https' }),
    'https://gateway.internal:443',
  )
  assert.equal(resolveGatewayUrl({ AI_GATEWAY_HOST: '2001:db8::1', AI_GATEWAY_PORT: '4000' }), 'http://[2001:db8::1]:4000')
})

test('resolveGatewayUrl validates split gateway configuration', () => {
  assert.throws(() => resolveGatewayUrl({}), /AI_GATEWAY_URL or AI_GATEWAY_HOST is not configured/)
  assert.throws(() => resolveGatewayUrl({ AI_GATEWAY_HOST: 'gateway', AI_GATEWAY_PORT: '70000' }), /AI_GATEWAY_PORT/)
  assert.throws(() => resolveGatewayUrl({ AI_GATEWAY_HOST: 'gateway', AI_GATEWAY_PROTOCOL: 'ftp' }), /AI_GATEWAY_PROTOCOL/)
})

test('resolveGatewayHeaders reads and trims the gateway key at request time', () => {
  assert.deepEqual(resolveGatewayHeaders({ AI_GATEWAY_API_KEY: ' secret-key ' }), {
    'content-type': 'application/json',
    authorization: 'Bearer secret-key',
  })
  assert.deepEqual(resolveGatewayHeaders({ AI_GATEWAY_API_KEY: '   ' }), {
    'content-type': 'application/json',
  })
})

test('resolveGatewayModel uses the balanced gateway class by default', () => {
  assert.equal(resolveGatewayModel({}), 'balanced')
  assert.equal(resolveGatewayModel({ AI_GATEWAY_MODEL: ' heavy ' }), 'heavy')
  assert.equal(resolveGatewayModel({ AI_GATEWAY_MODEL: '   ' }), 'balanced')
})

test('extractGatewayContent supports OpenAI-compatible response variants', () => {
  assert.equal(extractGatewayContent({ choices: [{ message: { content: 'Hello' } }] }), 'Hello')
  assert.equal(extractGatewayContent({ choices: [{ text: 'Legacy completion' }] }), 'Legacy completion')
  assert.equal(extractGatewayContent({ output_text: 'Gateway output' }), 'Gateway output')
  assert.equal(extractGatewayContent({ response: 'OK' }), 'OK')
  assert.equal(extractGatewayContent('OK'), 'OK')
})

test('extractGatewayContent joins structured text content parts', () => {
  assert.equal(extractGatewayContent({
    choices: [{ message: { content: [
      { type: 'text', text: 'First' },
      { type: 'text', text: { value: 'Second' } },
    ] } }],
  }), 'First\nSecond')
})

test('formatGatewayResponseForLog preserves short responses and identifies truncation', () => {
  assert.equal(formatGatewayResponseForLog('{"unexpected":true}', 100), '{"unexpected":true}')
  assert.equal(
    formatGatewayResponseForLog('abcdefghij', 4),
    'abcd… [truncated 6 characters]',
  )
})
