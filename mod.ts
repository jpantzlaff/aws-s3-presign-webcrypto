const NEWLINE = '\n'

export interface GetSignedUrlOptions {
  path: string
  query?: Record<string, string | number>
  accessKeyId: string
  secretAccessKey: string
  sessionToken?: string
  method?: 'GET' | 'PUT'
  region?: string
  expiresIn?: number
  date?: Date
  endpoint?: string
  protocol?: 'http' | 'https'
}

export function encodeString(data: string): Uint8Array {
  return new TextEncoder().encode(data)
}

function hex(data: ArrayBuffer): string {
  return Array
    .from(new Uint8Array(data))
    .map((x) => x.toString(16).padStart(2, '0'))
    .join('')
}

export async function sha256(data: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', encodeString(data))
  return hex(digest)
}

async function hmacSha256(keyData: ArrayBuffer, data: string): Promise<ArrayBuffer> {
  const algorithm = {
    name: 'HMAC',
    hash: 'SHA-256'
  }
  const key = await crypto.subtle.importKey(
    'raw',
    keyData,
    algorithm,
    false,
    ['sign']
  )
  return crypto.subtle.sign(
    algorithm,
    key,
    encodeString(data)
  )
}

export async function hmacSha256Hex(key: ArrayBuffer, data: string): Promise<string> {
  const signature = await hmacSha256(key, data)
  return hex(signature)
}

function ymd(date: Date): string {
  return date.toISOString().substring(0, 10).replace(/[^\d]/g, '')
}

function isoDate(date: Date): string {
  return `${date.toISOString().substring(0, 19).replace(/[^\dT]/g, '')}Z`
}

function parseOptions(provided: GetSignedUrlOptions): Required<GetSignedUrlOptions> {
  const path = `/${provided.path}`.replace(/\/\//g, '/')
  return {
    ...{
      method: 'GET',
      region: 'us-east-1',
      expiresIn: 86400,
      date: new Date(),
      sessionToken: '',
      endpoint: 's3.amazonaws.com',
      query: {},
      protocol: 'https'
    },
    ...provided,
    path
  }
}

function getQueryParameters(options: Required<GetSignedUrlOptions>): URLSearchParams {
  return new URLSearchParams({
    'X-Amz-Algorithm': 'AWS4-HMAC-SHA256',
    'X-Amz-Credential': `${options.accessKeyId}/${ymd(options.date)}/${options.region}/s3/aws4_request`,
    'X-Amz-Date': isoDate(options.date),
    'X-Amz-Expires': options.expiresIn.toString(),
    'X-Amz-SignedHeaders': 'host',
    ...(options.sessionToken ? {'X-Amz-Security-Token': options.sessionToken} : {}),
    ...options.query
  })
}

function getCanonicalRequest(options: Required<GetSignedUrlOptions>, queryParameters: URLSearchParams): string {
  queryParameters.sort()
  return [
    options.method, NEWLINE,
    options.path, NEWLINE,
    queryParameters.toString(), NEWLINE,
    `host:${options.endpoint}`, NEWLINE,
    NEWLINE,
    'host', NEWLINE,
    'UNSIGNED-PAYLOAD'
  ].join('')
}

async function getSignaturePayload(options: Required<GetSignedUrlOptions>, payload: string): Promise<string> {
  return [
    'AWS4-HMAC-SHA256', NEWLINE,
    isoDate(options.date), NEWLINE,
    `${ymd(options.date)}/${options.region}/s3/aws4_request`, NEWLINE,
    await sha256(payload)
  ].join('')
}

async function getSignatureKey(options: Required<GetSignedUrlOptions>): Promise<ArrayBuffer> {
  let key: ArrayBuffer = encodeString(`AWS4${options.secretAccessKey}`)
  const components = [
    ymd(options.date),
    options.region,
    's3',
    'aws4_request'
  ]
  for (const component of components) {
    key = await hmacSha256(key, component)
  }
  return key
}

function getUrl(options: Required<GetSignedUrlOptions>, queryParameters: URLSearchParams, signature: string): string {
  queryParameters.set('X-Amz-Signature', signature)
  return `${options.protocol}://${options.endpoint}${options.path}?${new URLSearchParams(queryParameters).toString()}`
}

export async function getSignedUrl(options: GetSignedUrlOptions): Promise<string> {
  const parsedOptions = parseOptions(options)
  const queryParameters = getQueryParameters(parsedOptions)
  const canonicalRequest = getCanonicalRequest(parsedOptions, queryParameters)
  const signaturePayload = await getSignaturePayload(parsedOptions, canonicalRequest)
  const signatureKey = await getSignatureKey(parsedOptions)
  const signature = await hmacSha256Hex(signatureKey, signaturePayload)
  const url = getUrl(parsedOptions, queryParameters, signature)
  return url
}
