import psycopg2
import boto3
from botocore.config import Config

DB_URL = "postgresql://neondb_owner:npg_0G8csDpdReyC@ep-raspy-cell-a1e1shtq-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require"

B2_KEY_ID = "00634e50813f00b0000000001"
B2_APP_KEY = "K006TQAXscCLXflCRyGdTMIxDl4LrPM"
B2_ENDPOINT = "https://s3.ca-east-006.backblazeb2.com"
B2_BUCKET = "eduvault-storage-a8f3"

def main():
    print("Connecting to Neon PostgreSQL...")
    conn = psycopg2.connect(DB_URL)
    conn.autocommit = True
    cur = conn.cursor()

    # Find duplicates keeping the earliest inserted note for each unique material
    # Partition criteria:
    # 1. moodle_id if present
    # 2. source_url if present
    # 3. subject_id + lower(title) + lower(original_filename)
    cur.execute("""
        WITH ranked AS (
            SELECT id, b2_object_key, subject_id,
                   ROW_NUMBER() OVER (
                       PARTITION BY
                           CASE
                               WHEN moodle_id IS NOT NULL AND moodle_id != '' THEN 'moodle_' || moodle_id
                               WHEN source_url IS NOT NULL AND source_url != '' THEN 'url_' || source_url
                               ELSE 'sub_' || subject_id || '_' || lower(coalesce(title, '')) || '_' || lower(coalesce(original_filename, ''))
                           END
                       ORDER BY created_at ASC, id ASC
                   ) as rnum
            FROM notes
        )
        SELECT id, b2_object_key, subject_id FROM ranked WHERE rnum > 1;
    """)
    duplicates = cur.fetchall()
    total_dups = len(duplicates)
    print(f"Found {total_dups} duplicate note records.")

    if total_dups == 0:
        print("No duplicates found!")
        return

    dup_ids = [d[0] for d in duplicates]
    b2_keys_to_delete = [d[1] for d in duplicates if d[1]]

    # Initialize B2 client
    config = Config(
        signature_version='s3v4',
        retries={'max_attempts': 3, 'mode': 'standard'}
    )
    s3 = boto3.client(
        's3',
        endpoint_url=B2_ENDPOINT,
        aws_access_key_id=B2_KEY_ID,
        aws_secret_access_key=B2_APP_KEY,
        config=config
    )

    # Delete from B2 in chunks of 1000
    print(f"Deleting {len(b2_keys_to_delete)} duplicate objects from Backblaze B2...")
    deleted_b2_count = 0
    chunk_size = 500
    for i in range(0, len(b2_keys_to_delete), chunk_size):
        chunk = b2_keys_to_delete[i:i + chunk_size]
        objects = [{'Key': k} for k in chunk]
        try:
            resp = s3.delete_objects(
                Bucket=B2_BUCKET,
                Delete={'Objects': objects, 'Quiet': True}
            )
            deleted_b2_count += len(chunk)
        except Exception as e:
            print(f"B2 delete batch error: {e}")

    # Delete duplicate rows from DB
    print(f"Deleting {len(dup_ids)} duplicate rows from Postgres notes table...")
    cur.execute("DELETE FROM notes WHERE id = ANY(%s);", (dup_ids,))
    print(f"Deleted {cur.rowcount} rows from notes table.")

    # Recalculate note_count for all subjects
    print("Recalculating subject note counts...")
    cur.execute("""
        UPDATE subjects s
        SET note_count = (
            SELECT count(*)
            FROM notes n
            WHERE n.subject_id = s.id
        );
    """)

    # Query remaining unique notes
    cur.execute("SELECT count(*) FROM notes;")
    final_count = cur.fetchone()[0]

    cur.execute("SELECT count(DISTINCT subject_id) FROM notes;")
    sub_count = cur.fetchone()[0]

    print("\n================ DEDUPLICATION SUMMARY ================")
    print(f"Deleted Duplicate Notes : {total_dups}")
    print(f"Purged B2 Objects       : {deleted_b2_count}")
    print(f"Remaining Unique Notes  : {final_count}")
    print(f"Active Subjects         : {sub_count}")
    print("=======================================================")

if __name__ == "__main__":
    main()

