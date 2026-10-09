export interface PutRequest {
  Bucket: string;
  Key: string;
  Body: string;
}

export interface PutReply {
  ResponseMetadata: { HTTPStatusCode: number };
}

// Theirs: a cloud storage library you installed. Its API is not yours to change
export class CloudSDK {
  putObject(request: PutRequest): PutReply {
    throw new Error(`The cloud is not reachable from tests (${request.Key})`);
  }
}

// Ours: the one place that knows CloudSDK's API. Tests mock this, not CloudSDK
export class FileStore {
  constructor(private sdk: CloudSDK, private bucket: string) {}

  // A change to try: CloudSDK renames putObject to upload. Only this method
  // and the bad test have to change
  save(name: string, text: string): boolean {
    const reply = this.sdk.putObject({ Bucket: this.bucket, Key: "notes/" + name, Body: text });
    return reply.ResponseMetadata.HTTPStatusCode === 200;
  }
}

// Saves every note that has text, and says how many it saved
export function backup(notes: [string, string][], store: FileStore): number {
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
