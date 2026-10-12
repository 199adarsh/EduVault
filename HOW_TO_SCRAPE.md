# How to Scrape the DKTE LMS Portal

This guide explains how to scrape course materials from the DKTE Society's Textile and Engineering Institute Moodle portal.

**Portal URL:** `http://150.129.156.169/my/`
**Platform:** Moodle (version 4.x)

---

## 1. Authentication

### Session-Based Authentication
The portal uses PHP session cookies for authentication. Once logged in via browser, maintain the session by preserving cookies.

```python
import requests
from requests.cookies import RequestsCookieJar

BASE_URL = "http://150.129.156.169"
MY_URL = f"{BASE_URL}/my/"

# Create session with cookie jar
session = requests.Session()

# Navigate to login page to get initial cookies
response = session.get(MY_URL)

# After manual login (or credential injection), cookies are stored in session
# Extract cookies for use in subsequent requests
cookies = session.cookies
```

### Cookie Handling
Key cookie observed:
- `MoodleSession` - Main session cookie (rotates on each request)

**Important:** The portal redirects unauthenticated requests to `/login/index.php` with a `303 See Other` response. Always maintain cookie state across requests.

---

## 2. Course Discovery

### Getting Enrolled Courses
Navigate to the courses page to discover enrolled courses:

```
GET /my/courses.php
```

The page returns course cards with links to each course. Parse the HTML to extract course IDs:

```python
from bs4 import BeautifulSoup

def get_course_links(session):
    """Extract course IDs and names from the courses page."""
    response = session.get(f"{BASE_URL}/my/courses.php")
    soup = BeautifulSoup(response.text, 'html.parser')
    
    courses = []
    # Course links contain 'course/view.php?id=' parameter
    for link in soup.find_all('a', href=True):
        href = link.get('href', '')
        if 'course/view.php?id=' in href:
            course_id = href.split('id=')[1].split('&')[0]
            course_name = link.get_text(strip=True)
            courses.append({
                'id': course_id,
                'name': course_name,
                'url': f"{BASE_URL}{href}" if href.startswith('/') else href
            })
    
    return courses
```

### Target Courses (by code)
| Course Code | Course Name | Section ID |
|-------------|-------------|------------|
| 01ADL302 | Machine Learning | 1516 |
| 01ADL333 | Feature Engineering | 1517 |
| 01ADP303 | Advanced Web Technology | 1514 |
| 01ADL301 | Database Engineering | 1515 |
| 01ADL209 | Operating System | 1393 |

---

## 3. Page Structure Analysis

### Course Page Layout
Each course page (`/my/course/view.php?id=X`) contains:

1. **Left Sidebar Navigation** - Tree structure with collapsible categories
2. **Main Content Area** - Section outline with expandable/collapsible sections
3. **Top Navigation** - Course, Participants, Grades, Competencies, Course calendar

### DOM Structure (Key Selectors)

```css
/* Left sidebar navigation tree */
.block_tree .tree { /* Contains all course sections */ }
.block_tree .treeitem { /* Each category/item */ }
.block_tree .treeitem > a { /* Section link */ }

/* Main content sections */
.section { /* Each course section */ }
.section .head { /* Section heading */ }
.section .content { /* Section content */ }

/* Resource links */
.aalink { /* File/resource links */ }
.aalink .fileref { /* File icon */ }
```

---

## 4. Extracting Materials

### Category-Based Organization
Materials are organized into these categories:

1. **General** - Announcements, course info
2. **Syllabus** - Syllabus files, reference books
3. **Lecture Plan** - Lecture schedules
4. **Unit 1-6** - Topic-specific materials
5. **Continuous Evaluation Tests** - Quiz materials
6. **Additional Resources** - Video links, website resources
7. **Experiment List** - Lab experiment listings
8. **Lab Manual** - Individual experiment files
9. **Previous SEE/SE Question Papers** - Past exam papers

### Scraping Script

