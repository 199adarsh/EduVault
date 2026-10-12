import json
import re
from yt_dlp import YoutubeDL

url = "https://www.youtube.com/playlist?list=PLu71SKxNbfoBuX3f4EOACle2y-tRC5Q37"

try:
    with YoutubeDL({"extract_flat": True}) as ydl:
        info = ydl.extract_info(url, download=False)
        entries = info.get('entries', [])
    
    # 51 videos, let's group them into 10 phases.
    phase_titles = [
        "Getting Started & Basics",
        "Data Types & Memory",
        "Strings, Numbers & Dates",
        "Arrays & Objects",
        "Functions & Scope",
        "Control Flow & Loops",
        "DOM Manipulation",
        "Events & Asynchronous JS",
        "Advanced JS (Classes, Fetch API)",
        "Lexical Scoping & Closures"
    ]
    
    phases = []
    chunk_size = len(entries) // 10
    
    for i in range(10):
        start = i * chunk_size
        end = start + chunk_size if i < 9 else len(entries)
        chunk = entries[start:end]
        
        resources_java = []
        for v in chunk:
            title = v['title'].replace('"', '\\"')
            vid = v['id']
            resources_java.append(f'new com.eduvault.model.PredefinedRoadmap.Resource("{title}", "https://www.youtube.com/watch?v={vid}")')
        
        resources_str = ",\n                            ".join(resources_java)
        
        phase_java = f"""
                    com.eduvault.model.PredefinedRoadmap.Phase.builder()
                        .title("{phase_titles[i]}")
                        .critical({str(i % 2 == 0).lower()})
                        .topics(List.of("Video Concepts", "Practice", "Review"))
                        .resources(List.of(
                            {resources_str}
                        ))
                        .build()"""
        phases.append(phase_java)
    
    phases_str = ",\n".join(phases)
    
    roadmap_java = f"""
        // Learn JavaScript
        roadmaps.add(com.eduvault.model.PredefinedRoadmap.builder()
                .id("learn-javascript")
                .title("Learn JavaScript")
                .subject("JavaScript")
                .totalHours("15+")
                .phases(List.of(
{phases_str}
                ))
                .build());
    """
    
    # Replace in file
    file_path = r'd:\PROJECTS\Java\EduVault\backend\src\main\java\com\eduvault\repository\LocalJsonDatabase.java'
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    pattern = r'(roadmaps\.clear\(\);\s*).*?(// Learn JavaScript.*?\.build\(\)\);)'
    
    def repl(m):
        return m.group(1) + roadmap_java.strip()
    
    new_content, count = re.subn(pattern, repl, content, flags=re.DOTALL)
    
    if count > 0:
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print("Success! Grouped videos into 10 phases.")
    else:
        # Fallback if comment is different
        pattern2 = r'(roadmaps\.clear\(\);\s*).*?(// Chai aur.*?\.build\(\)\);)'
        new_content2, count2 = re.subn(pattern2, repl, content, flags=re.DOTALL)
        if count2 > 0:
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(new_content2)
            print("Success! Grouped videos into 10 phases.")
        else:
            print("Could not match replacement pattern.")
        
except Exception as e:
    print(f"Error: {e}")
