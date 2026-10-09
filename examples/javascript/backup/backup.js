// Theirs: a cloud storage library you installed. Its API is not yours to change
class CloudSDK {
  putObject(request) {
    throw new Error(`The cloud is not reachable from tests (${request.Key})`);
  }
}

// Ours: the one place that knows CloudSDK's API. Tests mock this, not CloudSDK
class FileStore {
  constructor(sdk, bucket) {
    this.sdk = sdk;
    this.bucket = bucket;
  }

  // A change to try: CloudSDK renames putObject to upload. Only this method
  // and the bad test have to change
  save(name, text) {
    const reply = this.sdk.putObject({ Bucket: this.bucket, Key: "notes/" + name, Body: text });
    return reply.ResponseMetadata.HTTPStatusCode === 200;
  }
}

// Saves every note that has text, and says how many it saved
function backup(notes, store) {
  const kept = notes.filter(([, text]) => text.trim());
  let saved = 0;
  for (const [name, text] of kept) {
    if (!store.save(name, text)) {
      throw new Error("Could not save " + name);
    }
    saved += 1;
  }
  return saved;
}

module.exports = { CloudSDK, FileStore, backup };