```python
import re
from urllib.parse import urljoin

def scrape_course_materials(session, course_url):
    """Scrape all materials from a course page."""
    response = session.get(course_url)
    soup = BeautifulSoup(response.text, 'html.parser')
    
    materials = {
        'course_name': '',
        'categories': {}
    }
    
    # Get course name from heading
    course_heading = soup.find('h1', class_=lambda x: x and 'course' in x.lower())
    if course_heading:
        materials['course_name'] = course_heading.get_text(strip=True)
    
    # Parse left sidebar tree for categories
    sidebar = soup.find('nav', {'aria-label': 'Course navigation'}) or \
              soup.find('div', class_='block_tree')
    
    if sidebar:
        # Extract all links with their hierarchy
        tree_items = sidebar.find_all('li', class_='treeitem')
        current_category = 'General'
        
        for item in tree_items:
            link = item.find('a')
            if link and link.get('href'):
                href = link.get('href')
                text = link.get_text(strip=True)
                
                # Determine category from tree structure
                if 'Collapse' in text:
                    current_category = text.replace('Collapse', '').strip()
                elif text and text not in ['Collapse', 'Expand']:
                    # This is a material item
                    full_url = urljoin(course_url, href) if href.startswith('/') else href
                    
                    # Determine material type
                    material_type = 'unknown'
                    if '/mod/file.php' in href:
                        material_type = 'file'
                    elif '/mod/assign/' in href:
                        material_type = 'assignment'
                    elif '/mod/forum/' in href:
                        material_type = 'forum'
                    elif '/mod/resource/' in href:
                        material_type = 'resource'
                    
                    # Extract file info
                    file_info = {}
                    if 'file.php' in href:
                        # Parse file name from URL or text
                        match = re.search(r'download\.php\?file=(.+)\'', href)
                        if match:
                            file_info['filename'] = match.group(1)
                        
                        # Check for file icon
                        icon = item.find('img', class_=lambda x: x and 'icon' in x.lower())
                        if icon:
                            file_info['icon'] = icon.get('src', '')
                            if 'fileicon' in icon.get('class', []):
                                file_info['type'] = 'document'
                            elif 'foldericon' in icon.get('class', []):
                                file_info['type'] = 'folder'
                    
                    # Check for dates (availability/due dates)
                    dates = item.find_all(string=re.compile(r'(Available|Due date):'))
                    for date_text in dates:
                        parent = date_text.parent
                        if parent:
                            date_label = date_text.strip().rstrip(':')
                            date_value = parent.get_text(strip=True).replace(date_label, '').strip()
                            file_info[date_label] = date_value
                    
                    if current_category not in materials['categories']:
                        materials['categories'][current_category] = []
                    
                    materials['categories'][current_category].append({
                        'name': text,
                        'url': full_url,
                        'type': material_type,
                        'info': file_info
                    })
    
    return materials
```

---

## 5. Resource Extraction

### File Downloads
Files are accessed via Moodle's file API:

```
/mod/file.php/draft/.../filename.pdf
```

Download files using the session:

```python
def download_file(session, file_url, save_path):
    """Download a file from the portal."""
    response = session.get(file_url, stream=True)
    if response.status_code == 200:
        with open(save_path, 'wb') as f:
            for chunk in response.iter_content(chunk_size=8192):
                f.write(chunk)
        return True
    return False
```

### Virtual Programming Labs (Assignments)
Some experiments link to "Virtual programming lab" which are Moodle Assignments:

```python
# Assignment links look like:
# /mod/assign/view.php?id=123
# Parse for due dates and availability dates from the page
```

---

## 6. Data Organization

### Recommended Structure
Organize scraped data hierarchically:

```
course/
├── subject/
│   ├── category/
│   │   ├── unit_topic/
│   │   │   ├── resource_name.ext
│   │   │   └── resource_metadata.json
```

### Metadata Schema
Each resource should include:

```json
{
  "title": "Chapter 1 Slides",
  "subject": "Machine Learning",
  "category": "Unit 1",
  "unit_topic": "Chapter 1",
  "resource_type": "File (PDF)",
  "source_url": "http://150.129.156.169/mod/file.php/...",
  "file_url": "http://150.129.156.169/mod/file.php/...",
  "availability_date": "2026-08-20",
  "due_date": "2026-10-11",
  "file_size": "2.5 MB",
  "moodle_id": "12345"
}
```

---

## 7. Handling Dynamic Content

### JavaScript-Rendered Elements
Some content may be loaded dynamically. Use these strategies:

