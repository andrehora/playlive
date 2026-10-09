# Theirs: a cloud storage library. Its API is not yours to change
class CloudSDK:
    def put_object(self, request):
        raise ConnectionError("The cloud is not reachable from tests")


# Ours: the only code that knows CloudSDK. Tests mock this
class FileStore:
    def __init__(self, sdk, bucket):
        self.sdk = sdk
        self.bucket = bucket

    # A change to try: CloudSDK renames put_object. Only this and the bad test change
    def save(self, name, text):
        reply = self.sdk.put_object({"Bucket": self.bucket, "Key": "notes/" + name, "Body": text})
        return reply["ResponseMetadata"]["HTTPStatusCode"] == 200


# Saves every note that has text, and says how many it saved
def backup(notes, store):
    kept = [(name, text) for name, text in notes if text.strip()]
    saved = 0
    for name, text in kept:
        if not store.save(name, text):
            raise OSError("Could not save " + name)
        saved += 1
    return saved
