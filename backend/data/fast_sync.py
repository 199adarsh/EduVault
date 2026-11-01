import os
import re
import sys
import uuid
import json
import mimetypes
from datetime import datetime, date
from concurrent.futures import ThreadPoolExecutor, as_completed
import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry
from bs4 import BeautifulSoup
import boto3
from botocore.config import Config
import psycopg2
from psycopg2.extras import Json

# Credentials & URLs
MOODLE_BASE_URL = "http://150.129.156.169"
MOODLE_USER = os.getenv("MOODLE_USER", "24UAD022")
MOODLE_PASS = os.getenv("MOODLE_PASS", "Dkte@123")

DB_URL = "postgresql://neondb_owner:npg_0G8csDpdReyC@ep-raspy-cell-a1e1shtq-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require"

B2_KEY_ID = "00634e50813f00b0000000001"
B2_APP_KEY = "K006TQAXscCLXflCRyGdTMIxDl4LrPM"
B2_ENDPOINT = "https://s3.ca-east-006.backblazeb2.com"
B2_BUCKET = "eduvault-storage-a8f3"

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
}

# Normalizer helpers
def clean_course_name(raw):
    if not raw:
        return "Untitled Course"
    s = re.sub(r'(?i)\([0-9A-Z]+\)|[0-9]{2}[A-Z]{2,6}[0-9]{3,4}[A-Z]?|[0-9]{2}-[0-9]{2}', '', raw)
    s = re.sub(r'[-_:]', ' ', s)
    s = re.sub(r'\s+', ' ', s).strip()
    return s if s else raw.strip()

def extract_course_code(fullname, shortname):
    combined = f"{fullname or ''} {shortname or ''}"
    m = re.search(r'\b(0[1-9][A-Z]{2,4}\d{3}[A-Z]?)\b', combined, re.IGNORECASE)
    if m:
        return m.group(1).upper()
    m2 = re.search(r'\(([0-9A-Za-z_-]{4,15})\)', combined)
    if m2:
        return m2.group(1).upper()
    return ""

def infer_department(code, fullname):
    combined = f"{code or ''} {fullname or ''}".upper()
    if any(x in combined for x in ["UAD", "AIDS", "AI&DS", "AI & DS", "01AD"]):
        return "B.Tech-UAD"
    if any(x in combined for x in ["UAM", "01AM"]):
        return "B.Tech-UAM"
    if any(x in combined for x in ["UCS", "01CS", "COMPUTER", "CSE"]):
        return "CSE"
    if any(x in combined for x in ["UTC", "TEXTILE", "03DT", "03TC"]):
        return "B.Tech Textile-UTC"
    if any(x in combined for x in ["UET", "01ET", "ELECTRONIC"]):
        return "ECE"
    if any(x in combined for x in ["UME", "01ME", "MECHANICAL"]):
        return "MECH"
    if any(x in combined for x in ["UCE", "01CE", "CIVIL"]):
        return "CIVIL"
    return "B.Tech-UAD"

def infer_semester(code, fullname):
    combined = f"{code or ''} {fullname or ''}".upper()
    m = re.search(r'(?:sem|semester|s)[\s\-_]*0?([1-8])', combined, re.IGNORECASE)
    if m:
        return f"SEM {int(m.group(1)):02d}"
    if any(x in combined for x in ["FY", "FIRST YEAR", "1ST YEAR"]):
        return "SEM 01"
    if any(x in combined for x in ["SY", "SECOND YEAR", "2ND YEAR"]):
        return "SEM 03"
    if any(x in combined for x in ["TY", "THIRD YEAR", "3RD YEAR"]):
        return "SEM 05"
    if any(x in combined for x in ["FINAL YEAR", "4TH YEAR"]):
        return "SEM 07"
    if code:
        m_dig = re.search(r'[A-Z]+([1-8])\d{2}', code.upper())
        if m_dig:
            digit = int(m_dig.group(1))
            if digit == 1: return "SEM 01"
            if digit == 2: return "SEM 04"
            if digit == 3: return "SEM 05"
            if digit == 4: return "SEM 07"
            if 5 <= digit <= 8: return f"SEM {digit:02d}"
    return "SEM 05"

def determine_category(section_title):
    lower = section_title.lower()
    if "syllabus" in lower: return "Syllabus"
    if "lecture plan" in lower: return "Lecture Plan"
    if any(x in lower for x in ["question paper", "see", "se-1", "se-2"]): return "Question Papers"
    if "lab" in lower or "experiment" in lower: return "Lab Manual"
    if any(x in lower for x in ["test", "evaluation", "quiz"]): return "Tests & Quizzes"
    if "resource" in lower: return "Additional Resources"
    return "Notes"

