function uploadFileToR2(objectPath, blob, contentType, config) {
  logInfo_("Uploading file to R2", {
    path: objectPath,
    contentType: contentType,
    bytes: blob.getBytes().length
  });

  const url = buildR2ApiUrl_(objectPath, config);
  const bodyBytes = blob.getBytes();
  const headers = buildR2SignedHeaders_("PUT", objectPath, contentType, bodyBytes, config);

  const response = UrlFetchApp.fetch(url, {
    method: "put",
    payload: bodyBytes,
    headers: headers,
    muteHttpExceptions: true,
    contentType: contentType
  });

  if (response.getResponseCode() >= 300) {
    throw new Error("R2 upload failed: " + response.getResponseCode() + " " + response.getContentText());
  }

  logInfo_("R2 upload complete", {
    path: objectPath,
    status: response.getResponseCode()
  });

  return config.r2PublicBaseUrl + "/" + objectPath;
}

function fetchJsonFromR2(objectPath, config) {
  const url = config.r2PublicBaseUrl + "/" + objectPath;
  const response = UrlFetchApp.fetch(url, {
    method: "get",
    muteHttpExceptions: true
  });

  if (response.getResponseCode() === 404) {
    logWarn_("Previous gallery JSON not found on R2", {
      path: objectPath
    });
    return null;
  }

  if (response.getResponseCode() >= 300) {
    throw new Error("R2 json fetch failed: " + response.getResponseCode() + " " + response.getContentText());
  }

  return JSON.parse(response.getContentText());
}

function objectExistsInR2(objectPath, config) {
  const url = buildR2ApiUrl_(objectPath, config);
  const headers = buildR2SignedHeaders_("GET", objectPath, "", [], config);
  const response = UrlFetchApp.fetch(url, {
    method: "get",
    muteHttpExceptions: true,
    headers: Object.assign({}, headers, {
      Range: "bytes=0-0"
    })
  });

  if (response.getResponseCode() === 404) {
    return false;
  }

  if (response.getResponseCode() >= 300 && response.getResponseCode() !== 206) {
    throw new Error("R2 object check failed: " + response.getResponseCode() + " " + response.getContentText());
  }

  return true;
}

function uploadJsonToR2(objectPath, payload, config) {
  const text = JSON.stringify(payload, null, 2) + "\n";
  const blob = Utilities.newBlob(text, "application/json");
  return uploadFileToR2(objectPath, blob, "application/json", config);
}

function deleteFileFromR2(objectPath, config) {
  logInfo_("Deleting file from R2", {
    path: objectPath
  });

  const url = buildR2ApiUrl_(objectPath, config);
  const headers = buildR2SignedHeaders_("DELETE", objectPath, "", [], config);

  const response = UrlFetchApp.fetch(url, {
    method: "delete",
    headers: headers,
    muteHttpExceptions: true
  });

  if (response.getResponseCode() >= 300 && response.getResponseCode() !== 404) {
    throw new Error("R2 delete failed: " + response.getResponseCode() + " " + response.getContentText());
  }

  logInfo_("R2 delete complete", {
    path: objectPath,
    status: response.getResponseCode()
  });
}

function buildR2ApiUrl_(objectPath, config) {
  return "https://" + config.r2AccountId + ".r2.cloudflarestorage.com/" + config.r2BucketName + "/" + objectPath;
}

function buildR2SignedHeaders_(method, objectPath, contentType, bodyBytes, config) {
  const now = new Date();
  const amzDate = formatAmzDate_(now);
  const dateStamp = amzDate.slice(0, 8);
  const host = config.r2AccountId + ".r2.cloudflarestorage.com";
  const canonicalUri = "/" + config.r2BucketName + "/" + objectPath;
  const payloadHash = sha256Hex_(bodyBytes || []);

  const canonicalHeaders =
    "host:" + host + "\n" +
    "x-amz-content-sha256:" + payloadHash + "\n" +
    "x-amz-date:" + amzDate + "\n";
  const signedHeaders = "host;x-amz-content-sha256;x-amz-date";
  const canonicalRequest = [
    method,
    canonicalUri,
    "",
    canonicalHeaders,
    signedHeaders,
    payloadHash
  ].join("\n");

  const credentialScope = dateStamp + "/auto/s3/aws4_request";
  const stringToSign = [
    "AWS4-HMAC-SHA256",
    amzDate,
    credentialScope,
    sha256Hex_(canonicalRequest)
  ].join("\n");

  const signingKey = getSignatureKey_(config.r2SecretAccessKey, dateStamp, "auto", "s3");
  const signature = hexFromBytes_(hmacSha256Bytes_(stringToSign, signingKey));
  const authorization =
    "AWS4-HMAC-SHA256 " +
    "Credential=" + config.r2AccessKeyId + "/" + credentialScope + ", " +
    "SignedHeaders=" + signedHeaders + ", " +
    "Signature=" + signature;

  const headers = {
    Authorization: authorization,
    "X-Amz-Date": amzDate,
    "X-Amz-Content-Sha256": payloadHash
  };

  if (contentType) {
    headers["Content-Type"] = contentType;
  }

  return headers;
}

function getSignatureKey_(key, dateStamp, regionName, serviceName) {
  const kDate = hmacSha256Bytes_(dateStamp, "AWS4" + key);
  const kRegion = hmacSha256Bytes_(regionName, kDate);
  const kService = hmacSha256Bytes_(serviceName, kRegion);
  return hmacSha256Bytes_("aws4_request", kService);
}

function sha256Hex_(value) {
  const bytes = Array.isArray(value) ? value : Utilities.newBlob(value).getBytes();
  return hexFromBytes_(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, bytes));
}

function hexFromBytes_(bytes) {
  return bytes.map(function(byte) {
    const normalized = byte < 0 ? byte + 256 : byte;
    return ("0" + normalized.toString(16)).slice(-2);
  }).join("");
}

function formatAmzDate_(date) {
  return Utilities.formatDate(date, "UTC", "yyyyMMdd'T'HHmmss'Z'");
}

function hmacSha256Bytes_(value, key) {
  const valueBytes = Array.isArray(value) ? value : Utilities.newBlob(String(value)).getBytes();
  const keyBytes = Array.isArray(key) ? key : Utilities.newBlob(String(key)).getBytes();
  return Utilities.computeHmacSha256Signature(valueBytes, keyBytes);
}