1. **Check for AJAX calls** - Look for XHR/fetch requests in Network tab
2. **Wait for page load** - Use explicit waits for dynamic elements
3. **Use browser automation** - For complex interactions, use Playwright/Selenium

### Example with Playwright
```python
from playwright.sync_api import sync_playwright

async def scrape_with_browser():
    async with sync_playwright() as p:
        browser = await p.chromium.launch()
        context = await browser.new_context()
        page = await context.new_page()
        
        # Navigate and wait for dynamic content
        await page.goto(f"{BASE_URL}/my/")
        await page.wait_for_load_state('networkidle')
        
        # Extract course links
        course_links = await page.query_selector_all('a[href*="course/view"]')
        for link in course_links:
            href = await link.get_attribute('href')
            text = await link.inner_text()
            print(f"{text}: {href}")
        
        await browser.close()
```

---

## 8. Rate Limiting and Ethics

### Best Practices
- Add delays between requests (1-2 seconds minimum)
- Respect `robots.txt` (if available)
- Do not scrape during peak hours
- Store only publicly available course materials
- Attribute source appropriately

```python
import time
import random

def respectful_delay(min_seconds=1, max_seconds=3):
    """Add random delay between requests."""
    time.sleep(random.uniform(min_seconds, max_seconds))
```

---

## 9. Complete Example

```python
import requests
from bs4 import BeautifulSoup
from urllib.parse import urljoin
import time
import random
import json
import os

class DKTEScraper:
    def __init__(self, base_url="http://150.129.156.169"):
        self.base_url = base_url
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        })
    
    def _delay(self):
        time.sleep(random.uniform(1, 2))
    
    def get_courses(self):
        """Get all enrolled courses."""
        self._delay()
        response = self.session.get(f"{self.base_url}/my/courses.php")
        soup = BeautifulSoup(response.text, 'html.parser')
        
        courses = []
        for link in soup.find_all('a', href=True):
            href = link.get('href', '')
            if 'course/view.php?id=' in href:
                course_id = href.split('id=')[1].split('&')[0]
                course_name = link.get_text(strip=True)
                courses.append({
                    'id': course_id,
                    'name': course_name,
                    'url': urljoin(self.base_url, href)
                })
        
        return courses
    
    def scrape_course(self, course_url):
        """Scrape all materials from a course."""
        self._delay()
        response = self.session.get(course_url)
        soup = BeautifulSoup(response.text, 'html.parser')
        
        # Parse structure (see section 4 for detailed parser)
        # Return organized materials
        
    def save_to_json(self, data, filename):
        """Save scraped data to JSON file."""
        os.makedirs('output', exist_ok=True)
        with open(f"output/{filename}.json", 'w') as f:
            json.dump(data, f, indent=2)

# Usage
scraper = DKTEScraper()
courses = scraper.get_courses()
for course in courses:
    if course['name'] in ['Machine Learning (01ADL302)', 'Feature Engineering (01ADL333)', 
                           'Advanced Web Technology (01ADP303)', 
                           'Database engineering 26-27 (01ADL301)', 
                           'Operating System (01ADL209)']:
        materials = scraper.scrape_course(course['url'])
        scraper.save_to_json(materials, f"ml_{course['id']}")
```

---

## 10. Troubleshooting

### Common Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| 303 Redirect to login | Session expired | Re-authenticate and refresh cookies |
| 404 Not Found | Invalid course ID | Verify course ID from courses.php |
| Empty response | Rate limiting | Add delays between requests |
| Missing dynamic content | JS-rendered | Use browser automation |

### Debugging Tips
1. Check console for JavaScript errors: `browser_console()`
2. Inspect network requests to identify API endpoints
3. Save page HTML for offline analysis
4. Verify cookie state with `session.cookies`

---

## Appendix: Moodle API Endpoints

For advanced scraping, these Moodle endpoints may be useful:

| Endpoint | Purpose |
|----------|---------|
| `/my/course/view.php?id=X` | Course page |
| `/mod/file.php/draft/...` | File downloads |
| `/mod/assign/view.php?id=X` | Assignment details |
| `/mod/forum/view.php?id=X` | Forum discussions |
| `/course/view.php?id=X` | Course without /my prefix |

---

*Generated from inspection of DKTE LMS portal on 2026-10-11*