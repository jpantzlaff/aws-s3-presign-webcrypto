Generates presigned URLs to get, create, and otherwise manipulate objects in Amazon S3 (AWS Signature Version 4).
Tested per https://docs.aws.amazon.com/AmazonS3/latest/API/sigv4-query-string-auth.html.

This module works mostly like the [dansalias/aws_s3_presign](https://github.com/dansalias/aws_s3_presign)
repository it's based on. However, it avoids the use of Deno-specific libraries, favoring the
[Web Crypto API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API) instead.

## Usage
```ts
import { getSignedUrl } from './mod.ts'

const url = getSignedUrl({
  accessKeyId: 'my-aws-access-key-id',
  secretAccessKey: 'my-aws-secret-access-key',
  path: '/example-bucket/test.txt',
  region: 'us-east-1',
})
```

## Options
```ts
interface GetSignedUrlOptions {
  path: string              // required
  accessKeyId: string       // required
  secretAccessKey: string   // required
  sessionToken?: string     // AWS STS token
  method?: 'GET' | 'PUT'    // default 'GET'
  region?: string           // default 'us-east-1'
  expiresIn?: number        // seconds, default 86400 (24 hours)
  date?: Date               // forced creation date, for testing
  endpoint?: string         // custom endpoint, default s3.amazonaws.com
}
```

## Testing
```
deno test
```