def determine_unit(section_title):
    lower = section_title.lower()
    for i in range(1, 7):
        if f"unit {i}" in lower or f"unit-{i}" in lower or f"unit 0{i}" in lower or f"unit no {i}" in lower or f"unit no. {i}" in lower or f"unit no.{i}" in lower:
            return f"UNIT 0{i}"
    if "syllabus" in lower or "lecture plan" in lower:
        return "General"
    if "lab" in lower or "experiment" in lower:
        return "Lab"
    if any(x in lower for x in ["question paper", "see", "se-1", "se-2", "pyq"]):
        return "PYQ"
    return "UNIT 01"

def clean_activity_title(raw):
    if not raw: return "Material"
    s = raw.strip()
    for suffix in ["File", "Virtual programming lab", "URL", "Forum", "Folder"]:
        if s.endswith(suffix):
            s = s[:-len(suffix)].strip()
    return s if s else "Material"

def create_moodle_session():
    session = requests.Session()
    retries = Retry(total=3, backoff_factor=0.5, status_forcelist=[500, 502, 503, 504])
    session.mount("http://", HTTPAdapter(max_retries=retries, pool_connections=30, pool_maxsize=30))
    session.mount("https://", HTTPAdapter(max_retries=retries, pool_connections=30, pool_maxsize=30))
    session.headers.update(HEADERS)

    login_page_url = f"{MOODLE_BASE_URL}/login/index.php"
    r = session.get(login_page_url, timeout=15)
    soup = BeautifulSoup(r.text, "html.parser")
    logintoken_el = soup.select_one("input[name=logintoken]")
    logintoken = logintoken_el["value"] if logintoken_el else ""

    login_data = {
        "username": MOODLE_USER,
        "password": MOODLE_PASS,
        "logintoken": logintoken
    }
    r_post = session.post(login_page_url, data=login_data, timeout=15)

    courses_url = f"{MOODLE_BASE_URL}/my/courses.php"
    r_courses = session.get(courses_url, timeout=15)
    m = re.search(r'sesskey["\']?\s*:\s*["\']([a-zA-Z0-9]+)["\']|sesskey=([a-zA-Z0-9]+)', r_courses.text)
    sesskey = m.group(1) or m.group(2) if m else ""
    if not sesskey:
        raise Exception("Could not find Moodle sesskey after login!")
    return session, sesskey

def init_b2():
    config = Config(
        signature_version='s3v4',
        retries={'max_attempts': 5, 'mode': 'standard'},
        max_pool_connections=25
    )
    s3 = boto3.client(
        's3',
        endpoint_url=B2_ENDPOINT,
        aws_access_key_id=B2_KEY_ID,
        aws_secret_access_key=B2_APP_KEY,
        config=config
    )
    return s3

