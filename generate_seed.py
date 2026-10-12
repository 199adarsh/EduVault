import json
import re
from yt_dlp import YoutubeDL

# 1. Chai aur Code JS
js_url = "https://www.youtube.com/playlist?list=PLu71SKxNbfoBuX3f4EOACle2y-tRC5Q37"
js_entries = []
try:
    with YoutubeDL({"extract_flat": True, "quiet": True}) as ydl:
        info = ydl.extract_info(js_url, download=False)
        js_entries = info.get('entries', [])
except Exception as e:
    print(f"Failed to fetch JS playlist: {e}")

def create_roadmap(r_id, title, subject, total_hours, entries, num_phases, phase_titles):
    phases = []
    chunk_size = len(entries) // num_phases
    if chunk_size == 0:
        chunk_size = 1
    
    for i in range(num_phases):
        start = i * chunk_size
        end = start + chunk_size if i < num_phases - 1 else len(entries)
        chunk = entries[start:end]
        
        if not chunk: continue
        
        resources = []
        for v in chunk:
            v_title = v['title'].split(' | ')[0].split(' - ')[0] if 'title' in v else ""
            v_id = v['id'] if 'id' in v else v.get('url', '').split('v=')[-1]
            resources.append({
                "name": v_title,
                "url": f"https://www.youtube.com/watch?v={v_id}"
            })
            
        phases.append({
            "title": phase_titles[i] if i < len(phase_titles) else f"Phase {i+1}",
            "critical": (i % 2 == 0),
            "topics": ["Video Concepts", "Practice", "Review"],
            "resources": resources
        })
        
    return {
        "id": r_id,
        "title": title,
        "subject": subject,
        "totalHours": total_hours,
        "phases": phases
    }

roadmaps = []

# JS Roadmap
if js_entries:
    js_titles = ["Getting Started", "Data Types", "Strings & Numbers", "Arrays & Objects", "Functions", "Control Flow", "DOM", "Events", "Advanced JS", "Closures"]
    roadmaps.append(create_roadmap("learn-javascript", "Learn JavaScript", "JavaScript", "15+", js_entries, 10, js_titles))

# CPP Roadmap
with open(r'd:\PROJECTS\Java\EduVault\Test_Files\Cpp.json', 'r') as f:
    cpp_data = json.load(f)
    cpp_titles = ["Basics & Syntax", "Control Flow", "OOP", "Advanced & STL"]
    roadmaps.append(create_roadmap("learn-cpp", "Chai aur C++", "C++", "10+", cpp_data, 4, cpp_titles))

# Git Roadmap
with open(r'd:\PROJECTS\Java\EduVault\Test_Files\Git_Github.json', 'r') as f:
    git_data = json.load(f)
    git_titles = ["Fundamentals", "Advanced Collaboration"]
    roadmaps.append(create_roadmap("master-git", "Master Git & GitHub", "Git", "4+", git_data, 2, git_titles))

# JS In-depth Roadmap
with open(r'd:\PROJECTS\Java\EduVault\Test_Files\JavaScript_Indepth.json', 'r') as f:
    js_indepth = json.load(f)
    js_in_titles = ["Core Concepts", "Projects & Placements"]
    roadmaps.append(create_roadmap("js-indepth", "Complete JS Domination", "JavaScript", "12+", js_indepth, 2, js_in_titles))

# Save to resources
out_path = r'd:\PROJECTS\Java\EduVault\backend\src\main\resources\seed_roadmaps.json'
with open(out_path, 'w', encoding='utf-8') as f:
    json.dump(roadmaps, f, indent=4)
print(f"Generated seed_roadmaps.json with {len(roadmaps)} roadmaps!")
