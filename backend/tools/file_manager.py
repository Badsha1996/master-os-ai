import os
import shutil

def organize_desktop(file_type: str) -> str:
    desktop = os.path.join(os.path.join(os.environ['USERPROFILE']), 'Desktop')
    target_folder = os.path.join(desktop, f"Organized_{file_type}")
    
    if not os.path.exists(target_folder):
        os.makedirs(target_folder)
        
    count = 0
    for filename in os.listdir(desktop):
        if filename.lower().endswith(f".{file_type.lower()}"):
            shutil.move(os.path.join(desktop, filename), os.path.join(target_folder, filename))
            count += 1
            
    return f"📂 Moved {count} files to {target_folder}"