def main():
    print(f"[{datetime.now().strftime('%H:%M:%S')}] Connecting to Database & Moodle...")
    db_conn = psycopg2.connect(DB_URL)
    db_conn.autocommit = True
    cur = db_conn.cursor()

    # Preload existing moodle IDs & source URLs
    cur.execute("SELECT moodle_id, source_url FROM notes WHERE moodle_id IS NOT NULL OR source_url IS NOT NULL;")
    existing_moodle_ids = set()
    existing_source_urls = set()
    for m_id, s_url in cur.fetchall():
        if m_id: existing_moodle_ids.add(str(m_id).strip())
        if s_url: existing_source_urls.add(str(s_url).strip())
    print(f"[{datetime.now().strftime('%H:%M:%S')}] Found {len(existing_moodle_ids)} already imported notes.")

    # Preload subjects
    cur.execute("SELECT id, name, code, department, semester FROM subjects;")
    existing_subjects = {}
    for s_id, s_name, s_code, s_dept, s_sem in cur.fetchall():
        clean_c = (s_code or "").strip().upper()
        if clean_c:
            existing_subjects[clean_c] = {"id": s_id, "name": s_name, "code": s_code, "dept": s_dept, "sem": s_sem}
        if s_name:
            existing_subjects[s_name.strip().lower()] = {"id": s_id, "name": s_name, "code": s_code, "dept": s_dept, "sem": s_sem}

    moodle_sess, sesskey = create_moodle_session()
    s3_client = init_b2()
    print(f"[{datetime.now().strftime('%H:%M:%S')}] Logged into Moodle (sesskey={sesskey}). Fetching courses...")

    # Fetch courses
    ajax_url = f"{MOODLE_BASE_URL}/lib/ajax/service.php?sesskey={sesskey}&info=core_course_get_enrolled_courses_by_timeline_classification"
    ajax_payload = [{"index": 0, "methodname": "core_course_get_enrolled_courses_by_timeline_classification", "args": {"offset": 0, "limit": 0, "classification": "all", "sort": "fullname"}}]
    r = moodle_sess.post(ajax_url, json=ajax_payload, timeout=20)
    data = r.json()
    courses_raw = data[0]["data"]["courses"]
    print(f"[{datetime.now().strftime('%H:%M:%S')}] Discovered {len(courses_raw)} total enrolled courses.")

    # Ensure all subjects exist in DB
    processed_courses = []
    for c in courses_raw:
        c_id = str(c["id"])
        c_name = c["fullname"]
        c_short = c["shortname"]
        code = extract_course_code(c_name, c_short)
        clean_name = clean_course_name(c_name)

        subject = None
        if code and code in existing_subjects:
            subject = existing_subjects[code]
        elif clean_name.lower() in existing_subjects:
            subject = existing_subjects[clean_name.lower()]

        if not subject:
            dept = infer_department(code, c_name)
            sem = infer_semester(code, c_name)
            sub_id = str(uuid.uuid4())
            cur.execute("""
                INSERT INTO subjects (id, name, code, department, semester, created_at, note_count)
                VALUES (%s, %s, %s, %s, %s, %s, 0)
                ON CONFLICT (id) DO NOTHING;
            """, (sub_id, clean_name, code, dept, sem, date.today().isoformat()))
            subject = {"id": sub_id, "name": clean_name, "code": code, "dept": dept, "sem": sem}
            if code: existing_subjects[code] = subject
            existing_subjects[clean_name.lower()] = subject

        processed_courses.append({
            "id": c_id,
            "fullname": c_name,
            "code": code,
            "subject": subject,
            "viewurl": f"{MOODLE_BASE_URL}/course/view.php?id={c_id}"
        })

    # Discover activities across all courses concurrently
    print(f"[{datetime.now().strftime('%H:%M:%S')}] Scraping course sections in parallel...")
    all_activities = []

    def scrape_course_sections(course_info):
        activities = []
        try:
            r = moodle_sess.get(course_info["viewurl"], timeout=20)
            soup = BeautifulSoup(r.text, "html.parser")
            sections = soup.select(".topics .section, .weeks .section, .course-content .section, .section")
            for sec in sections:
                title_el = sec.select_one("h3.sectionname, .section-title, .sectionname")
                sec_title = title_el.text.strip() if title_el else "General"
                cat = determine_category(sec_title)
                unit = determine_unit(sec_title)

                for act in sec.select("li.activity"):
                    a_tag = act.select_one("a[href]")
                    if not a_tag: continue
                    href = a_tag["href"]
                    if "/mod/resource/view.php" not in href and "/pluginfile.php" not in href:
                        continue

                    # Moodle ID
                    m_id_match = re.search(r'id=(\d+)', href)
                    m_id = m_id_match.group(1) if m_id_match else None

                    inst = act.select_one(".instancename")
                    raw_title = inst.text if inst else a_tag.text
                    title = clean_activity_title(raw_title)

                    target_url = f"{MOODLE_BASE_URL}{href}" if href.startswith("/") else href

                    # Skip duplicate
                    if m_id and m_id in existing_moodle_ids:
                        continue
                    if target_url in existing_source_urls:
                        continue

                    activities.append({
                        "href": target_url,
                        "moodle_id": m_id,
                        "title": title,
                        "category": cat,
                        "unit": unit,
                        "subject": course_info["subject"],
                        "course_code": course_info["code"]
                    })
        except Exception as e:
            print(f"Error scraping course {course_info['fullname']}: {e}")
        return activities

    with ThreadPoolExecutor(max_workers=10) as executor:
        futures = [executor.submit(scrape_course_sections, c) for c in processed_courses]
        for f in as_completed(futures):
            all_activities.extend(f.result())

    total_new = len(all_activities)
    print(f"[{datetime.now().strftime('%H:%M:%S')}] Discovered {total_new} new materials to download & upload to B2.")
    if total_new == 0:
        print("Everything is up to date!")
        return

    # Process and upload activities in parallel
    completed = 0
    imported = 0
    failed = 0
    batch_id = str(uuid.uuid4())
    last_reported_pct = 0

    def process_activity(item):
        nonlocal imported, failed
        try:
            # Dedicated session per thread to avoid contention
            thread_sess = requests.Session()
            thread_sess.cookies = moodle_sess.cookies
            thread_sess.headers.update(HEADERS)

            r_file = thread_sess.get(item["href"], timeout=45)
            if r_file.status_code != 200:
                failed += 1
                return False

            content_type = r_file.headers.get("Content-Type", "").lower()
            file_bytes = r_file.content
            target_url = item["href"]

            # Handle Moodle HTML redirect wrappers
            if "text/html" in content_type:
                soup = BeautifulSoup(r_file.text, "html.parser")
                wrapper = soup.select_one(".resourceworkaround a, .resourcecontent a, object[data], iframe[src], a[href*='pluginfile.php']")
                real_url = None
                if wrapper:
                    real_url = wrapper.get("href") or wrapper.get("data") or wrapper.get("src")
                if real_url:
                    if real_url.startswith("/"): real_url = f"{MOODLE_BASE_URL}{real_url}"
                    r_real = thread_sess.get(real_url, timeout=45)
                    if r_real.status_code == 200:
                        file_bytes = r_real.content
                        target_url = real_url
                        content_type = r_real.headers.get("Content-Type", "").lower()

            if not file_bytes:
                failed += 1
                return False

            # Filename detection
            cd = r_file.headers.get("Content-Disposition", "")
            fname_match = re.search(r'filename\*?=(?:UTF-8\'\')?["\']?([^"\';]+)["\']?', cd)
            if fname_match:
                orig_fname = fname_match.group(1).strip()
            else:
                orig_fname = target_url.split("/")[-1].split("?")[0]
            if not orig_fname or orig_fname == "view.php":
                ext = mimetypes.guess_extension(content_type) or ".pdf"
                orig_fname = f"{item['title']}{ext}"

            # Ensure valid extension
            _, ext = os.path.splitext(orig_fname)
            if not ext:
                ext = ".pdf"
                orig_fname += ext

            unique_file_id = f"{uuid.uuid4()}{ext}"

            # Compute B2 Key: [CourseCode] [SubjectName]/[Unit]/[unique_file_id]
            sub = item["subject"]
            clean_sub_name = re.sub(r'[\\/:*?"<>|]', '_', sub["name"]).strip()
            clean_unit = re.sub(r'[\\/:*?"<>|]', '_', item["unit"]).strip() if item["unit"] else "General"
            prefix = f"{sub['code'].strip().upper()} " if sub.get("code") else ""
            b2_folder = f"{(prefix + clean_sub_name).strip()}/{clean_unit}"
            b2_key = f"{b2_folder}/{unique_file_id}"

            # Upload directly to B2
            content_type_upload = content_type if "text/html" not in content_type else "application/pdf"
            s3_client.put_object(
                Bucket=B2_BUCKET,
                Key=b2_key,
                Body=file_bytes,
                ContentType=content_type_upload
            )

            # Insert note record into DB
            tags = ["LMS"]
            if item["course_code"]: tags.append(item["course_code"])
            if item["category"]: tags.append(item["category"])
            if item["unit"]: tags.append(item["unit"])

            note_id = str(uuid.uuid4())
            with psycopg2.connect(DB_URL) as local_conn:
                with local_conn.cursor() as local_cur:
                    local_cur.execute("""
                        INSERT INTO notes (
                            id, title, subject_id, department, semester, unit,
                            exam_type, file_url, b2_object_key, original_filename,
                            import_batch_id, uploaded_by, created_at, status,
                            category, moodle_id, source_url, tags
                        ) VALUES (
                            %s, %s, %s, %s, %s, %s,
                            %s, %s, %s, %s,
                            %s, %s, %s, %s,
                            %s, %s, %s, %s
                        ) ON CONFLICT (id) DO NOTHING;
                    """, (
                        note_id, item["title"], sub["id"], sub["dept"], sub["sem"], item["unit"],
                        "Regular", unique_file_id, b2_key, orig_fname,
                        batch_id, "LMS Importer (Fast)", date.today().isoformat(), "ACTIVE",
                        item["category"], item["moodle_id"], target_url, Json(tags)
                    ))
                    local_cur.execute("""
                        UPDATE subjects SET note_count = note_count + 1 WHERE id = %s;
                    """, (sub["id"],))

            imported += 1
            return True
        except Exception as e:
            failed += 1
            return False

    print(f"[{datetime.now().strftime('%H:%M:%S')}] Starting fast parallel upload with 8 workers...")

    with ThreadPoolExecutor(max_workers=8) as executor:
        futures = {executor.submit(process_activity, item): item for item in all_activities}
        for f in as_completed(futures):
            completed += 1
            pct = int((completed / total_new) * 100)
            if pct >= last_reported_pct + 5 or completed == total_new:
                last_reported_pct = (pct // 5) * 5
                print(f"[PROGRESS] {pct}% - Processed {completed}/{total_new} (Imported: {imported}, Failed: {failed})")

    print(f"[{datetime.now().strftime('%H:%M:%S')}] FAST SYNC COMPLETED! Total imported: {imported}, Failed: {failed}")

if __name__ == "__main__":
    main()
