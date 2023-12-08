/// <reference types="./mod.d.ts" />
const crypto = require("crypto").webcrypto;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// mod.ts
var mod_exports = {};
__export(mod_exports, {
  encodeString: () => encodeString,
  getSignedUrl: () => getSignedUrl,
  hmacSha256Hex: () => hmacSha256Hex,
  sha256: () => sha256
});
module.exports = __toCommonJS(mod_exports);
var NEWLINE = "\n";
function encodeString(data) {
  return new TextEncoder().encode(data);
}
function hex(data) {
  return Array.from(new Uint8Array(data)).map((x) => x.toString(16).padStart(2, "0")).join("");
}
async function sha256(data) {
  const digest = await crypto.subtle.digest("SHA-256", encodeString(data));
  return hex(digest);
}
async function hmacSha256(keyData, data) {
  const algorithm = {
    name: "HMAC",
    hash: "SHA-256"
  };
  const key = await crypto.subtle.importKey(
    "raw",
    keyData,
    algorithm,
    false,
    ["sign"]
  );
  return crypto.subtle.sign(
    algorithm,
    key,
    encodeString(data)
  );
}
async function hmacSha256Hex(key, data) {
  const signature = await hmacSha256(key, data);
  return hex(signature);
}
function ymd(date) {
  return date.toISOString().substring(0, 10).replace(/[^\d]/g, "");
}
function isoDate(date) {
  return `${date.toISOString().substring(0, 19).replace(/[^\dT]/g, "")}Z`;
}
function parseOptions(provided) {
  const path = `/${provided.path}`.replace(/\/\//g, "/");
  return {
    ...{
      method: "GET",
      region: "us-east-1",
      expiresIn: 86400,
      date: /* @__PURE__ */ new Date(),
      sessionToken: "",
      endpoint: "s3.amazonaws.com",
      query: {},
      protocol: "https"
    },
    ...provided,
    path
  };
}
function getQueryParameters(options) {
  return new URLSearchParams({
    "X-Amz-Algorithm": "AWS4-HMAC-SHA256",
    "X-Amz-Credential": `${options.accessKeyId}/${ymd(options.date)}/${options.region}/s3/aws4_request`,
    "X-Amz-Date": isoDate(options.date),
    "X-Amz-Expires": options.expiresIn.toString(),
    "X-Amz-SignedHeaders": "host",
    ...options.sessionToken ? { "X-Amz-Security-Token": options.sessionToken } : {},
    ...options.query
  });
}
function getCanonicalRequest(options, queryParameters) {
  queryParameters.sort();
  return [
    options.method,
    NEWLINE,
    options.path,
    NEWLINE,
    queryParameters.toString(),
    NEWLINE,
    `host:${options.endpoint}`,
    NEWLINE,
    NEWLINE,
    "host",
    NEWLINE,
    "UNSIGNED-PAYLOAD"
  ].join("");
}
async function getSignaturePayload(options, payload) {
  return [
    "AWS4-HMAC-SHA256",
    NEWLINE,
    isoDate(options.date),
    NEWLINE,
    `${ymd(options.date)}/${options.region}/s3/aws4_request`,
    NEWLINE,
    await sha256(payload)
  ].join("");
}
async function getSignatureKey(options) {
  let key = encodeString(`AWS4${options.secretAccessKey}`);
  const components = [
    ymd(options.date),
    options.region,
    "s3",
    "aws4_request"
  ];
  for (const component of components) {
    key = await hmacSha256(key, component);
  }
  return key;
}
function getUrl(options, queryParameters, signature) {
  queryParameters.set("X-Amz-Signature", signature);
  return `${options.protocol}://${options.endpoint}${options.path}?${new URLSearchParams(queryParameters).toString()}`;
}
async function getSignedUrl(options) {
  const parsedOptions = parseOptions(options);
  const queryParameters = getQueryParameters(parsedOptions);
  const canonicalRequest = getCanonicalRequest(parsedOptions, queryParameters);
  const signaturePayload = await getSignaturePayload(parsedOptions, canonicalRequest);
  const signatureKey = await getSignatureKey(parsedOptions);
  const signature = await hmacSha256Hex(signatureKey, signaturePayload);
  const url = getUrl(parsedOptions, queryParameters, signature);
  return url;
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  encodeString,
  getSignedUrl,
  hmacSha256Hex,
  sha256
});
